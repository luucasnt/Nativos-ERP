export function pdfResponse(buffer: Buffer, filename: string) {
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "-");
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}

export function errorResponse(error: unknown) {
  // Nunca devolve mensagens do Prisma/PDFKit: elas podem conter nomes de
  // tabelas, caminhos internos ou dados enviados por outro usuário.
  const rawMessage = error instanceof Error ? error.message : "";
  const isSafeMessage = /^(Sessão expirada|Você não tem permissão|Acesso restrito)/i.test(rawMessage);
  return new Response(isSafeMessage ? rawMessage : "Não foi possível gerar o documento.", {
    status: isSafeMessage ? 403 : 400,
    headers: { "Cache-Control": "no-store" },
  });
}
