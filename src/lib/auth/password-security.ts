import { createHash } from "node:crypto";

// Only the first five hash characters leave the server. Never log passwords
// or complete hashes. This protects the application's password-change flow.
export async function assertPasswordNotLeaked(password: string, request: typeof fetch = fetch) {
  const hash = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  let response: Response;
  try {
    response = await request(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`, {
      headers: { "Add-Padding": "true", "User-Agent": "Nativos-ERP/1.0" },
      cache: "no-store", signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("Unavailable");
    const body = await response.text();
    const lines = body.trim().split(/\r?\n/);
    if (!lines.length || lines.some((line) => !/^[A-F0-9]{35}:\d+$/i.test(line))) throw new Error("Invalid response");
    if (lines.some((line) => { const [suffix, count] = line.split(":"); return suffix.toUpperCase() === hash.slice(5) && Number(count) > 0; })) throw new Error("PASSWORD_LEAKED");
  } catch (error) {
    if (error instanceof Error && error.message === "PASSWORD_LEAKED") throw new Error("Esta senha aparece em vazamentos conhecidos. Escolha outra senha exclusiva.");
    throw new Error("Não foi possível verificar a segurança da senha agora. Tente novamente em alguns minutos.");
  }
}
