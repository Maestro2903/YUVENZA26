"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** stagger children instead of the element itself */
  stagger?: boolean;
  y?: number;
  delay?: number;
  as?: "div" | "section" | "header";
  id?: string;
};

/**
 * Fade/rise elements as they enter the viewport, synced with the global
 * Lenis + ScrollTrigger loop. Respects reduced-motion.
 */
export default function Reveal({
  children,
  className,
  stagger = false,
  y = 40,
  delay = 0,
  as = "div",
  id,
}: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);
    const targets = stagger ? Array.from(el.children) : el;

    const ctx = gsap.context(() => {
      gsap.from(targets, {
        opacity: 0,
        y,
        duration: 1,
        delay,
        ease: "power3.out",
        stagger: stagger ? 0.12 : 0,
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
        },
      });
    }, el);

    return () => ctx.revert();
  }, [stagger, y, delay]);

  const Tag = as as React.ElementType;
  return (
    <Tag ref={ref} className={className} id={id}>
      {children}
    </Tag>
  );
}
