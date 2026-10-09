import { describe, expect, it } from "vitest";
import { serviceDocumentContext } from "@/lib/documents/service-context";

describe("contexto operacional dos documentos", () => {
  it("chegada orienta encontro no desembarque após as bagagens", () => {
    const context = serviceDocumentContext("transfer_chegada");
    expect(context.meeting).toContain("desembarque");
    expect(context.flightLabel).toBe("Voo de chegada");
  });
  it("saída distingue o horário do transfer e não manda aguardar no desembarque", () => {
    const context = serviceDocumentContext("transfer_saida");
    expect(context.flightLabel).toBe("Voo de saída");
    expect(context.meeting).toContain("não o horário do voo");
    expect(context.driverInstruction).not.toContain("desembarque");
  });
  it("passeios usam ponto de encontro combinado sem orientação de aeroporto", () => {
    const context = serviceDocumentContext("passeio");
    expect(context.instruction).not.toContain("aeroporto");
    expect(context.meeting).toContain("combinado");
  });
});
