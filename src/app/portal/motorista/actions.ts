"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type ServiceExpense } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertActiveDriverPortalUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import {
  confirmDirectCollectionNotReceived,
  confirmDirectCollectionReceived,
} from "@/lib/finance/direct-collection";
import { submitChangeRequest } from "@/lib/change-requests/submit";
import { alertPendingExpense } from "@/lib/alerts/detectors";
import { generateServiceFinanceEntries } from "@/lib/finance/settlement";

const expenseSchema = z.object({
  dedupe_key: z.string().uuid(),
  service_id: z.string().uuid("Serviço inválido.").optional().or(z.literal("")),
  vehicle_id: z.string().uuid("Veículo inválido.").optional().or(z.literal("")),
  category_id: z.string().uuid("Selecione a categoria."),
  amount: z
    .string()
    .min(1, "Informe o valor.")
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0 && Number(v) <= 1_000_000, "Valor inválido."),
  receipt_url: z
    .string()
    .url("Informe um link válido para o comprovante.")
    .refine((value) => ["http:", "https:"].includes(new URL(value).protocol), "Use um link http ou https.")
    .optional(),
  odometer_km: z.string().optional(),
  quantity: z.string().optional(),
  unit_price: z.string().optional(),
  fuel_type: z.string().max(30).optional(),
  invoice_number: z.string().max(80).optional(),
  notes: z.string().max(500).optional(),
});

export type ExpenseFormState = { error: string | null };

export async function submitServiceExpense(
  _prevState: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const user = await assertActiveDriverPortalUser();

  const parsed = expenseSchema.safeParse({
    dedupe_key: formData.get("dedupe_key"),
    service_id: formData.get("service_id"),
    vehicle_id: formData.get("vehicle_id"),
    category_id: formData.get("category_id"),
    amount: formData.get("amount"),
    receipt_url: formData.get("receipt_url") || undefined,
    odometer_km: formData.get("odometer_km") || undefined,
    quantity: formData.get("quantity") || undefined,
    unit_price: formData.get("unit_price") || undefined,
    fuel_type: formData.get("fuel_type") || undefined,
    invoice_number: formData.get("invoice_number") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const [service, category, vehicle] = await Promise.all([
    parsed.data.service_id
      ? prisma.service.findUnique({
          where: { id: parsed.data.service_id },
          select: { id: true, driver_id: true, vehicle_id: true, execution_status: true, type: true },
        })
      : Promise.resolve(null),
    prisma.catalogItem.findFirst({
      where: { id: parsed.data.category_id, type: "categoria_despesa", active: true },
      select: { id: true, key: true, label: true },
    }),
    parsed.data.vehicle_id
      ? prisma.vehicle.findFirst({
          where: { id: parsed.data.vehicle_id, owner_type: "proprio", status: { not: "inativo" } },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);
  if (parsed.data.vehicle_id && !vehicle) return { error: "O veículo selecionado não está disponível." };
  if (service && service.driver_id !== user.linked_driver_id) {
    return { error: "Você não tem permissão para registrar despesa neste serviço." };
  }
  if (service && !["em_andamento", "concluido"].includes(service.execution_status)) {
    return { error: "A despesa só pode ser vinculada a um serviço iniciado ou concluído." };
  }
  if (service?.vehicle_id && vehicle && service.vehicle_id !== vehicle.id) {
    return { error: "O veículo selecionado não corresponde ao veículo da reserva." };
  }
  if (!category) return { error: "Categoria de despesa inválida ou inativa." };
  const isFuel = category.key === "abastecimento" || category.key === "combustivel" || /abastec|combustível|combustivel/i.test(category.label);
  const vehicleCategory = isFuel || /lavag|manuten|balsa|ped[aá]gio|pneu|óleo|oleo/i.test(`${category.key} ${category.label}`);
  const odometer = parsed.data.odometer_km ? Number(parsed.data.odometer_km) : null;
  const quantity = parsed.data.quantity ? Number(parsed.data.quantity.replace(",", ".")) : null;
  const unitPrice = parsed.data.unit_price ? Number(parsed.data.unit_price.replace(",", ".")) : null;
  const expenseVehicleId = service?.vehicle_id ?? vehicle?.id ?? null;
  if (vehicleCategory && !expenseVehicleId) return { error: "Selecione o veículo para esta categoria de despesa." };
  if (isFuel && (!odometer || !Number.isInteger(odometer) || odometer < 0)) return { error: "Informe o KM atual do veículo no abastecimento." };
  if (isFuel && (!quantity || quantity <= 0 || quantity > 500)) return { error: "Informe a quantidade de litros abastecida." };
  if (isFuel && !parsed.data.receipt_url) return { error: "Anexe o comprovante ou a nota fiscal do abastecimento." };
  if ([odometer, quantity, unitPrice].some((value) => value !== null && !Number.isFinite(value))) return { error: "Confira os dados numéricos da despesa." };

  const previousFuel = isFuel && odometer
    ? await prisma.serviceExpense.findFirst({
        where: { vehicle_id: expenseVehicleId, category: { key: { in: ["abastecimento", "combustivel"] } }, odometer_km: { not: null, lt: odometer } },
        orderBy: { odometer_km: "desc" }, select: { odometer_km: true },
      })
    : null;
  const calculatedKmPerLiter = previousFuel?.odometer_km && quantity
    ? (odometer! - previousFuel.odometer_km) / quantity
    : null;

  let created = false;
  let expense: ServiceExpense;
  try {
    expense = await prisma.serviceExpense.create({
      data: {
        dedupe_key: parsed.data.dedupe_key,
        service_id: service?.id ?? null,
        driver_id: user.linked_driver_id,
        category_id: category.id,
        amount: parsed.data.amount,
        receipt_url: parsed.data.receipt_url || null,
        vehicle_id: expenseVehicleId,
        odometer_km: odometer,
        quantity,
        unit_price: unitPrice,
        calculated_km_per_liter: calculatedKmPerLiter,
        fuel_type: parsed.data.fuel_type || null,
        invoice_number: parsed.data.invoice_number || null,
        notes: parsed.data.notes || null,
      },
    });
    created = true;
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }
    const existingExpense = await prisma.serviceExpense.findUnique({ where: { dedupe_key: parsed.data.dedupe_key } });
    if (!existingExpense || existingExpense.driver_id !== user.linked_driver_id) {
      return { error: "Não foi possível validar esta tentativa. Atualize a página e tente novamente." };
    }
    expense = existingExpense;
  }

  if (created) {
    if (service) {
      await generateServiceFinanceEntries(service.id);
    }
    await Promise.allSettled([
      ...(service ? [alertPendingExpense({
        expenseId: expense.id,
        serviceId: service.id,
        driverName: user.linked_driver?.name ?? "Motorista",
        serviceType: service.type,
      })] : []),
      logAudit({
        actorId: user.id,
        action: service ? "despesa_registrada_pelo_motorista" : "despesa_avulsa_registrada_pelo_motorista",
        entityType: service ? "service" : expenseVehicleId ? "vehicle" : "driver",
        entityId: service?.id ?? expenseVehicleId ?? user.linked_driver_id,
      }),
    ]);
  }

  revalidatePath("/portal/motorista/despesas");
  revalidatePath("/admin/despesas");
  return { error: null };
}

const repasseSchema = z.object({
  dedupe_key: z.string().min(1),
  entry_ids: z.array(z.string().uuid()).min(1, "Selecione ao menos um lançamento."),
  nota: z.string().optional(),
});

export type ChangeRequestFormState = { error: string | null };

export async function submitRepasseRequestMotorista(
  _prevState: ChangeRequestFormState,
  formData: FormData,
): Promise<ChangeRequestFormState> {
  const user = await assertActiveDriverPortalUser();

  const parsed = repasseSchema.safeParse({
    dedupe_key: formData.get("dedupe_key"),
    entry_ids: formData.getAll("entry_ids"),
    nota: formData.get("nota") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const entryIds = [...new Set(parsed.data.entry_ids)];
  const eligibleCount = await prisma.financeEntry.count({
    where: {
      id: { in: entryIds },
      party_type: "motorista",
      party_id: user.linked_driver_id,
      type: "despesa",
      status: "pendente",
      payment_eligible: true,
      reversed_at: null,
    },
  });
  if (eligibleCount !== entryIds.length) {
    return { error: "Um ou mais lançamentos não pertencem à sua conta ou não estão elegíveis." };
  }

  const changeRequest = await submitChangeRequest({
    type: "repasse_nativos",
    requesterType: "driver",
    requesterId: user.linked_driver_id,
    allocationDetails: { entry_ids: entryIds, nota: parsed.data.nota ?? null },
    dedupeKey: parsed.data.dedupe_key,
  });

  await logAudit({
    actorId: user.id,
    action: "solicitacao_repasse_criada",
    entityType: "change_request",
    entityId: changeRequest.id,
  });

  revalidatePath("/portal/motorista/financeiro");
  revalidatePath("/portal/motorista/solicitacoes");
  return { error: null };
}

export type DirectCollectionState = { error: string | null };

async function assertOwnDriverService(serviceId: string) {
  const user = await assertActiveDriverPortalUser();

  const service = await prisma.service.findUniqueOrThrow({
    where: { id: serviceId },
    select: { driver_id: true, execution_status: true, collection_actor: true },
  });
  if (service.driver_id !== user.linked_driver_id) {
    throw new Error("Você não tem permissão para confirmar o recebimento deste serviço.");
  }
  if (service.execution_status !== "concluido" || service.collection_actor !== "motorista_proprio") {
    throw new Error("O recebimento só pode ser confirmado após concluir um serviço de cobrança direta.");
  }

  return { user, service };
}

export async function confirmReceivedPortal(serviceId: string, receiptUrl: string): Promise<DirectCollectionState> {
  try {
    const { user } = await assertOwnDriverService(serviceId);

    const proof = z.string().url("Anexe um comprovante válido.").parse(receiptUrl);
    await confirmDirectCollectionReceived(serviceId, proof);

    await logAudit({
      actorId: user.id,
      action: "recebimento_direto_confirmado_pelo_motorista",
      entityType: "service",
      entityId: serviceId,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha ao confirmar recebimento." };
  }

  revalidatePath("/portal/motorista");
  return { error: null };
}

export async function confirmNotReceivedPortal(
  serviceId: string,
  reasonId: string,
): Promise<DirectCollectionState> {
  if (!reasonId) {
    return { error: "Selecione o motivo." };
  }

  try {
    const { user } = await assertOwnDriverService(serviceId);

    await confirmDirectCollectionNotReceived(serviceId, reasonId);

    await logAudit({
      actorId: user.id,
      action: "recebimento_direto_nao_confirmado_pelo_motorista",
      entityType: "service",
      entityId: serviceId,
      metadata: { reasonId },
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha ao registrar." };
  }

  revalidatePath("/portal/motorista");
  return { error: null };
}
