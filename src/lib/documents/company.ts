import { prisma } from "@/lib/prisma";

export type DocumentCompany = {
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  footer?: string;
};

export async function loadDocumentCompany(): Promise<DocumentCompany> {
  const setting = await prisma.setting.findUnique({ where: { key: "empresa_dados" } });
  const value = setting?.value;
  const fields: Record<string, string> = {};
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, entry] of Object.entries(value)) {
      if (typeof entry === "string" && entry.trim()) fields[key] = entry.trim();
    }
  }
  return { ...fields, name: fields.name || "Nativos Experiences" };
}
