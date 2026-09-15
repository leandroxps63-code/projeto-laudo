"use client";

import { colors, fontMono, labelStyle, inputStyle, primaryButtonStyle, errorTextStyle } from "@/lib/theme";
import { formatCpf, isValidCpf } from "@/lib/cpf";
import { formatCnpj, isValidCnpj } from "@/lib/cnpj";
import { formatCep, fetchAddressByCep } from "@/lib/cep";

export type ClienteFormValues = {
  name: string;
  email: string;
  phone: string;
  personType: "pf" | "pj";
  document: string;
  contactName: string;
  contactRole: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  notes: string;
};

export const EMPTY_CLIENT_FORM: ClienteFormValues = {
  name: "",
  email: "",
  phone: "",
  personType: "pf",
  document: "",
  contactName: "",
  contactRole: "",
  zipCode: "",
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
  notes: "",
};

export function clientRowToForm(row: Record<string, unknown>): ClienteFormValues {
  const personType = row.person_type === "pj" ? "pj" : "pf";
  const document = (row.document as string | null) ?? "";
  return {
    name: (row.name as string) ?? "",
    email: (row.email as string | null) ?? "",
    phone: (row.phone as string | null) ?? "",
    personType,
    document: document ? (personType === "pj" ? formatCnpj(document) : formatCpf(document)) : "",
    contactName: (row.contact_name as string | null) ?? "",
    contactRole: (row.contact_role as string | null) ?? "",
    zipCode: (row.zip_code as string | null) ? formatCep(row.zip_code as string) : "",
    street: (row.street as string | null) ?? "",
    number: (row.number as string | null) ?? "",
    complement: (row.complement as string | null) ?? "",
    district: (row.district as string | null) ?? "",
    city: (row.city as string | null) ?? "",
    state: (row.state as string | null) ?? "",
    notes: (row.notes as string | null) ?? "",
  };
}

export function clientFormToBody(form: ClienteFormValues) {
  return {
    name: form.name,
    email: form.email || undefined,
    phone: form.phone || undefined,
    personType: form.personType,
    document: form.document || undefined,
    contactName: form.contactName || undefined,
    contactRole: form.contactRole || undefined,
    zipCode: form.zipCode || undefined,
    street: form.street || undefined,
    number: form.number || undefined,
    complement: form.complement || undefined,
    district: form.district || undefined,
    city: form.city || undefined,
    state: form.state || undefined,
    notes: form.notes || undefined,
  };
}

/** Valida o documento no cliente, espelhando a validação do servidor — feedback imediato sem round-trip. */
export function validateClientDocumentClientSide(form: ClienteFormValues): string | null {
  if (!form.document) return null;
  if (form.personType === "pj" && !isValidCnpj(form.document)) return "CNPJ inválido.";
  if (form.personType === "pf" && !isValidCpf(form.document)) return "CPF inválido.";
  return null;
}

export default function ClienteForm({
  form,
  onChange,
  onSubmit,
  loading,
  error,
  submitLabel,
}: {
  form: ClienteFormValues;
  onChange: (updater: (form: ClienteFormValues) => ClienteFormValues) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string | null;
  submitLabel: string;
}) {
  function set<K extends keyof ClienteFormValues>(field: K, value: ClienteFormValues[K]) {
    onChange((f) => ({ ...f, [field]: value }));
  }

  async function handleCepBlur() {
    const address = await fetchAddressByCep(form.zipCode);
    if (!address) return;
    onChange((f) => ({
      ...f,
      street: f.street || address.street,
      district: f.district || address.district,
      city: f.city || address.city,
      state: f.state || address.state,
    }));
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionTitle>Tipo de cliente</SectionTitle>
        <div style={{ display: "flex", gap: 10 }}>
          {(["pf", "pj"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => set("personType", type)}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 9,
                border: `1.3px solid ${form.personType === type ? colors.azul : colors.pedra}`,
                background: form.personType === type ? colors.azulTint : colors.superficie,
                color: form.personType === type ? colors.azul : colors.tintaMuted,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {type === "pf" ? "Pessoa física" : "Pessoa jurídica"}
            </button>
          ))}
        </div>

        <Field
          label={form.personType === "pj" ? "Razão social" : "Nome"}
          value={form.name}
          onChange={(v) => set("name", v)}
          required
        />
        <Field
          label={`${form.personType === "pj" ? "CNPJ" : "CPF"} (opcional)`}
          value={form.document}
          onChange={(v) => set("document", form.personType === "pj" ? formatCnpj(v) : formatCpf(v))}
        />
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionTitle>Contato</SectionTitle>
        <Field label="E-mail (opcional)" value={form.email} onChange={(v) => set("email", v)} type="email" />
        <Field label="Telefone / WhatsApp (opcional)" value={form.phone} onChange={(v) => set("phone", v)} />
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Field
              label="Pessoa de contato (opcional)"
              value={form.contactName}
              onChange={(v) => set("contactName", v)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Field
              label="Cargo (opcional)"
              placeholder="ex: Síndico"
              value={form.contactRole}
              onChange={(v) => set("contactRole", v)}
            />
          </div>
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionTitle>Endereço</SectionTitle>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ width: 140 }}>
            <Field
              label="CEP (opcional)"
              value={form.zipCode}
              onChange={(v) => set("zipCode", formatCep(v))}
              onBlur={handleCepBlur}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Rua (opcional)" value={form.street} onChange={(v) => set("street", v)} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ width: 100 }}>
            <Field label="Número (opcional)" value={form.number} onChange={(v) => set("number", v)} />
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Complemento (opcional)" value={form.complement} onChange={(v) => set("complement", v)} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Field label="Bairro (opcional)" value={form.district} onChange={(v) => set("district", v)} />
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Cidade (opcional)" value={form.city} onChange={(v) => set("city", v)} />
          </div>
          <div style={{ width: 70 }}>
            <Field
              label="UF"
              value={form.state}
              onChange={(v) => set("state", v.toUpperCase().slice(0, 2))}
            />
          </div>
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionTitle>Observações</SectionTitle>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={labelStyle}>Anotações internas (opcional)</span>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
          />
        </label>
      </section>

      {error && <p style={errorTextStyle}>{error}</p>}

      <button
        type="submit"
        disabled={loading}
        style={{ ...primaryButtonStyle, opacity: loading ? 0.7 : 1, cursor: loading ? "default" : "pointer" }}
      >
        {loading ? "Salvando…" : submitLabel}
      </button>
    </form>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: fontMono,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: colors.tintaFaint,
      }}
    >
      {children}
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={labelStyle}>{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        style={inputStyle}
      />
    </label>
  );
}
