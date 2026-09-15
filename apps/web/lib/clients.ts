import { onlyDigits, isValidCpf } from "./cpf";
import { isValidCnpj } from "./cnpj";

export const CLIENT_SELECT_COLUMNS =
  "id, name, email, phone, person_type, document, contact_name, contact_role, zip_code, street, number, complement, district, city, state, notes, created_at";

export function validateClientDocument(personType: string, document?: string | null): string | null {
  if (!document) return null;
  const digits = onlyDigits(document);
  if (personType === "pj") {
    if (!isValidCnpj(digits)) return "CNPJ inválido.";
  } else {
    if (!isValidCpf(digits)) return "CPF inválido.";
  }
  return null;
}
