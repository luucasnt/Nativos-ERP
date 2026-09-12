// Substitui placeholders {{variavel}} pelo valor informado. Puro — sem
// acesso a banco — para ser testável direto. Um placeholder sem valor
// correspondente é deixado como está (nunca vira uma string vazia
// silenciosa) — mais fácil de notar um e-mail com variável faltando do
// que um campo em branco sem explicação.
export function renderTemplate(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : match,
  );
}
