/**
 * Formata um valor numérico com unidade monetária no padrão brasileiro.
 * Exemplos:
 *   formatCurrency(11000, "R$") → "R$ 11.000,00"
 *   formatCurrency(1500.5, "USD") → "USD 1.500,50"
 *   formatCurrency(11000) → "R$ 11.000,00"  (padrão R$)
 */
export function formatCurrency(value: number | string | null | undefined, unit?: string): string {
  if (value === null || value === undefined || value === "") return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";

  const formatted = num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const prefix = unit ? unit.trim() : "R$";
  return `${prefix} ${formatted}`;
}

/**
 * Formata um número simples no padrão brasileiro (sem moeda).
 * Exemplos:
 *   formatNumber(11000) → "11.000"
 *   formatNumber(1500.5) → "1.500,5"
 */
export function formatNumber(value: number | string | null | undefined, decimals?: number): string {
  if (value === null || value === undefined || value === "") return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";

  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals ?? 0,
    maximumFractionDigits: decimals ?? 2,
  });
}

/**
 * Detecta se uma unidade é monetária (R$, USD, EUR, etc.)
 */
export function isCurrencyUnit(unit?: string | null): boolean {
  if (!unit) return false;
  const monetary = ["r$", "usd", "eur", "brl", "$", "€", "£", "¥"];
  return monetary.includes(unit.toLowerCase().trim());
}

/**
 * Formata um valor de coluna do Smart Grid com base na unidade configurada.
 * Se a unidade for monetária, usa formatCurrency. Caso contrário, usa formatNumber com unidade como sufixo.
 */
export function formatColumnValue(value: number | string | null | undefined, unit?: string | null): string {
  if (value === null || value === undefined || value === "") return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);

  if (unit && isCurrencyUnit(unit)) {
    return formatCurrency(num, unit.toUpperCase() === "BRL" ? "R$" : unit);
  }

  const formatted = formatNumber(num);
  return unit ? `${formatted} ${unit}` : formatted;
}
