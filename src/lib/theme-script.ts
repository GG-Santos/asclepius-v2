/**
 * No-FOUC theme bootstrap. Rendered by the ROOT LAYOUT (a server component)
 * as static HTML, so it executes during the initial document parse — before
 * first paint — and is never re-rendered by React on the client (React 19.2
 * warns about <script> elements rendered from client components).
 *
 * Must mirror the resolution logic in components/theme-provider.tsx:
 * localStorage("theme") → "system" → prefers-color-scheme.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var d=document.documentElement,t=localStorage.getItem("theme")||"system",r=t==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;d.classList.remove("light","dark");d.classList.add(r);d.style.colorScheme=r}catch(e){}})()`;
