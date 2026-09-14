import { colors, headingStyle } from "@/lib/theme";

export const metadata = {
  title: "Política de privacidade — Projeto Laudo",
};

/**
 * Política de privacidade — página pública (sem login), link estável exigido
 * pelas lojas de app antes de submeter (Fase 06, l1). Conteúdo espelha o
 * rascunho registrado no Notion ("Lançamento e Suporte — Fase 06").
 *
 * NOTA HONESTA: não é aconselhamento jurídico. Recomendação registrada desde
 * o rascunho original: revisão por um profissional antes de publicar de
 * verdade, principalmente pela LGPD.
 */
export default function PrivacidadePage() {
  return (
    <main style={{ maxWidth: 640, margin: "48px auto", padding: "0 20px 60px" }}>
      <h1 style={{ ...headingStyle, fontSize: "1.4rem", marginBottom: 6 }}>
        Política de privacidade
      </h1>
      <p style={{ color: colors.tintaMuted, fontSize: "0.85rem", marginBottom: 28 }}>
        Última atualização: 14/09/2026
      </p>

      <Section title="Dados coletados">
        <p>
          Nome e e-mail do responsável técnico/assistente (conta de acesso — via cadastro direto
          ou login com Google); CPF, data de nascimento, telefone e número de registro no CREA,
          quando o próprio usuário optar por preenchê-los no perfil (usados pra identificar o
          responsável técnico no laudo emitido); dados do cliente e da edificação inspecionada
          (nome, endereço, número de pavimentos); fotos tiradas durante a vistoria; descrições de
          anomalias e tratamentos recomendados; número de ART quando informado.
        </p>
      </Section>

      <Section title="Finalidade">
        <p>
          Gerar o laudo de inspeção predial (documento + planilha de ação) e permitir
          compartilhamento controlado do resultado com terceiros autorizados pelo responsável
          técnico (ex: síndico).
        </p>
      </Section>

      <Section title="Armazenamento">
        <p>
          Supabase (banco de dados + storage de arquivos), com Row Level Security — cada
          responsável só acessa vistorias e clientes que ele mesmo cadastrou ou dos quais é
          membro. Fotos e documentos ficam em buckets privados; o único acesso público é via
          link de compartilhamento explícito, que o responsável ativa/desativa quando quiser.
        </p>
      </Section>

      <Section title="Compartilhamento com terceiros">
        <p>
          Nenhum, exceto o próprio compartilhamento de laudo que o usuário ativa deliberadamente.
          Não vendemos nem repassamos dado a anunciantes.
        </p>
      </Section>

      <Section title="Direitos do titular (LGPD)">
        <p>
          Acesso, correção e exclusão dos próprios dados, mediante solicitação pelo canal de
          suporte abaixo.
        </p>
      </Section>

      <Section title="Retenção">
        <p>
          Dados ficam enquanto a conta existir; exclusão de conta sob pedido remove clientes,
          edificações e vistorias associados (exceto o que a lei exigir manter, ex: registro de
          ART).
        </p>
      </Section>

      <Section title="Contato">
        <p>
          <a href="mailto:leandroxps63@gmail.com" style={{ color: colors.azul, fontWeight: 700 }}>
            leandroxps63@gmail.com
          </a>
        </p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 22 }}>
      <h2 style={{ ...headingStyle, fontSize: "0.95rem", marginBottom: 6 }}>{title}</h2>
      <div style={{ fontSize: "0.88rem", color: colors.tintaMuted, lineHeight: 1.6 }}>{children}</div>
    </section>
  );
}
