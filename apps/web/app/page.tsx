import Image from "next/image";
import Link from "next/link";
import PublicHeader from "./components/PublicHeader";
import { display, body, mono } from "./fonts";
import styles from "./components/landing/landing.module.css";
import Reveal from "./components/landing/Reveal";
import ComoFunciona from "./components/landing/ComoFunciona";
import { createClient } from "@/lib/supabase-server";

export const metadata = {
  title: "Projeto Laudo",
  description:
    "Vistoria predial pelo celular e laudo pronto em minutos, conforme a NBR 16.747.",
};

const CAPACIDADES = [
  {
    titulo: "Funciona offline",
    texto: "A vistoria não para porque o prédio não tem sinal.",
  },
  {
    titulo: "Banco de anomalias",
    texto: "Puxe da biblioteca em vez de digitar a mesma patologia de novo.",
  },
  {
    titulo: "Marcação de foto",
    texto: "Desenhe a anomalia direto em cima da imagem, na hora.",
  },
  {
    titulo: "Compartilhamento por link",
    texto: "Manda o laudo pronto sem precisar de e-mail nem impressora.",
  },
];

const AUDIENCIAS = [
  {
    titulo: "Engenheiro autônomo",
    texto: "Vistoria, laudo e entrega sem depender de escritório.",
  },
  {
    titulo: "Empresa de inspeção",
    texto: "Padroniza o laudo entre todos os vistoriadores do time.",
  },
  {
    titulo: "Síndico e administradora",
    texto: "Recebe o laudo pronto pra apresentar em assembleia.",
  },
];

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className={`${styles.root} ${display.variable} ${body.variable} ${mono.variable}`}>
      <PublicHeader loggedIn={!!user} />

      <div className={styles.wrap}>
        {/* Abertura */}
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <span className={`${styles.eyebrow} ${styles.heroEyebrow}`}>
              NBR 16.747 · Inspeção Predial Nível II
            </span>
            <h1>A vistoria acaba no prédio. O laudo também.</h1>
            <p>
              Fotografe, marque a anomalia e feche o laudo antes de sair da obra — sem
              levar anotação pra casa e sem noite perdida montando planilha.
            </p>
            <div className={styles.ctaRow}>
              <Link href="/cadastro" className={styles.btnPrimary}>
                Criar conta grátis
              </Link>
              <Link href="/login" className={styles.btnSecondary}>
                Já tenho conta
              </Link>
            </div>
          </div>
          <div className={styles.heroImage}>
            <Image
              src="/landing/hero-engenheiro.png"
              alt="Engenheiro com capacete e colete de segurança fazendo vistoria em obra"
              fill
              priority
              sizes="(max-width: 860px) 100vw, 480px"
            />
          </div>
        </section>

        {/* Como funciona */}
        <section className={styles.section}>
          <Reveal>
            <div className={styles.sectionHead}>
              <span className={styles.eyebrow}>Como funciona</span>
              <h2>Da vistoria ao laudo, em três passos</h2>
              <p>Sem planilha, sem retrabalho — tudo dentro do mesmo app.</p>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <ComoFunciona />
          </Reveal>
        </section>

        {/* Apresentação */}
        <section className={styles.section}>
          <Reveal>
            <div className={styles.sectionHead}>
              <span className={styles.eyebrow}>Apresentação</span>
              <h2>O que tem por trás do laudo</h2>
              <p>Pensado pra rotina real de quem vistoria prédio, não pra planilha de escritório.</p>
            </div>
          </Reveal>
          <ul className={styles.capList}>
            {CAPACIDADES.map((item, i) => (
              <Reveal key={item.titulo} delay={i * 90}>
                <li className={styles.capItem}>
                  <span className={styles.dot} />
                  <p>{item.titulo}</p>
                  <span style={{ color: "var(--tinta-muted)", fontSize: "0.86rem" }}>
                    {item.texto}
                  </span>
                </li>
              </Reveal>
            ))}
          </ul>
        </section>

        {/* Pra quem é */}
        <section className={styles.section}>
          <Reveal>
            <div className={styles.sectionHead}>
              <span className={styles.eyebrow}>Pra quem é</span>
              <h2>Feito pra quem assina o laudo</h2>
            </div>
          </Reveal>
          <div className={styles.audienceGrid}>
            {AUDIENCIAS.map((item, i) => (
              <Reveal key={item.titulo} delay={i * 90}>
                <div className={styles.audienceCard}>
                  <h3>{item.titulo}</h3>
                  <p>{item.texto}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Sobre */}
        <section className={styles.section}>
          <Reveal>
            <div className={styles.sobre}>
              <div>
                <span className={styles.eyebrow}>Sobre</span>
                <p>
                  O Projeto Laudo existe porque vistoria predial não devia significar
                  noites remontando anotação em planilha. A gente constrói ele testando
                  na rotina real de vistoria — cada campo, cada tela, pensado pro que
                  realmente acontece dentro do prédio, não atrás de uma mesa.
                </p>
              </div>
              <div className={styles.sobreImage}>
                <Image
                  src="/landing/apoio-laudo-pronto.png"
                  alt="Laudo de inspeção predial pronto para entrega"
                  fill
                  sizes="(max-width: 760px) 90vw, 420px"
                />
              </div>
            </div>
          </Reveal>
        </section>

        {/* Chamada final */}
        <section className={styles.section} style={{ borderTop: "none" }}>
          <Reveal>
            <div className={styles.ctaFinal}>
              <h2>Pronto pra testar na próxima vistoria?</h2>
              <p>Crie sua conta e leve o Projeto Laudo pra sua próxima inspeção.</p>
              <Link href="/cadastro" className={styles.btnPrimary}>
                Criar conta grátis
              </Link>
            </div>
          </Reveal>
        </section>

        <footer className={styles.footer}>
          <span>© {new Date().getFullYear()} Projeto Laudo</span>
          <Link href="/privacidade">Política de privacidade</Link>
        </footer>
      </div>
    </div>
  );
}
