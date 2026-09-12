import { describe, expect, it } from "vitest";
import { renderTemplate } from "@/lib/communication/render-template";

describe("renderTemplate", () => {
  it("substitui variáveis conhecidas", () => {
    expect(renderTemplate("Olá {{nome}}, sua reserva {{codigo}} está confirmada.", {
      nome: "Ana",
      codigo: "RES-2026-000001",
    })).toBe("Olá Ana, sua reserva RES-2026-000001 está confirmada.");
  });

  it("deixa um placeholder sem valor correspondente como está, nunca em branco", () => {
    expect(renderTemplate("Olá {{nome}}, protocolo {{protocolo}}.", { nome: "Ana" })).toBe(
      "Olá Ana, protocolo {{protocolo}}.",
    );
  });

  it("texto sem placeholder passa direto", () => {
    expect(renderTemplate("Sem variáveis aqui.", {})).toBe("Sem variáveis aqui.");
  });
});
