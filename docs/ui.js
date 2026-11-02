/* Finance Jobs Radar — couche d'interface : indicateur d'onglet, apparitions au défilement, compteurs animés, bandeaux. */
(() => {
"use strict";
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---- indicateur d'onglet qui glisse
const tabs = $(".tabs"), ink = document.createElement("span");
ink.className = "tab-ink"; tabs.appendChild(ink);
function moveInk() {
  const a = $(".tabs button.active"); if (!a) return;
  ink.style.width = a.offsetWidth + "px"; ink.style.transform = `translateX(${a.offsetLeft}px)`;
  ink.style.height = a.offsetHeight + "px"; ink.style.top = a.offsetTop + "px";
  if (a.scrollIntoView && tabs.scrollWidth > tabs.clientWidth) a.scrollIntoView({ inline: "center", block: "nearest", behavior: reduce ? "auto" : "smooth" });
}
// sur mobile, la barre d'onglets vit en bas de l'écran, hors de l'en-tête
const home = $(".topbar"), themeBtn = $("#themeBtn"), mq = matchMedia("(max-width: 640px)");
function placeTabs() { if (mq.matches) { if (tabs.parentNode !== document.body) document.body.appendChild(tabs); } else if (tabs.parentNode !== home) home.insertBefore(tabs, themeBtn); moveInk(); }
mq.addEventListener?.("change", placeTabs); placeTabs();
addEventListener("resize", moveInk); document.addEventListener("fjr:tab", () => requestAnimationFrame(moveInk));
document.fonts?.ready.then(moveInk); setTimeout(moveInk, 300);

// ---- compteurs animés
function countTo(el, to) {
  const from = +(el.dataset.v || 0); el.dataset.v = to;
  if (reduce || from === to) { el.textContent = to.toLocaleString("fr-FR"); return; }
  const t0 = performance.now(), d = 700;
  const f = t => { const k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(from + (to - from) * e).toLocaleString("fr-FR"); if (k < 1) requestAnimationFrame(f); };
  requestAnimationFrame(f);
}
const prevK = {};
new MutationObserver(() => $$("#kpis .kpi").forEach(k => { const b = k.querySelector("b"); if (!b || b.dataset.done) return; const n = +b.textContent.replace(/\D/g, ""), key = k.dataset.level || "all"; b.dataset.done = 1; b.dataset.v = prevK[key] ?? 0; prevK[key] = n; countTo(b, n); }))
  .observe($("#kpis"), { childList: true });

// ---- apparition au défilement
const io = "IntersectionObserver" in window && !reduce ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -6% 0px" }) : null;
const REVEAL = ".tcard2, .feat, .st3, .sec-head, .demo, #tab-about .card, .col, .dtile";
function reveal(root = document) {
  if (!io) return;
  root.querySelectorAll(REVEAL).forEach((el, i) => { if (el.dataset.rv) return; el.dataset.rv = 1; el.classList.add("rv"); el.style.setProperty("--d", `${Math.min(i % 12, 8) * 40}ms`); io.observe(el); });
}
new MutationObserver(ms => { for (const m of ms) m.addedNodes.forEach(n => n.nodeType === 1 && reveal(n.parentNode || document)); }).observe($("main"), { childList: true, subtree: true });
reveal();

// ---- bandeaux : chiffres clés
function heroStats() {
  const F = window.FJR; if (!F) return;
  const tr = Object.values(F.S.track || {}), by = st => tr.filter(t => t.status === st).length;
  const pt = $("#phTrack");
  if (pt) pt.innerHTML = [["À postuler", "à postuler"], ["Envoyée", "envoyées"], ["Entretien", "entretiens"], ["Offre", "offres"]].map(([k, l]) => `<div class="stat"><b>${by(k)}</b><span>${l}</span></div>`).join("");
}
function targetStats() {
  const pt = $("#phTargets"); if (!pt || pt.dataset.ok) return;
  fetch("data/targets.json").then(r => r.json()).then(t => {
    pt.dataset.ok = 1;
    const n = t.length, wj = t.filter(x => x.jobs).length, auto = t.filter(x => x.auto).length, jobs = t.reduce((a, x) => a + x.jobs, 0);
    pt.innerHTML = [[n, "employeurs suivis"], [auto, "lus automatiquement"], [wj, "recrutent en ce moment"], [jobs, "offres juniors"]].map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join("");
  }).catch(() => {});
}
document.addEventListener("fjr:tab", e => { if (e.detail === "track") heroStats(); if (e.detail === "targets") targetStats(); });
document.addEventListener("fjr:data", () => { heroStats(); targetStats(); });

// ---- retour en haut
const top = document.createElement("button");
top.className = "to-top"; top.setAttribute("aria-label", "Revenir en haut"); top.innerHTML = "↑"; document.body.appendChild(top);
top.onclick = () => scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
addEventListener("scroll", () => top.classList.toggle("show", scrollY > 900), { passive: true });
})();
