type Bucket = { count: number; resetAt: number };

const globalStore = globalThis as typeof globalThis & {
  __nativosRateLimit?: Map<string, Bucket>;
};

const store = globalStore.__nativosRateLimit ?? new Map<string, Bucket>();
globalStore.__nativosRateLimit = store;

// Limite local de baixo custo para absorver rajadas por instância. Não é
// substituto do WAF/Firewall distribuído da Vercel, mas evita que uma única
// função seja facilmente exaurida por retries ou robôs básicos.
export function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    pruneStore(now);
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }

  current.count += 1;
  const allowed = current.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - current.count),
    retryAfter: Math.ceil((current.resetAt - now) / 1000),
  };
}

function pruneStore(now: number) {
  if (store.size < 5000) return;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
    if (store.size < 4000) break;
  }
}
