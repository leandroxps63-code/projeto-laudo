"use client";

import { useEffect, useState, type FormEvent } from "react";
import { fetchAuthed, SESSION_EXPIRED_MESSAGE } from "@/lib/fetchAuthed";
import { formatCpf, isValidCpf, onlyDigits } from "@/lib/cpf";
import {
  colors,
  headingStyle,
  labelStyle,
  inputStyle,
  primaryButtonStyle,
  cardStyle,
  errorTextStyle,
} from "@/lib/theme";

const ROLE_LABELS: Record<string, string> = {
  responsavel_tecnico: "Responsável técnico",
  assistente: "Assistente",
  sindico: "Síndico",
};

type Profile = {
  full_name: string;
  cpf: string | null;
  birth_date: string | null;
  phone: string | null;
  crea: string | null;
  role: string;
};

/**
 * Perfil do próprio usuário — nome, CPF, data de nascimento, telefone e
 * CREA. Esses quatro últimos não entram no formulário de /cadastro (fica
 * pesado demais pra quem só quer criar a conta) — ficam pra completar
 * aqui, a qualquer momento, inclusive por quem entrou via Google (que não
 * manda CPF/nascimento pelo provedor).
 *
 * CREA é o mais importante dos quatro pro produto em si: já é usado no
 * cabeçalho e na assinatura de todo laudo gerado (lib/reportTemplate.ts),
 * mas não existia nenhuma tela pra preenchê-lo antes desta.
 */
export default function PerfilPage() {
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [crea, setCrea] = useState("");
  const [role, setRole] = useState("");

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchAuthed("/api/profile").then(async (res) => {
      if (res.status === 401) {
        setLoadFailed(true);
        setLoadingInitial(false);
        return;
      }
      const data = await res.json();
      if (data.profile) {
        const profile = data.profile as Profile;
        setFullName(profile.full_name ?? "");
        setCpf(profile.cpf ? formatCpf(profile.cpf) : "");
        setBirthDate(profile.birth_date ?? "");
        setPhone(profile.phone ?? "");
        setCrea(profile.crea ?? "");
        setRole(profile.role ?? "");
      } else {
        setLoadFailed(true);
      }
      setLoadingInitial(false);
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (cpf && !isValidCpf(cpf)) {
      setError("CPF inválido — confira os números digitados.");
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetchAuthed("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        cpf: cpf ? onlyDigits(cpf) : null,
        birthDate: birthDate || null,
        phone: phone || null,
        crea: crea || null,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(res.status === 401 ? SESSION_EXPIRED_MESSAGE : data.error ?? "Falha ao salvar perfil.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loadingInitial) {
    return (
      <main style={{ maxWidth: 460, margin: "48px auto", padding: "0 20px" }}>
        <p style={{ color: colors.tintaMuted }}>Carregando…</p>
      </main>
    );
  }

  if (loadFailed) {
    return (
      <main style={{ maxWidth: 460, margin: "48px auto", padding: "0 20px" }}>
        <p style={errorTextStyle}>{SESSION_EXPIRED_MESSAGE}</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 460, margin: "48px auto", padding: "0 20px" }}>
      <h1 style={{ ...headingStyle, fontSize: "1.2rem", marginBottom: 6 }}>Meu perfil</h1>
      <p style={{ color: colors.tintaMuted, fontSize: "0.85rem", marginBottom: 20 }}>
        {ROLE_LABELS[role] ?? role}
      </p>

      <form
        onSubmit={handleSubmit}
        style={{ ...cardStyle, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={labelStyle}>Nome</span>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={labelStyle}>CPF (opcional)</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => setCpf(formatCpf(e.target.value))}
            maxLength={14}
            style={inputStyle}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={labelStyle}>Data de nascimento (opcional)</span>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={labelStyle}>Telefone / WhatsApp (opcional)</span>
          <input
            type="tel"
            placeholder="(11) 91234-5678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={labelStyle}>CREA (opcional)</span>
          <input
            type="text"
            placeholder="Ex: 123456-SP"
            value={crea}
            onChange={(e) => setCrea(e.target.value)}
            style={inputStyle}
          />
          <span style={{ fontSize: 11, color: colors.tintaFaint }}>
            Aparece no cabeçalho e na assinatura de todo laudo que você gerar.
          </span>
        </label>

        {error && <p style={errorTextStyle}>{error}</p>}
        {saved && <p style={{ color: "#2f7d5c", fontSize: 13 }}>Perfil salvo.</p>}

        <button
          type="submit"
          disabled={saving}
          style={{ ...primaryButtonStyle, opacity: saving ? 0.7 : 1, cursor: saving ? "default" : "pointer" }}
        >
          {saving ? "Salvando…" : "Salvar alterações"}
        </button>
      </form>
    </main>
  );
}
