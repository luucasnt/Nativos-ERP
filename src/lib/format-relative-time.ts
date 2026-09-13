// "há Xmin" / "há Xh" — usado em listas curtas (alertas, atividade
// recente) onde um timestamp completo seria ruído.
export function formatRelativeTime(date: Date, now: Date = new Date()) {
  const diffMin = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60_000));

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin}min`;

  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `há ${diffHours}h`;

  const diffDays = Math.round(diffHours / 24);
  return `há ${diffDays}d`;
}
