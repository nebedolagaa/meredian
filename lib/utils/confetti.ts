"use client";

/**
 * Dependency-free confetti burst built with the Web Animations API. Respects
 * `prefers-reduced-motion` and cleans up after itself. Colours default to the
 * Meredian accent palette.
 */
export function fireConfetti(options?: { count?: number; colors?: string[] }) {
  if (typeof document === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const count = options?.count ?? 90;
  const colors = options?.colors ?? [
    "#818CF8", // steel
    "#A3E635", // moss
    "#F87171", // clay
    "#ECECF2", // bone
    "#4F46E5", // indigo
  ];

  const container = document.createElement("div");
  container.setAttribute("aria-hidden", "true");
  container.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;";
  document.body.appendChild(container);

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  for (let i = 0; i < count; i++) {
    const piece = document.createElement("div");
    const size = 6 + Math.random() * 6;
    const color = colors[i % colors.length];
    piece.style.cssText = `position:absolute;top:-12px;left:${
      Math.random() * vw
    }px;width:${size}px;height:${size * 0.45}px;background:${color};border-radius:1px;`;
    container.appendChild(piece);

    const dx = (Math.random() - 0.5) * 260;
    const dy = vh + 60;
    const rot = Math.random() * 720 - 360;
    const duration = 1500 + Math.random() * 1300;

    piece.animate(
      [
        { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
        {
          transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`,
          opacity: 0.85,
        },
      ],
      {
        duration,
        easing: "cubic-bezier(.2,.6,.35,1)",
        fill: "forwards",
        delay: Math.random() * 180,
      },
    );
  }

  window.setTimeout(() => container.remove(), 3000);
}
