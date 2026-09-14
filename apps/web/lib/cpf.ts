/** Mantém só dígitos — usado tanto pra validar quanto pra formatar. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/**
 * Valida formato + dígito verificador (algoritmo padrão de CPF). Confirma
 * que o número é matematicamente possível, não que pertence a quem digitou
 * — isso exigiria um serviço de verificação externo, fora de escopo aqui.
 */
export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  for (const checkDigitIndex of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < checkDigitIndex; i++) {
      sum += Number(cpf[i]) * (checkDigitIndex + 1 - i);
    }
    const remainder = (sum * 10) % 11;
    const expected = remainder === 10 ? 0 : remainder;
    if (expected !== Number(cpf[checkDigitIndex])) return false;
  }

  return true;
}
