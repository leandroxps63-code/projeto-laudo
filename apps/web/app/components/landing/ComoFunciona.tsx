"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./landing.module.css";

const STEPS = [
  {
    label: "1. Vistoria em campo",
    title: "Vistoria em campo",
    text: "O engenheiro abre o app no celular, mesmo sem internet, e percorre a edificação.",
  },
  {
    label: "2. Registro com foto",
    title: "Registro com foto",
    text: "Cada anomalia vira uma foto marcada na hora, com severidade e tratamento sugerido.",
  },
  {
    label: "3. Laudo pronto",
    title: "Laudo pronto",
    text: "PDF e planilha de ação gerados automaticamente, prontos pra assinar e entregar.",
  },
];

export default function ComoFunciona() {
  const [active, setActive] = useState(0);

  return (
    <div className={styles.tabsCard}>
      <div>
        <div className={styles.tabsNav}>
          <div
            className={styles.tabIndicator}
            style={{ transform: `translateX(${active * 100}%)` }}
          />
          {STEPS.map((step, i) => (
            <button
              key={step.title}
              type="button"
              className={`${styles.tabBtn} ${active === i ? styles.active : ""}`}
              onClick={() => setActive(i)}
            >
              {step.label}
            </button>
          ))}
        </div>
        <div className={styles.tabPanels}>
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className={`${styles.tabPanel} ${active === i ? styles.active : ""}`}
            >
              <span className={styles.tabNum}>{i + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.tabsImage}>
        <Image
          src="/landing/apoio-foto-anomalia.png"
          alt="Registro de anomalia com marcação de foto no Projeto Laudo"
          fill
          sizes="(max-width: 760px) 90vw, 420px"
        />
      </div>
    </div>
  );
}
