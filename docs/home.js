/* Finance Jobs Radar — page d'accueil : compteurs, carte radar animée, offres flottantes, bandeau, démo. */
(() => {
"use strict";
const $ = s => document.querySelector(s);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
let F, jobs = [], started = false;

// ------------------------------------------------ navigation depuis l'accueil
document.addEventListener("click", e => {
  const b = e.target.closest("[data-go]");
  if (b && window.FJR) { e.preventDefault(); FJR.switchTab(b.dataset.go); }
});

// ------------------------------------------------ compteurs
function countUp(el, to) {
  if (reduce) { el.textContent = to.toLocaleString("fr-FR"); return; }
  const t0 = performance.now(), dur = 1400;
  const step = t => {
    const k = Math.min(1, (t - t0) / dur), v = Math.round(to * (1 - Math.pow(1 - k, 3)));
    el.textContent = v.toLocaleString("fr-FR");
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function stats() {
  const week = Date.now() - 7 * 864e5;
  const v = {
    jobs: jobs.length,
    employers: new Set(jobs.map(j => j.employer)).size,
    countries: new Set(jobs.map(j => j.cc).filter(Boolean)).size,
    fresh: jobs.filter(j => new Date((j.posted || j.first_seen || "").slice(0, 10)) >= week).length,
  };
  document.querySelectorAll("[data-count]").forEach(el => countUp(el, v[el.dataset.count] || 0));
  const today = jobs.filter(j => j.first_seen === F.S.today).length;
  if (today && !F.S.firstDay) $("#hEyebrow").textContent = `${today} nouvelle${today > 1 ? "s" : ""} offre${today > 1 ? "s" : ""} ce matin`;
  fetch("data/meta.json", { cache: "no-cache" }).then(r => r.json()).then(m => {
    const n = Object.keys(m.sources || {}).length; if (n) $("#hSources").textContent = n;
  }).catch(() => {});
}

// ------------------------------------------------ carte radar (canvas)
const LAT_TOP = 76, LAT_BOT = -56;
let cv, ctx, W = 0, H = 0, dpr = 1, landDots = [], pts = [], landReady = false;
const proj = (lon, lat) => [(lon + 180) / 360 * W, (LAT_TOP - lat) / (LAT_TOP - LAT_BOT) * H];

async function loadLand() {
  try {
    const topo = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json").then(r => r.json());
    const land = topojson.feature(topo, topo.objects.land);
    // rasterise les terres sur un petit canevas, puis échantillonne une grille de points
    const GW = 180, GH = Math.round(GW * (LAT_TOP - LAT_BOT) / 360 * 1.6);
    const off = document.createElement("canvas"); off.width = GW; off.height = GH;
    const o = off.getContext("2d"); o.fillStyle = "#000";
    const P = (lon, lat) => [(lon + 180) / 360 * GW, (LAT_TOP - lat) / (LAT_TOP - LAT_BOT) * GH];
    for (const f of land.features) {
      const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
      for (const poly of polys) {
        o.beginPath();
        for (const ring of poly) ring.forEach(([x, y], i) => { const [a, b] = P(x, y); i ? o.lineTo(a, b) : o.moveTo(a, b); });
        o.fill("evenodd");
      }
    }
    const px = o.getImageData(0, 0, GW, GH).data;
    landDots = [];
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++)
      if (px[(y * GW + x) * 4 + 3] > 100) landDots.push([x / GW, y / GH]);
    landReady = true;
  } catch { landReady = true; }
}

function resize() {
  const r = cv.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1);
  W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  pts = jobs.filter(j => j.lat != null && j.lon != null).map(j => {
    const [x, y] = proj(j.lon + (Math.random() - .5) * .8, j.lat + (Math.random() - .5) * .8);
    return { x, y, c: F.catColor(j.category), j, glow: 0 };
  });
}

let sweep = 0, last = 0;
function frame(t) {
  if (!document.getElementById("tab-home").classList.contains("active")) { last = 0; requestAnimationFrame(frame); return; }
  const dt = last ? Math.min(64, t - last) : 16; last = t;
  ctx.clearRect(0, 0, W, H);
  // terres en matrice de points
  const step = W / 180;
  ctx.fillStyle = "rgba(160,180,255,.22)";
  for (const [u, v] of landDots) { ctx.beginPath(); ctx.arc(u * W + step / 2, v * H + step / 2, Math.max(.7, step * .26), 0, 6.283); ctx.fill(); }
  // ligne de balayage
  sweep = (sweep + dt * W / 7000) % (W + 160);
  const sx = sweep - 80;
  const g = ctx.createLinearGradient(sx - 120, 0, sx, 0);
  g.addColorStop(0, "rgba(46,98,255,0)"); g.addColorStop(1, "rgba(111,147,255,.22)");
  ctx.fillStyle = g; ctx.fillRect(sx - 120, 0, 120, H);
  ctx.fillStyle = "rgba(170,195,255,.65)"; ctx.fillRect(sx, 0, 1.2, H);
  // offres
  for (const p of pts) {
    if (Math.abs(p.x - sx) < 3) p.glow = 1;
    p.glow = Math.max(0, p.glow - dt / 2600);
    const r = 2.2 + p.glow * 3;
    if (p.glow > 0) { ctx.globalAlpha = p.glow * .35; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, r + 6 * p.glow, 0, 6.283); ctx.fill(); }
    ctx.globalAlpha = .55 + p.glow * .45; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.283); ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (!reduce) requestAnimationFrame(frame);
}

// ------------------------------------------------ offres flottantes
function recent() {
  return [...jobs].sort((a, b) => (b.first_seen || "").localeCompare(a.first_seen || "") || (b.posted || "").localeCompare(a.posted || ""));
}
let fi = 0;
function floater() {
  if (!document.getElementById("tab-home").classList.contains("active") || document.hidden) return;
  const pool = recent().filter(j => j.lat != null).slice(0, 40);
  if (!pool.length || !W) return;
  const j = pool[fi++ % pool.length];
  const [x, y] = proj(j.lon, j.lat);
  const el = document.createElement("div");
  el.className = "floater";
  el.innerHTML = `${F.logoHtml(j)}<div><b>${F.esc(j.title.length > 60 ? j.title.slice(0, 58) + "…" : j.title)}</b><small>${F.esc(j.employer)} · ${F.flag(j.cc)} ${F.esc(j.city || j.country || "")}</small></div>`;
  const box = $("#floaters"); box.appendChild(el);
  const w = el.offsetWidth, h = el.offsetHeight;
  el.style.left = Math.max(0, Math.min(W - w, x - w / 2)) + "px";
  el.style.top = Math.max(0, Math.min(H - h, y < H / 2 ? y + 14 : y - h - 14)) + "px";
  setTimeout(() => el.remove(), 4600);
}

// ------------------------------------------------ bandeau défilant
function ticker() {
  const list = recent().slice(0, 24);
  const html = list.map(j => `<span class="tk" data-id="${F.esc(j.id)}"><i class="dot" style="background:${F.catColor(j.category)}"></i><b>${F.esc(j.employer)}</b>${F.esc(j.title.length > 54 ? j.title.slice(0, 52) + "…" : j.title)} · ${F.flag(j.cc)} ${F.esc(j.city || "")} <span style="opacity:.6">${F.rel(j.first_seen)}</span></span>`).join("");
  const t = $("#ticker"); t.innerHTML = html + html;
  t.onclick = e => { const s = e.target.closest(".tk"); if (!s) return; const j = jobs.find(x => x.id === s.dataset.id); if (j) F.openJob(j); };
}

// ------------------------------------------------ démo
const STEPS = [
  ["offres", "Trouve les offres", "Postes juniors uniquement, filtrés par métier, zone et date, avec un salaire estimé."],
  ["carte", "Vois où ça recrute", "Carte du monde interactive : clique un pays pour voir ses offres."],
  ["fiche", "Évalue ton match", "Chaque offre a un score de compatibilité avec ton CV et un lien direct vers la candidature."],
  ["candidature", "CV et lettre sur mesure", "Importe ton CV en PDF, exporte-le sur une page et fais rédiger ta lettre par Claude."],
  ["cibles", "Vise l'infra et l'énergie", "Boutiques, fonds infra et institutions de développement, avec leurs offres en cours."],
  ["suivi", "Suis tes candidatures", "Un tableau à colonnes, de « à postuler » jusqu'à « offre »."],
];
const DUR = 5200;
let di = 0, dTimer;
function demo() {
  $("#demoSteps").innerHTML = STEPS.map(([, t, d], i) => `<button class="dstep" data-i="${i}" style="--dur:${DUR}ms"><b>${t}</b><span>${d}</span><i class="prog"></i></button>`).join("");
  $("#demoImgs").innerHTML = STEPS.map(([k, t]) => `<img alt="Aperçu : ${t}" src="assets/demo-${k}.webp" loading="lazy" decoding="async">`).join("");
  $("#demoSteps").onclick = e => { const b = e.target.closest(".dstep"); if (b) show(+b.dataset.i, true); };
  show(0);
}
function show(i, manual) {
  di = i;
  document.querySelectorAll(".dstep").forEach((b, k) => { b.classList.remove("on"); void b.offsetWidth; b.classList.toggle("on", k === i); });
  document.querySelectorAll("#demoImgs img").forEach((im, k) => im.classList.toggle("on", k === i));
  clearTimeout(dTimer);
  if (!reduce) dTimer = setTimeout(() => {
    if (document.getElementById("tab-home").classList.contains("active")) show((di + 1) % STEPS.length);
    else dTimer = setTimeout(() => show(di), 1000);
  }, manual ? DUR * 1.6 : DUR);
}

// ------------------------------------------------ tableau de bord personnel
function dashboard() {
  const el = $("#dash"); if (!el) return;
  const P = F.store.get("fjr_profile", null);
  const hasCv = !!(P && P.cvData && P.cvData.sections.some(s => (s.items || []).length));
  const first = (P?.name || "").split(" ")[0];
  const track = Object.values(F.S.track || {});
  const active = track.filter(t => !["Refusée", "Offre"].includes(t.status)).length;
  const relance = Object.entries(F.S.track || {}).filter(([, t]) => t.status === "Envoyée" && (Date.now() - new Date(t.updated || 0)) > 7 * 864e5);
  const fresh = jobs.filter(F.isNewForMe);
  const scored = hasCv ? jobs.map(j => ({ j, m: F.matchScore(j) })).filter(x => x.m) : [];
  const great = scored.filter(x => x.m.score >= 75);
  let pool = (hasCv ? scored.filter(x => F.isNewForMe(x.j)) : fresh.map(j => ({ j, m: null })));
  let poolTitle = F.S.since ? "Nouvelles offres pour toi depuis ta dernière visite" : "Nouvelles offres du jour";
  if (pool.length < 3) { pool = hasCv ? scored : jobs.map(j => ({ j, m: null })); poolTitle = hasCv ? "Tes offres les plus compatibles" : "Dernières offres repérées"; }
  pool = pool.sort((a, b) => (b.m?.score || 0) - (a.m?.score || 0) || (b.j.first_seen || "").localeCompare(a.j.first_seen || "")).slice(0, 6);
  const u = F.updatedText();
  const tile = (n, l, go, cls = "") => `<button class="dtile ${cls}" data-dgo="${go}"><b>${n}</b><span>${l}</span></button>`;
  el.innerHTML = `
    <div class="dash-head">
      <div><span class="eyebrow-l">${hasCv ? "Ton tableau de bord" : "Tableau de bord"}</span><h2>${first ? `Bonjour ${F.esc(first)} 👋` : "Ce qui a bougé aujourd'hui"}</h2></div>
      <p class="upd">${u ? `<span class="upd-dot"></span>${F.esc(u.long)}` : ""}</p>
    </div>
    <div class="dtiles">
      ${tile(fresh.length, F.S.since ? "nouvelles depuis ta dernière visite" : "nouvelles aujourd'hui", "fresh", "t-new")}
      ${hasCv ? tile(great.length, "offres à plus de 75 % de match", "great", "t-good") : tile("CV", "importe-le pour voir ton match", "apply", "t-cta")}
      ${tile(active, "candidatures en cours", "track")}
      ${tile(relance.length, relance.length ? "à relancer (envoyées il y a +7 j)" : "relance à faire", "track", relance.length ? "t-warn" : "")}
    </div>
    <div class="dash-sub"><h3>${poolTitle}</h3>${hasCv ? `<span class="muted small">Classées par compatibilité avec ton CV</span>` : `<button class="btn ghost small" data-dgo="apply">Importer mon CV pour les classer →</button>`}</div>
    <div class="dcards">${pool.map(({ j, m }) => `
      <article class="dcard" data-id="${F.esc(j.id)}">
        <div class="dc-top">${F.logoHtml(j)}<div class="grow"><b>${F.esc(j.title)}</b><small>${F.esc(j.employer)} · ${F.flag(j.cc)} ${F.esc(j.city || j.location || "")}</small></div>
          ${m ? `<span class="match ${m.score >= 75 ? "hi" : m.score >= 55 ? "mid" : "lo"}">${m.score} %<small>match</small></span>` : ""}</div>
        ${m ? F.matchWhy(j) : `<div class="why"><span>${F.esc(j.seniority)}</span><span>${F.esc(F.CAT[j.category])}</span></div>`}
        <div class="dc-acts"><button class="btn small accent" data-dact="prep">Préparer ma candidature</button><button class="btn small ghost" data-dact="open">Détails</button><span class="when">${F.isNewForMe(j) ? `<span class="tag new">Nouveau</span>` : F.esc(F.rel(j.first_seen))}</span></div>
      </article>`).join("")}</div>
    ${relance.length ? `<div class="dash-sub"><h3>À relancer</h3></div><div class="drel">${relance.slice(0, 5).map(([, t]) => `<div class="drow"><b>${F.esc(t.title)}</b><small>${F.esc(t.employer)} · envoyée ${F.esc(F.rel(t.updated))}</small><a class="btn small ghost" href="${F.esc(t.url)}" target="_blank" rel="noopener">Ouvrir ↗</a></div>`).join("")}</div>` : ""}`;
}
document.addEventListener("click", e => {
  const g = e.target.closest("[data-dgo]");
  if (g) {
    const v = g.dataset.dgo;
    if (v === "fresh" || v === "great") { $("#since").value = v === "fresh" ? (F.S.since ? "visit" : "1") : ""; $("#sort").value = v === "great" || F.store.get("fjr_profile", null) ? "match" : "date"; F.applyFilters(); F.switchTab("list"); }
    else F.switchTab(v);
    return;
  }
  const c = e.target.closest(".dcard"); if (!c) return;
  const j = jobs.find(x => x.id === c.dataset.id); if (!j) return;
  if (e.target.closest("[data-dact=prep]")) F.prepare?.(j); else F.openJob(j);
});
document.addEventListener("fjr:profile", () => started && dashboard());
document.addEventListener("fjr:tab", e => { if (e.detail === "home" && started) dashboard(); });

// ------------------------------------------------ démarrage
async function start() {
  if (started || !window.FJR) return; started = true;
  F = window.FJR; jobs = F.S.data.jobs || [];
  cv = $("#radar"); ctx = cv.getContext("2d");
  stats(); dashboard(); ticker(); demo();
  await loadLand();
  resize(); requestAnimationFrame(frame);
  new ResizeObserver(() => { resize(); if (reduce) requestAnimationFrame(frame); }).observe(cv);
  if (!reduce) { floater(); setInterval(floater, 2200); }
}
document.addEventListener("fjr:data", start);
document.addEventListener("fjr:tab", e => { if (e.detail === "home" && reduce && cv) requestAnimationFrame(frame); });
if (window.FJR && window.FJR.S.data.jobs.length) start();
})();
