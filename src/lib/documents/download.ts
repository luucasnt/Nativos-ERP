export function documentFilename(type: string, passenger: string, code: string, detail?: string) {
  const parts = ["Nativos", type, passenger, code, detail].filter(Boolean);
  return parts.map(part => part!.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100)).filter(Boolean).join("-") + ".pdf";
}

// Safari pode usar o último segmento da URL ao compartilhar um PDF.
// O caminho, os headers e os metadados precisam identificar o documento.
export function documentDownloadRedirect(request: Request, filename: string) {
  const url = new URL(request.url);
  if (decodeURIComponent(url.pathname.split("/").at(-1) ?? "") === filename) return null;
  const segments = url.pathname.split("/");
  if (segments.at(-1)?.endsWith(".pdf")) segments.pop();
  url.pathname = segments.join("/") + "/" + filename;
  url.search = "";
  return new Response(null, { status: 307, headers: { Location: url.toString(), "Cache-Control": "private, no-store" } });
}
