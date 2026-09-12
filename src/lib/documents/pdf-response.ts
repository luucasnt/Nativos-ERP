export function pdfResponse(buffer: Buffer, filename: string) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}

export function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Falha ao gerar o documento.";
  return new Response(message, { status: 400 });
}
