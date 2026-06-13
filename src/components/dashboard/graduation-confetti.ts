"use client";

export function fireGraduationConfetti() {
  if (
    typeof window === "undefined" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.style.position = "fixed";
  layer.style.inset = "0";
  layer.style.pointerEvents = "none";
  layer.style.zIndex = "9999";
  document.body.appendChild(layer);

  const colors = ["#0f766e", "#14b8a6", "#f59e0b", "#ef4444", "#f8fafc"];
  const sides = [12, window.innerWidth - 12];

  for (const side of sides) {
    for (let i = 0; i < 42; i += 1) {
      const piece = document.createElement("span");
      const size = 6 + Math.random() * 7;
      const x = side;
      const y = window.innerHeight * (0.38 + Math.random() * 0.22);
      const dir = side < window.innerWidth / 2 ? 1 : -1;
      piece.style.position = "absolute";
      piece.style.left = `${x}px`;
      piece.style.top = `${y}px`;
      piece.style.width = `${size}px`;
      piece.style.height = `${size * 0.55}px`;
      piece.style.borderRadius = "2px";
      piece.style.background = colors[i % colors.length];
      piece.style.opacity = "0.95";
      piece.style.transform = "translate3d(0, 0, 0)";
      piece.style.transition =
        "transform 1200ms cubic-bezier(.16,1,.3,1), opacity 1200ms ease-out";
      layer.appendChild(piece);

      requestAnimationFrame(() => {
        const dx = dir * (160 + Math.random() * 380);
        const dy = -180 - Math.random() * 260;
        const rotate = dir * (180 + Math.random() * 420);
        piece.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${rotate}deg)`;
        piece.style.opacity = "0";
      });
    }
  }

  window.setTimeout(() => layer.remove(), 1500);
}
