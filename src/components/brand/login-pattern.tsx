// Padrão geométrico decorativo do painel lateral do login — círculos
// concêntricos deslocados, remetendo à marca (o ponto do "i" do wordmark)
// sem precisar de uma imagem/ilustração real. Puramente decorativo
// (aria-hidden), em tons de dourado sobre o verde-floresta.
export function LoginPattern() {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 400 600"
      fill="none"
    >
      <defs>
        <pattern id="login-dots" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.6" fill="var(--color-gold)" fillOpacity="0.35" />
        </pattern>
      </defs>
      <rect width="400" height="600" fill="url(#login-dots)" />
      <circle cx="320" cy="120" r="170" stroke="var(--color-gold)" strokeOpacity="0.25" strokeWidth="1.5" />
      <circle cx="320" cy="120" r="110" stroke="var(--color-gold)" strokeOpacity="0.35" strokeWidth="1.5" />
      <circle cx="60" cy="480" r="130" stroke="var(--color-gold-light)" strokeOpacity="0.2" strokeWidth="1.5" />
      <circle cx="320" cy="120" r="7" fill="var(--color-gold)" />
    </svg>
  );
}
