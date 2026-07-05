"use client";

import { LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";

/**
 * One-time entrance reveal (fade + slight rise) for dashboard sections.
 * Uses LazyMotion so only the ~18KB domAnimation bundle is loaded. Falls back
 * to a plain div when the user prefers reduced motion.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  /** Stagger offset in seconds. */
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        className={className}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
