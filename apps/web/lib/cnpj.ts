import { onlyDigits } from "./cpf";

export function formatCnpj(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

/** Valida formato + dígito verificador (algoritmo padrão de CNPJ). */
export function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const weightsFor = (checkDigitIndex: number) => {
    const base = checkDigitIndex === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    return base;
  };

  for (const checkDigitIndex of [12, 13]) {
    const weights = weightsFor(checkDigitIndex);
    let sum = 0;
    for (let i = 0; i < checkDigitIndex; i++) {
      sum += Number(cnpj[i]) * weights[i];
    }
    const remainder = sum % 11;
    const expected = remainder < 2 ? 0 : 11 - remainder;
    if (expected !== Number(cnpj[checkDigitIndex])) return false;
  }

  return true;
}
