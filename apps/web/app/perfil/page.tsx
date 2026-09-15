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
  secondaryButtonStyle,
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

      <TeamSection />
    </main>
  );
}

type TeamProfile = { id: string; full_name: string; role: string; team_owner_id: string | null };

/**
 * Equipe — compartilha clientes/edificações/vistorias/laudos entre quem
 * convida (dono da conta) e quem entra (membro), com acesso equivalente.
 * Ver migration 0021_team_accounts.sql pro modelo de dados/RLS.
 */
function TeamSection() {
  const [profiles, setProfiles] = useState<TeamProfile[]>([]);
  const [isOwner, setIsOwner] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("assistente");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteOk, setInviteOk] = useState<string | null>(null);

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetchAuthed("/api/team")
      .then(async (res) => {
        if (!res.ok) {
          setLoadFailed(true);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setProfiles(data.profiles ?? []);
        setIsOwner(data.isOwner ?? true);
        setMyId(data.myId ?? null);
        setLoadFailed(false);
        setLoading(false);
      })
      .catch(() => {
        setLoadFailed(true);
        setLoading(false);
      });
  }

  useEffect(load, []);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteError(null);
    setInviteOk(null);

    const res = await fetchAuthed("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setInviteError(data.error ?? "Falha ao convidar.");
      setInviting(false);
      return;
    }

    setInviteOk(`${data.name ?? "Pessoa"} agora faz parte da sua equipe.`);
    setInviteEmail("");
    setInviting(false);
    load();
  }

  async function handleRemove(memberId: string) {
    setActionError(null);
    setRemovingId(memberId);
    const res = await fetchAuthed(`/api/team/${memberId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setActionError(data.error ?? "Falha ao remover.");
      setRemovingId(null);
      return;
    }
    setRemovingId(null);
    load();
  }

  async function handleLeave() {
    setActionError(null);
    setLeaving(true);
    const res = await fetchAuthed("/api/team/leave", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setActionError(data.error ?? "Falha ao sair da equipe.");
      setLeaving(false);
      return;
    }
    setLeaving(false);
    load();
  }

  if (loading || loadFailed) return null;

  const owner = profiles.find((p) => !p.team_owner_id);
  const others = profiles.filter((p) => p.id !== myId);

  return (
    <div style={{ ...cardStyle, padding: 20, marginTop: 20 }}>
      <h2 style={{ ...headingStyle, fontSize: "1rem", marginBottom: 4 }}>Equipe</h2>
      <p style={{ fontSize: 12.5, color: colors.tintaMuted, marginBottom: 16 }}>
        {isOwner
          ? "Quem você convidar passa a enxergar e editar os mesmos clientes, vistorias e laudos que você."
          : `Você faz parte da equipe de ${owner?.full_name ?? "outra conta"} — mesmos clientes, vistorias e laudos.`}
      </p>

      {others.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8, marginBottom: isOwner ? 16 : 0 }}>
          {others.map((p) => (
            <li
              key={p.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: colors.concreto,
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 13,
              }}
            >
              <span>
                <strong style={{ color: colors.tinta }}>{p.full_name}</strong>{" "}
                <span style={{ color: colors.tintaFaint }}>— {ROLE_LABELS[p.role] ?? p.role}</span>
              </span>
              {isOwner && p.id !== owner?.id && (
                <button
                  type="button"
                  onClick={() => handleRemove(p.id)}
                  disabled={removingId === p.id}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: colors.erro,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: removingId === p.id ? "default" : "pointer",
                  }}
                >
                  {removingId === p.id ? "Removendo…" : "Remover"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {actionError && <p style={{ ...errorTextStyle, marginBottom: 12 }}>{actionError}</p>}

      {isOwner ? (
        <form onSubmit={handleInvite} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="email"
              required
              placeholder="e-mail de quem já tem conta"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              style={{ ...inputStyle, width: 150 }}
            >
              <option value="responsavel_tecnico">Responsável técnico</option>
              <option value="assistente">Assistente</option>
              <option value="sindico">Síndico</option>
            </select>
          </div>
          {inviteError && <p style={errorTextStyle}>{inviteError}</p>}
          {inviteOk && <p style={{ color: "#2f7d5c", fontSize: 13 }}>{inviteOk}</p>}
          <button
            type="submit"
            disabled={inviting}
            style={{
              ...secondaryButtonStyle,
              alignSelf: "flex-start",
              padding: "9px 16px",
              fontSize: "0.82rem",
              opacity: inviting ? 0.7 : 1,
              cursor: inviting ? "default" : "pointer",
            }}
          >
            {inviting ? "Convidando…" : "Convidar"}
          </button>
          <p style={{ fontSize: 11, color: colors.tintaFaint, margin: 0 }}>
            A pessoa precisa já ter uma conta criada em /cadastro.
          </p>
        </form>
      ) : (
        <button
          type="button"
          onClick={handleLeave}
          disabled={leaving}
          style={{
            ...secondaryButtonStyle,
            padding: "9px 16px",
            fontSize: "0.82rem",
            borderColor: colors.erro,
            color: colors.erro,
            opacity: leaving ? 0.7 : 1,
            cursor: leaving ? "default" : "pointer",
          }}
        >
          {leaving ? "Saindo…" : "Sair da equipe"}
        </button>
      )}
    </div>
  );
}
