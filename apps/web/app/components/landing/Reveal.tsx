"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./landing.module.css";

/**
 * Cada seção some/sobe um pouco e volta ao normal quando entra na tela,
 * uma vez só (unobserve após revelar) — evita repetir a animação toda
 * vez que a pessoa rola pra cima e pra baixo de novo.
 */
export default function Reveal({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${styles.reveal} ${visible ? styles.in : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
