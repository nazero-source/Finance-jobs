/* Finance Jobs Radar — cœur du site : données, filtres, liste, fiche offre, suivi.
   Aucune donnée personnelle n'est envoyée à un serveur : profil, suivi et signalements restent dans le navigateur. */
(() => {
"use strict";

const CAT_ORDER = ["ma", "ib", "levfin", "ecmdcm", "pe", "infra", "pf"];
const CAT = { ma: "M&A / Conseil", ib: "Investment Banking", levfin: "LevFin / Acq. Finance", ecmdcm: "ECM / DCM",
  pe: "Private Equity", infra: "Infrastructure", pf: "Project Finance" };
const TEAM = { ma: "M&A", ib: "Investment Banking", levfin: "Leveraged Finance", ecmdcm: "Capital Markets",
  pe: "Private Equity", infra: "Infrastructure", pf: "Project Finance" };
const LEVELS = ["Stage", "VIE", "Graduate", "Analyst 1", "Alternance"];
const ETYPE = { bank: "Banque", boutique: "Boutique / conseil", pe: "Private equity", infra: "Infrastructure", dfi: "Institution de développement (DFI)", am: "Gestion d'actifs" };
const STATUSES = ["À postuler", "Envoyée", "Entretien", "Offre", "Refusée"];
const REPO = "nazero-source/Finance-jobs";
const ASSISTANT = "https://claude.ai/artifact/6uMV13yHifjonSU1jhK8o3";
const PAGE = 50;

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { toast("Stockage du navigateur indisponible"); } },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2600); }
const catColor = c => getComputedStyle(document.documentElement).getPropertyValue(`--c-${c}`).trim() || "#2a78d6";
const fmtDate = iso => { if (!iso) return ""; const [y, m, d] = iso.slice(0, 10).split("-"); return `${d}/${m}/${y}`; };
const daysAgo = iso => iso ? Math.floor((Date.now() - new Date(iso.slice(0, 10) + "T00:00:00Z")) / 864e5) : 9999;
const rel = iso => { const d = daysAgo(iso); return d <= 0 ? "aujourd'hui" : d === 1 ? "hier" : d < 30 ? `il y a ${d} j` : d < 365 ? `il y a ${Math.round(d / 30)} mois` : fmtDate(iso); };
const flag = cc => cc && cc.length === 2 ? String.fromCodePoint(...[...cc.toUpperCase()].map(c => 127397 + c.charCodeAt())) : "🌐";
const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
const initials = n => n.replace(/[^A-Za-z0-9 &]/g, "").split(/\s+/).filter(w => w && w !== "&").slice(0, 2).map(w => w[0]).join("").toUpperCase();
function logoHtml(j) {
  const ini = esc(initials(j.employer));
  if (!j.domain) return `<div class="logo">${ini}</div>`;
  return `<div class="logo"><img loading="lazy" alt="" src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(j.domain)}&sz=64" onerror="this.replaceWith(document.createTextNode('${ini}'))"></div>`;
}

const ZONES = [["", "Monde"], ["noUS", "Hors États-Unis"], ["EU", "Europe"], ["FR", "France"], ["GB", "Royaume-Uni"], ["MEA", "Moyen-Orient & Afrique"], ["APAC", "Asie-Pacifique"], ["AM", "Amériques"]];
function inZone(j, z) {
  if (!z) return true;
  if (z === "noUS") return j.cc !== "US";
  if (z === "EU") return j.region === "Europe";
  if (z === "MEA") return j.region === "Moyen-Orient & Afrique";
  if (z === "APAC") return j.region === "Asie-Pacifique";
  if (z === "AM") return j.region === "Amérique du Nord" || j.region === "Amérique latine";
  return j.cc === z;
}
const S = { data: { jobs: [] }, filtered: [], shown: PAGE, cats: new Set(), level: "", zone: "", region: "",
  track: store.get("fjr_track", {}), reported: new Set(store.get("fjr_reported", [])), today: "", firstRun: "" };
window.FJR = { S, CAT, CAT_ORDER, TEAM, LEVELS, ETYPE, $, $$, esc, store, toast, catColor, flag, logoHtml, rel, fmtDate, norm, openJob, switchTab, applyFilters: apply, setFilter };

// ---------------------------------------------------------------- thème
$("#themeBtn").onclick = () => {
  const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = dark ? "light" : "dark";
  store.set("fjr_theme", document.documentElement.dataset.theme); localStorage.setItem("fjr_theme", document.documentElement.dataset.theme);
  document.dispatchEvent(new CustomEvent("fjr:theme"));
  renderChips();
};

// les ancres #targets / #about désignent un onglet, pas un bloc : on évite le saut du navigateur
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
addEventListener("load", () => setTimeout(() => scrollTo(0, 0), 0));
// ---------------------------------------------------------------- chargement
fetch("data/jobs.json", { cache: "no-cache" }).then(r => r.json()).then(d => {
  S.data = d;
  S.today = d.jobs.reduce((m, j) => j.first_seen > m ? j.first_seen : m, "");
  S.firstRun = d.jobs.reduce((m, j) => j.first_seen < m ? j.first_seen : m, "9999");
  S.firstDay = S.today === S.firstRun;
  // dernière visite : les offres apparues depuis sont « nouvelles pour toi »
  const v = store.get("fjr_visit", {}), now = new Date().toISOString().slice(0, 10);
  if (v.last !== now) { v.prev = v.last || null; v.last = now; store.set("fjr_visit", v); }
  S.since = v.prev || null;
  S.generated = new Date(d.generated.replace("Z", ":00Z"));
  renderUpdated();
  setInterval(renderUpdated, 60000);
  buildFilters(); restoreFilters(); apply(); renderBoard(); renderAbout(); loadTargets();
  document.dispatchEvent(new CustomEvent("fjr:data"));
  const hash = location.hash.slice(1); if (["home", "list", "map", "apply", "targets", "contacts", "track", "about"].includes(hash)) switchTab(hash);
}).catch(e => { $("#list").innerHTML = `<p class="empty">Impossible de charger les offres (${esc(e.message)}).</p>`; });

// ---------------------------------------------------------------- fraîcheur des données
function nextRun() {   // le robot tourne chaque jour à 04:17 UTC
  const n = new Date(); const t = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 4, 17));
  if (t <= n) t.setUTCDate(t.getUTCDate() + 1); return t;
}
function ago(d) {
  const m = Math.max(0, Math.round((Date.now() - d) / 60000));
  return m < 1 ? "à l'instant" : m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : `il y a ${Math.round(m / 1440)} j`;
}
function updatedText() {
  if (!S.generated) return "";
  const nx = nextRun(), tomorrow = nx.getDate() !== new Date().getDate();
  return { short: `Mis à jour ${ago(S.generated)}`, long: `Offres mises à jour ${ago(S.generated)} (${S.generated.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} à ${S.generated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}) · prochaine mise à jour ${tomorrow ? "demain" : "aujourd'hui"} vers ${nx.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` };
}
function renderUpdated() {
  const u = updatedText(); if (!u) return;
  const stale = Date.now() - S.generated > 30 * 3600e3;
  $("#meta").innerHTML = `<span class="upd-dot ${stale ? "stale" : ""}"></span>${S.data.jobs.length} offres · ${esc(u.short)}`;
  $("#meta").title = u.long;
  $$(".upd").forEach(el => { el.classList.toggle("stale", stale); el.innerHTML = `<span class="upd-dot"></span>${esc(u.long)}`; });
}
const isNewForMe = j => S.since ? j.first_seen > S.since : (!S.firstDay && j.first_seen === S.today);
function matchWhy(j) {
  const m = matchScore(j); if (!m) return "";
  const P = Object.fromEntries(m.parts.map(p => [p[0], p]));
  const out = [];
  const k = P["Compétences et mots-clés"]; if (k) { const n = (k[3].match(/^(\d+)\/(\d+)/) || []); out.push([k[1] >= .7 ? "ok" : k[1] >= .45 ? "mid" : "ko", n[0] ? `${n[1]}/${n[2]} mots-clés` : "mots-clés : estimation"]); }
  const c = P["Expérience dans le métier"]; if (c) out.push([c[1] >= .7 ? "ok" : c[1] >= .3 ? "mid" : "ko", c[1] >= .3 ? `expérience ${CAT[j.category]}` : `peu d'expérience ${CAT[j.category]}`]);
  const l = P["Langues"]; if (l && l[1] < 1) out.push(["ko", l[3]]);
  const w = P["Droit de travailler sur place"]; if (w) out.push([w[1] >= .9 ? "ok" : w[1] >= .5 ? "mid" : "ko", w[1] >= .9 ? (j.contract === "VIE" ? "VIE : visa géré" : "pas de visa") : w[1] >= .5 ? "visa à prévoir" : "pas de parrainage visa"]);
  const a = P["Disponibilité"]; if (a) out.push([a[1] >= 1 ? "ok" : "ko", a[1] >= 1 ? "dates compatibles" : "début trop tôt"]);
  return `<div class="why">${out.map(([c, t]) => `<span class="w-${c}">${c === "ok" ? "✓" : c === "mid" ? "~" : "✕"} ${esc(t)}</span>`).join("")}</div>`;
}

// ---------------------------------------------------------------- filtres
function counts(key, jobs = S.data.jobs) { return jobs.reduce((m, j) => (m[j[key]] = (m[j[key]] || 0) + 1, m), {}); }
function baseFiltered(skip) {
  // offres filtrées par tout SAUF le critère `skip` (pour afficher des compteurs utiles)
  return S.data.jobs.filter(j => match(j, skip));
}
function renderChips() {
  const base = baseFiltered("cat"), cc = counts("category", base);
  $("#catChips").innerHTML = CAT_ORDER.map(c =>
    `<button class="chip ${S.cats.has(c) ? "on" : ""}" data-cat="${c}" aria-pressed="${S.cats.has(c)}"><span class="dot" style="background:${catColor(c)}"></span>${esc(CAT[c])}<span class="n">${cc[c] || 0}</span></button>`).join("");
  const zb = baseFiltered("zone");
  $("#zoneSeg").innerHTML = ZONES.map(([z, l]) => `<button class="${S.zone === z ? "on" : ""}" data-zone="${z}">${l}<span class="n">${zb.filter(j => inZone(j, z)).length}</span></button>`).join("");
  const lb = baseFiltered("level"), lc = counts("seniority", lb);
  $("#levelSeg").innerHTML = `<button class="${S.level ? "" : "on"}" data-level="">Tous<span class="n">${lb.length}</span></button>` +
    LEVELS.filter(l => lc[l] || S.level === l).map(l => `<button class="${S.level === l ? "on" : ""}" data-level="${l}">${l}<span class="n">${lc[l] || 0}</span></button>`).join("");
}
function buildFilters() {
  const opts = (sel, vals) => $(sel).insertAdjacentHTML("beforeend", vals.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join(""));
  const uniq = key => Object.entries(counts(key)).filter(([k]) => k && k !== "undefined").sort((a, b) => a[0].localeCompare(b[0]));
  opts("#region", uniq("region").map(([k, n]) => [k, `${k} (${n})`]));
  opts("#country", uniq("country").map(([k, n]) => [k, `${k} (${n})`]));
  opts("#employer", uniq("employer").map(([k, n]) => [k, `${k} (${n})`]));
  opts("#etype", uniq("employer_type").map(([k, n]) => [k, `${ETYPE[k] || k} (${n})`]));
  $("#catChips").onclick = e => { const b = e.target.closest(".chip"); if (!b) return; S.cats.has(b.dataset.cat) ? S.cats.delete(b.dataset.cat) : S.cats.add(b.dataset.cat); apply(); };
  $("#levelSeg").onclick = e => { const b = e.target.closest("button"); if (!b) return; S.level = b.dataset.level; apply(); };
  $("#zoneSeg").onclick = e => { const b = e.target.closest("button"); if (!b) return; S.zone = b.dataset.zone; apply(); };
  ["#region", "#country", "#employer", "#etype", "#since", "#sort", "#hideReported"].forEach(s => $(s).addEventListener("change", () => { if (s === "#region") S.region = $("#region").value; apply(); }));
  let t; $("#q").addEventListener("input", () => { clearTimeout(t); t = setTimeout(apply, 120); });
  $("#moreFilters").onclick = () => { const m = $("#fbMore"); m.hidden = !m.hidden; $("#moreFilters").setAttribute("aria-expanded", !m.hidden); };
  $("#freshBtn").onclick = () => {
    const on = $("#since").value === "visit" || ($("#since").value === "1" && !S.since);
    $("#since").value = on ? "" : (S.since ? "visit" : "1");
    if (!on && profileInfo().ok) $("#sort").value = "match";
    apply(); toast(on ? "Toutes les offres" : S.since ? "Offres apparues depuis ta dernière visite" : "Offres apparues aujourd'hui");
  };
  $("#reset").onclick = () => { S.cats.clear(); S.level = ""; S.zone = ""; S.region = ""; ["#q", "#region", "#country", "#employer", "#etype", "#since"].forEach(s => $(s).value = ""); apply(); };
}
function setFilter(key, val) {
  if (key === "country") { $("#country").value = val; }
  if (key === "employer") { $("#employer").value = val; }
  if (key === "region") { $("#region").value = val; S.region = val; }
  if (key === "city") { $("#q").value = val; }
  if (key === "cat") { S.cats = new Set(val ? [val] : []); }
  if (key === "level") { S.level = val; }
  apply();
}
function saveFilters() {
  store.set("fjr_filters2", { cats: [...S.cats], level: S.level, zone: S.zone, region: $("#region").value, country: $("#country").value,
    employer: $("#employer").value, etype: $("#etype").value, since: $("#since").value, sort: $("#sort").value });
}
function restoreFilters() {
  const f = store.get("fjr_filters2", null); if (!f) return;
  f.cats.forEach(c => S.cats.add(c)); S.level = f.level || ""; S.zone = f.zone ?? "";
  for (const k of ["region", "country", "employer", "etype", "since", "sort"]) if (f[k] && [...$("#" + k).options].some(o => o.value === f[k])) $("#" + k).value = f[k];
  S.region = $("#region").value;
}
function match(j, skip) {
  const q = norm($("#q").value.trim());
  if (skip !== "cat" && S.cats.size && !S.cats.has(j.category)) return false;
  if (skip !== "level" && S.level && j.seniority !== S.level) return false;
  if (skip !== "zone" && !inZone(j, S.zone)) return false;
  const region = $("#region").value, country = $("#country").value, emp = $("#employer").value, et = $("#etype").value, sinceV = $("#since").value, since = +sinceV || 0;
  if (region && j.region !== region) return false;
  if (country && j.country !== country) return false;
  if (emp && j.employer !== emp) return false;
  if (et && j.employer_type !== et) return false;
  if (sinceV === "visit" && !isNewForMe(j)) return false;
  if (since) { const d = since === 1 ? daysAgo(j.first_seen) : daysAgo(j.posted || j.first_seen); if (d > (since === 1 ? 0 : since)) return false; }
  if ($("#hideReported").checked && S.reported.has(j.id)) return false;
  if (q) { const hay = norm(`${j.title} ${j.employer} ${j.city} ${j.country} ${j.location} ${CAT[j.category]} ${j.seniority}`); if (!q.split(/\s+/).every(w => hay.includes(w))) return false; }
  return true;
}
const dateKey = j => j.posted || (j.first_seen > S.firstRun ? j.first_seen : "");
const salKey = j => { const m = (j.salary?.text || "").match(/≈ ([\d ]+)[–-]?([\d ]*) ?k€/); if (m) return +m[1].replace(/\s/g, "") * 1000; const e = (j.salary?.text || "").match(/≈ ([\d ]+)[–-]([\d ]+) €/); return e ? +e[1].replace(/\s/g, "") * 12 : 0; };
function apply() {
  S.filtered = S.data.jobs.filter(j => match(j));
  const s = $("#sort").value;
  S.filtered.sort(s === "employer" ? (a, b) => a.employer.localeCompare(b.employer) || dateKey(b).localeCompare(dateKey(a))
    : s === "country" ? (a, b) => (a.country || "~").localeCompare(b.country || "~") || dateKey(b).localeCompare(dateKey(a))
    : s === "salary" ? (a, b) => salKey(b) - salKey(a)
    : s === "match" ? (a, b) => (matchScore(b)?.score ?? -1) - (matchScore(a)?.score ?? -1) || dateKey(b).localeCompare(dateKey(a))
    : (a, b) => dateKey(b).localeCompare(dateKey(a)));
  if ((s === "date" || !s) && !S.zone) {
    // à date égale, on alterne États-Unis et reste du monde pour équilibrer le haut de la liste
    const us = S.filtered.filter(j => j.cc === "US"), rest = S.filtered.filter(j => j.cc !== "US"), mix = [];
    let i = 0, k = 0;
    while (i < us.length || k < rest.length) {
      if (k < rest.length) mix.push(rest[k++]);
      if (k < rest.length) mix.push(rest[k++]);
      if (i < us.length) mix.push(us[i++]);
    }
    S.filtered = mix;
  }
  const nf = S.cats.size + (S.level ? 1 : 0) + (S.zone ? 1 : 0) + ["#region", "#country", "#employer", "#etype", "#since"].filter(x => $(x).value).length;
  $("#activeCount").textContent = ["#region", "#country", "#employer", "#etype", "#since"].filter(x => $(x).value).length || "";
  $("#count").textContent = `${S.filtered.length} résultat${S.filtered.length > 1 ? "s" : ""}${nf ? " · filtres actifs" : ""}`;
  $("#freshBtn")?.classList.toggle("on", $("#since").value === "visit" || $("#since").value === "1");
  S.shown = PAGE; saveFilters(); renderChips(); renderKpis(); renderList();
  document.dispatchEvent(new CustomEvent("fjr:filtered"));
}

// ---------------------------------------------------------------- KPIs & liste
function renderKpis() {
  const f = S.filtered, c = counts("seniority", f);
  const fresh = f.filter(isNewForMe).length;
  const tiles = [["", f.length, "offres"], ["Stage", c.Stage || 0, "stages"], ["VIE", c.VIE || 0, "VIE"],
    ["Graduate", (c.Graduate || 0), "graduate"], ["Analyst 1", c["Analyst 1"] || 0, "analyst 1re année"]];
  $("#kpis").innerHTML = tiles.map(([lv, n, l]) => `<button class="kpi ${S.level === lv && lv ? "on" : ""}" data-level="${lv}"><b>${n}</b><span>${l}${lv === "" && fresh ? ` · <span style="color:var(--good);font-weight:600">${fresh} nouvelle${fresh > 1 ? "s" : ""}${S.since ? " depuis ta dernière visite" : ""}</span>` : ""}</span></button>`).join("");
  $("#kpis").onclick = e => { const k = e.target.closest(".kpi"); if (k) { S.level = S.level === k.dataset.level ? "" : k.dataset.level; apply(); } };
}
// ---------------------------------------------------------------- score de correspondance CV ↔ offre
const CAT_SIGNALS = { ma: "m&a|merger|acquisition|valuation|dcf|sell-side|buy-side|transaction|advisory|due diligence",
  ib: "investment bank|pitch|capital markets|advisory|transaction|valuation", levfin: "lbo|leverage|debt|financing|credit|debt sizing",
  ecmdcm: "capital markets|ipo|bond|equity|debt", pe: "private equity|lbo|buy-?out|add-on|investment|portfolio|due diligence|family office",
  infra: "infrastructure|energy|renewable|solar|wind|transmission|transport|greenfield|brownfield|epc|bot|concession",
  pf: "project finance|debt sizing|dscr|financing structure|renewable|epc|bot|concession|biogas" };
const LANGS = { French: "french|français|francophone", German: "german|allemand|deutsch", Spanish: "spanish|espagnol|español",
  Portuguese: "portuguese|portugais", Italian: "italian|italien", Arabic: "arabic|arabe", Mandarin: "mandarin|chinese|chinois",
  Dutch: "dutch|néerlandais", Swedish: "swedish|suédois", Japanese: "japanese|japonais", Korean: "korean|coréen", Polish: "polish|polonais" };
const MONTHS = { jan: 1, janv: 1, january: 1, janvier: 1, feb: 2, february: 2, fevrier: 2, février: 2, mar: 3, march: 3, mars: 3, apr: 4, april: 4, avril: 4,
  may: 5, mai: 5, jun: 6, june: 6, juin: 6, jul: 7, july: 7, juillet: 7, aug: 8, august: 8, aout: 8, août: 8, sep: 9, sept: 9, september: 9, septembre: 9,
  oct: 10, october: 10, octobre: 10, nov: 11, november: 11, novembre: 11, dec: 12, december: 12, decembre: 12, décembre: 12,
  summer: 6, été: 6, spring: 4, printemps: 4, autumn: 9, fall: 9, automne: 9, winter: 1, hiver: 1, q1: 1, q2: 4, q3: 7, q4: 10 };
let PROFILE_CACHE = null;
function profileInfo() {
  if (PROFILE_CACHE) return PROFILE_CACHE;
  const p = store.get("fjr_profile", null);
  if (!p) return (PROFILE_CACHE = { ok: false });
  const c = p.cvData || { sections: [] };
  const text = (c.sections || []).map(s => (s.items || []).map(i => [i.org, i.orgDesc, i.role, ...(i.bullets || [])].join(" ")).join(" ") + " " + (s.lines || []).map(l => l.label + " " + l.text).join(" ")).join(" ") + " " + (p.cv || "");
  const langLine = ((c.sections || []).flatMap(s => s.lines || []).find(l => /language|langue/i.test(l.label)) || {}).text || text;
  const langs = Object.keys(LANGS).filter(L => new RegExp(LANGS[L], "i").test(langLine)).concat(["English"]);
  let avail = null;
  if (p.available) { const [y, m] = p.available.split("-").map(Number); avail = y * 12 + m; }
  return (PROFILE_CACHE = { ok: text.trim().length > 200, text, langs, avail });
}
document.addEventListener("fjr:profile", () => { PROFILE_CACHE = null; SCORES.clear(); apply(); });
const SCORES = new Map();
const kwRx = re => new RegExp(`(?<![a-z])(?:${re})(?![a-z])`, "i");
function offerStart(j) {
  const t = `${j.title} ${(j.desc || "").slice(0, 2500)}`.toLowerCase();
  const m = t.match(/\b(jan(?:uary|vier|v)?|feb(?:ruary)?|f[eé]vrier|mar(?:ch|s)?|apr(?:il)?|avril|may|mai|june?|juin|july?|juillet|aug(?:ust)?|ao[uû]t|sept?(?:ember|embre)?|oct(?:ober|obre)?|nov(?:ember|embre)?|dec(?:ember)?|d[eé]cembre|summer|[eé]t[eé]|spring|printemps|autumn|fall|automne|winter|hiver|q[1-4])\.?\s*(20[2-3]\d)\b/);
  if (!m) return null;
  const mo = MONTHS[m[1].replace(/\.$/, "")] || MONTHS[m[1].slice(0, 3)] || 1;
  return +m[2] * 12 + mo;
}
function matchScore(j) {
  const P = profileInfo(); if (!P.ok) return null;
  if (SCORES.has(j.id)) return SCORES.get(j.id);
  const offer = `${j.title}\n${j.desc || ""}`;
  const parts = [];
  // 1. mots-clés de l'offre présents dans le CV
  const kws = FIN_KEYWORDS.filter(([, re]) => kwRx(re).test(offer));
  const okK = kws.filter(([, re]) => kwRx(re).test(P.text));
  // peu de mots-clés = information faible : on ramène vers 50 %
  const conf = Math.min(1, kws.length / 8);
  const kwScore = kws.length ? (okK.length / kws.length) * conf + 0.5 * (1 - conf) : 0.5;
  parts.push(["Compétences et mots-clés", kwScore, 35, kws.length ? `${okK.length}/${kws.length} mots-clés de l'offre dans ton CV${kws.length < 5 ? " (description courte)" : ""}` : "description trop courte : estimation neutre"]);
  // 2. expérience dans le métier de l'offre
  const hits = (P.text.match(new RegExp(CAT_SIGNALS[j.category] || "finance", "gi")) || []).length;
  const catScore = Math.min(1, hits / 7);
  parts.push(["Expérience dans le métier", catScore, 20, `${hits} signal${hits > 1 ? "s" : ""} « ${CAT[j.category]} » dans ton CV`]);
  // 3. niveau du poste
  const lv = { Stage: 1, VIE: 1, Graduate: 1, "Analyst 1": 0.85, Alternance: 0.35 }[j.seniority] ?? 0.7;
  parts.push(["Niveau du poste", lv, 10, j.seniority]);
  // 4. langues exigées
  const need = Object.keys(LANGS).filter(L => new RegExp(`(?:fluent|fluency|native|proficien\\w*|business[- ]level|courant|bilingue?|maîtrise|speaking|speaker)[^.\\n]{0,40}(?:${LANGS[L]})|(?:${LANGS[L]})[^.\\n]{0,25}(?:required|essential|mandatory|fluent|courant|exigé|indispensable|native)`, "i").test(offer));
  const missing = need.filter(L => !P.langs.includes(L));
  parts.push(["Langues", missing.length ? 0 : 1, 15, missing.length ? `exige : ${missing.join(", ")}` : need.length ? `exigées : ${need.join(", ")} ✓` : "aucune langue particulière exigée"]);
  // 5. droit de travailler dans le pays (citoyen de l'UE)
  const EU = "FR DE NL BE LU IT ES PT IE AT SE DK FI PL CZ HU RO GR SK SI HR BG EE LV LT CY MT CH NO IS".split(" ");
  const noSponsor = /(not|unable to|cannot|won't|will not|no)\s+(?:\w+\s+){0,3}(sponsor|sponsorship)|without (?:the need for )?(?:visa )?sponsorship|must (?:be (?:legally )?)?(?:authori[sz]ed|eligible) to work|right to work in the (?:uk|united kingdom)|(?:us|u\.s\.) citizens?(?:hip)? (?:or|and) (?:permanent|green)|security clearance/i.test(offer);
  let wa, waWhy;
  if (EU.includes(j.cc)) { wa = 1; waWhy = "pays de l'UE / AELE : pas de visa nécessaire"; }
  else if (j.contract === "VIE") { wa = 1; waWhy = "VIE : visa géré par Business France"; }
  else if (noSponsor) { wa = 0.1; waWhy = "l'offre exclut le parrainage de visa ou exige un droit de travail local"; }
  else if (["US", "GB", "CA", "AU", "SG", "HK", "JP", "CN", "AE", "SA"].includes(j.cc)) { wa = 0.55; waWhy = "visa ou permis de travail probablement nécessaire"; }
  else { wa = 0.7; waWhy = "à vérifier selon le pays"; }
  parts.push(["Droit de travailler sur place", wa, 15, waWhy]);
  // 6. disponibilité
  const st = offerStart(j);
  if (P.avail && st) {
    const gap = st - P.avail;
    const a = gap >= 0 ? 1 : gap >= -2 ? 0.5 : 0;
    parts.push(["Disponibilité", a, 10, gap >= 0 ? "date de début compatible" : `début avant ta disponibilité (${-gap} mois)`]);
  }
  const W = parts.reduce((x, p) => x + p[2], 0);
  const score = Math.round(100 * parts.reduce((x, p) => x + p[1] * p[2], 0) / W);
  const res = { score, parts };
  SCORES.set(j.id, res);
  return res;
}
function matchHtml(j) {
  const m = matchScore(j); if (!m) return "";
  const cls = m.score >= 75 ? "hi" : m.score >= 55 ? "mid" : "lo";
  return `<span class="match ${cls}" title="Correspondance entre ton CV et l'offre">${m.score} %<small>match</small></span>`;
}
window.FJR.matchScore = matchScore;
Object.assign(window.FJR, { isNewForMe, matchWhy, updatedText, toggleTrack: (j, st) => toggleTrack(j, st) });

function verifHtml(j) {
  if (j.verified === "site carrière") return `<span class="verified" title="Offre retrouvée sur le site carrière de l'employeur : le lien mène directement à la candidature">✔ lien direct</span>`;
  if (j.verified === "") return `<span class="unverified" title="Offre trouvée via un agrégateur, absente des sites carrière lisibles par le robot : vérifie qu'elle est toujours ouverte avant de postuler">via agrégateur</span>`;
  return "";
}
function salaryHtml(s) {
  if (!s) return "";
  const main = s.text.replace(/\s*\(≈.*\)$/, "");
  return `<span class="sal" title="${esc(s.text)} — ${s.estimated ? "estimation : " + esc(s.basis || "") : "salaire indiqué dans l'annonce"}">${esc(main)} ${s.estimated ? `<span class="est">est.</span>` : `<span class="ann">annoncé</span>`}</span>`;
}
function jobCard(j) {
  const tracked = !!S.track[j.id];
  const isNew = isNewForMe(j);
  return `<article class="job ${S.reported.has(j.id) ? "reported" : ""} ${isNew ? "is-new" : ""}" data-id="${j.id}" tabindex="0" style="--cc:${catColor(j.category)}">
    ${logoHtml(j)}
    <div><h3>${esc(j.title)}</h3><div class="sub"><b>${esc(j.employer)}</b> · ${flag(j.cc)} ${esc(j.city || j.location || "—")}${j.country && j.city ? ", " + esc(j.country) : ""}</div></div>
    <div class="right"><span class="when">${j.posted ? rel(j.posted) : "repérée " + rel(j.first_seen)}</span>${verifHtml(j)}</div>
    <div class="tags">
      ${matchHtml(j)}
      <span class="tag level">${esc(j.seniority)}</span>
      <span class="tag"><span class="dot" style="background:${catColor(j.category)}"></span>${esc(CAT[j.category])}</span>
      ${isNew ? `<span class="tag new">${S.since ? "Nouveau pour toi" : "Nouveau"}</span>` : ""}
      ${salaryHtml(j.salary)}
    </div>
    ${matchWhy(j)}
    <div class="acts">
      <a class="btn small" href="${esc(j.url)}" target="_blank" rel="noopener" data-stop>Postuler ↗</a>
      <button class="btn ghost small" data-act="prep">Préparer CV & lettre</button>
      <button class="star ${tracked ? "on" : ""}" data-act="star">${tracked ? "★ " + esc(S.track[j.id].status) : "☆ Suivre"}</button>
    </div>
  </article>`;
}
function renderList() {
  const el = $("#list");
  $("#listTitle").textContent = S.cats.size === 1 ? CAT[[...S.cats][0]] : S.level ? S.level : "Offres";
  if (!S.filtered.length) { el.innerHTML = `<p class="empty">Aucune offre ne correspond à ces filtres.</p>`; $("#more").hidden = true; return; }
  el.innerHTML = S.filtered.slice(0, S.shown).map(jobCard).join("");
  $("#more").hidden = S.shown >= S.filtered.length;
  $("#more").textContent = `Afficher plus (${S.filtered.length - S.shown} restantes)`;
}
$("#more").onclick = () => { S.shown += PAGE; renderList(); };
$("#list").addEventListener("click", e => {
  const card = e.target.closest(".job"); if (!card || e.target.closest("[data-stop]")) return;
  const j = S.data.jobs.find(x => x.id === card.dataset.id);
  const act = e.target.closest("[data-act]")?.dataset.act;
  if (act === "prep") { window.FJR.prepare?.(j); return; }
  if (act === "star") { toggleTrack(j); return; }
  openJob(j);
});
$("#list").addEventListener("keydown", e => { if (e.key === "Enter" && e.target.classList.contains("job")) openJob(S.data.jobs.find(x => x.id === e.target.dataset.id)); });

function toggleTrack(j, status) {
  if (S.track[j.id] && !status) delete S.track[j.id];
  else S.track[j.id] = { ...(S.track[j.id] || {}), status: status || "À postuler", updated: new Date().toISOString().slice(0, 10),
    title: j.title, employer: j.employer, url: j.url, city: j.city || j.location, domain: j.domain, note: S.track[j.id]?.note || "" };
  store.set("fjr_track", S.track); renderBoard(); renderList();
  toast(S.track[j.id] ? `Ajoutée au suivi : ${S.track[j.id].status}` : "Retirée du suivi");
}

// ---------------------------------------------------------------- fiche offre (tiroir)
const li = kw => `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(kw)}`;
const gx = q => `https://www.google.com/search?q=${encodeURIComponent(q)}`;
const shortEmp = e => e.replace(/\b(Group|Capital Markets|Partners|Company|& Co\.?|LLC|Inc\.?|SAS|AG|GmbH)\b/gi, "").replace(/\s+/g, " ").trim() || e;
function jobContext(j) {
  return `Poste : ${j.title}\nEmployeur : ${j.employer}\nLieu : ${[j.city, j.country].filter(Boolean).join(", ") || j.location}\nType : ${j.seniority} · ${CAT[j.category]}\nLien : ${j.url}\n\nDescription :\n${(j.desc || "").slice(0, 3000)}`;
}
async function askClaude(j, mode = "chat") {
  try { await navigator.clipboard.writeText(jobContext(j)); toast(mode === "letter" ? "Offre copiée : dans l'assistant, colle-la (Ctrl/Cmd + V) puis « Rédiger la lettre »" : "Offre copiée : colle-la dans l'assistant Claude (Ctrl/Cmd + V)"); }
  catch { toast("Ouvre l'assistant puis colle l'offre"); }
  window.open(ASSISTANT + "#" + mode, "_blank", "noopener");
}
window.FJR.askClaude = askClaude;
function openJob(j) {
  if (!j) return;
  const p = store.get("fjr_profile", {});
  const team = TEAM[j.category], city = j.city || "", emp = shortEmp(j.employer);
  const junior = j.seniority === "Stage" || j.seniority === "VIE" ? "intern OR analyst" : "analyst OR associate";
  const contacts = [];
  (j.recruiters || []).forEach(r => contacts.push(["👤", r, "cité dans l'annonce", null]));
  (j.emails || []).forEach(e => contacts.push(["✉️", e, "cité dans l'annonce", "mailto:" + e]));
  contacts.push(["🔎", `Recruteurs / campus recruiting · ${emp}`, "Google · profils LinkedIn publics", gx(`site:linkedin.com/in "${emp}" (recruiter OR "talent acquisition" OR "campus recruiting")${city ? ` "${city}"` : ""}`)]);
  contacts.push(["🔎", `Équipe ${team} · ${emp}${city ? " · " + city : ""}`, "Google · analysts / associates, les plus réceptifs", gx(`site:linkedin.com/in "${emp}" "${team}" (${junior})${city ? ` "${city}"` : ""}`)]);
  if (p.school) contacts.push(["🎓", `Anciens de ${p.school} chez ${emp}`, "Google · profils LinkedIn publics", gx(`site:linkedin.com/in "${emp}" "${p.school}"`)]);
  contacts.push(["🏢", `Page « équipe » du site de ${emp}`, "les boutiques et les fonds y listent souvent tout le monde", gx(`"${emp}" ${team} team ${city}`.trim())]);
  contacts.push(["in", `Recherche LinkedIn · ${emp} ${team}`, "nécessite d'être connecté à LinkedIn", li(`${emp} ${team}`)]);
  const st = S.track[j.id]?.status || "";
  $("#drawer").innerHTML = `
    <div class="drawer-head"><div style="display:flex;gap:.8rem;align-items:flex-start">${logoHtml(j)}<div><h2>${esc(j.title)}</h2><div class="muted">${esc(j.employer)} · ${flag(j.cc)} ${esc(j.city || j.location)}${j.country ? ", " + esc(j.country) : ""}</div></div></div>
      <button class="icon-btn" data-close aria-label="Fermer">✕</button></div>
    <div class="drawer-body">
      <div class="actions" style="margin:0">
        <a class="btn accent" href="${esc(j.url)}" target="_blank" rel="noopener">Voir et postuler ↗</a>
        ${j.verified === "" ? `<a class="btn ghost" href="https://www.google.com/search?q=${encodeURIComponent(`"${j.employer}" ${j.title} careers`)}" target="_blank" rel="noopener">Chercher sur le site de l'employeur ↗</a>` : ""}
        <button class="btn ghost" data-act="prep">Préparer CV & lettre</button>
        <button class="btn ghost" data-act="letter">✦ Lettre de motivation par Claude</button>
        <select data-act="status" aria-label="Statut de suivi"><option value="">Suivi : aucun</option>${STATUSES.map(s => `<option ${s === st ? "selected" : ""}>${s}</option>`).join("")}</select>
      </div>
      ${(() => { const m = matchScore(j); if (!m) return `<div class="fact" style="background:var(--accent-soft)"><span>Score de correspondance</span><b>Importe ton CV (onglet Candidature → Mon CV) pour voir ton score sur chaque offre</b></div>`;
        return `<div class="matchbox"><div class="mb-head"><b class="match ${m.score >= 75 ? "hi" : m.score >= 55 ? "mid" : "lo"}">${m.score} %</b><span>de correspondance avec ton CV</span></div>
        ${m.parts.map(([l, v, w, why]) => `<div class="mb-row"><span>${esc(l)}</span><span class="mb-bar"><span style="width:${Math.round(v * 100)}%"></span></span><small>${esc(why)}</small></div>`).join("")}</div>`; })()}
      <div class="facts">
        <div class="fact"><span>Type de poste</span><b>${esc(j.seniority)}</b></div>
        <div class="fact"><span>Métier</span><b><span class="dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${catColor(j.category)};margin-right:.35rem"></span>${esc(CAT[j.category])}</b></div>
        <div class="fact"><span>${j.posted ? "Publiée le" : "Repérée le"}</span><b>${fmtDate(j.posted || j.first_seen)}</b></div>
        <div class="fact"><span>Employeur</span><b>${esc(ETYPE[j.employer_type] || "")}</b></div>
        <div class="fact" style="grid-column:1/-1"><span>Salaire ${j.salary?.estimated ? "estimé" : "annoncé"}</span><b>${esc(j.salary?.text || "Non communiqué")}</b>${j.salary?.estimated ? `<span style="margin-top:.2rem">Base : ${esc(j.salary.basis || "")} · fixe, hors bonus</span>` : ""}</div>
      </div>
      <div><h3>Personnes à contacter</h3>
        <button class="contact" data-act="claude" style="width:100%;text-align:left;cursor:pointer;background:var(--accent-soft);border-color:transparent;font:inherit"><span class="ico">✦</span><span><b>Demander à Claude qui contacter et comment</b><small>profils clés, recherches prêtes à ouvrir, message LinkedIn — avec ton compte Claude</small></span></button>
        <div class="contacts" style="margin-top:.4rem">${contacts.map(([i, t, s, h]) =>
        `${h ? `<a class="contact" href="${esc(h)}" target="_blank" rel="noopener">` : `<div class="contact">`}<span class="ico">${i}</span><span>${esc(t)}<small>${esc(s)}</small></span>${h ? "</a>" : "</div>"}`).join("")}</div></div>
      <div><h3>Description <span class="muted small">(extrait · ${esc(j.source)})</span></h3><div class="desc">${esc(j.desc || "Description non disponible : voir l'offre.")}</div></div>
      <button class="btn ghost small" data-act="report" style="justify-self:start">${S.reported.has(j.id) ? "Annuler le signalement" : "Signaler : hors sujet / pas junior"}</button>
    </div>`;
  const d = $("#drawer");
  d.onclick = e => {
    const a = e.target.closest("[data-act]")?.dataset.act;
    if (e.target.closest("[data-close]")) closeDrawers();
    if (a === "prep") { closeDrawers(); window.FJR.prepare?.(j); }
    if (a === "report") report(j);
    if (a === "claude") askClaude(j, "chat");
    if (a === "letter") askClaude(j, "letter");
  };
  $("[data-act=status]", d).onchange = e => { if (!e.target.value) { delete S.track[j.id]; store.set("fjr_track", S.track); renderBoard(); renderList(); toast("Retirée du suivi"); } else toggleTrack(j, e.target.value); };
  openDrawer(d);
}
function openDrawer(d) { $("#scrim").hidden = false; d.classList.add("open"); d.setAttribute("aria-hidden", "false"); d.focus(); }
function closeDrawers() { $$(".drawer.open").forEach(d => { d.classList.remove("open"); d.setAttribute("aria-hidden", "true"); }); $("#scrim").hidden = true; }
window.FJR.openDrawer = openDrawer; window.FJR.closeDrawers = closeDrawers;
$("#scrim").onclick = closeDrawers;
document.addEventListener("keydown", e => { if (e.key === "Escape") closeDrawers(); });
$("#profileDrawer").addEventListener("click", e => { if (e.target.closest("[data-close]")) closeDrawers(); });
function report(j) {
  if (S.reported.has(j.id)) S.reported.delete(j.id);
  else {
    S.reported.add(j.id);
    const body = `Offre signalée depuis le site :\n\n- Titre : ${j.title}\n- Employeur : ${j.employer}\n- Classée : ${CAT[j.category]} / ${j.seniority}\n- Lien : ${j.url}\n\nPourquoi : `;
    window.open(`https://github.com/${REPO}/issues/new?title=${encodeURIComponent("Signalement : " + j.title)}&body=${encodeURIComponent(body)}`, "_blank", "noopener");
    toast("Offre masquée. Tu peux aussi m'expliquer pourquoi sur GitHub (optionnel).");
  }
  store.set("fjr_reported", [...S.reported]); closeDrawers(); apply();
}

// ---------------------------------------------------------------- onglets
function switchTab(name) {
  const cur = $(".tab.active")?.id;
  const swap = () => {
    $$(".tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
    $$(".tab").forEach(t => t.classList.toggle("active", t.id === "tab-" + name));
    $("#filterbar").classList.toggle("hidden", !["list", "map"].includes(name));
  };
  const after = () => {
    if (name === "targets" && !TARGETS.length) loadTargets();
    history.replaceState(null, "", "#" + name);
    try { window.goatcounter?.count?.({ path: "/onglet/" + name, title: "Onglet " + name, event: false }); } catch {}
    document.dispatchEvent(new CustomEvent("fjr:tab", { detail: name }));
    window.scrollTo({ top: 0 });
  };
  if (document.startViewTransition && cur && cur !== "tab-" + name && !matchMedia("(prefers-reduced-motion: reduce)").matches)
    document.startViewTransition(swap).updateCallbackDone.then(after, after);
  else { swap(); after(); }
}
document.addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (b && (b.closest(".tabs") || b.classList.contains("brand"))) { e.preventDefault(); switchTab(b.dataset.tab); } });

// ---------------------------------------------------------------- cibles infra & énergie
let TARGETS = [], tZone = "";
function loadTargets() {
  fetch("data/targets.json", { cache: "no-cache" }).then(r => r.ok ? r.json() : []).then(t => { TARGETS = t; renderTargets(); }).catch(() => {});
}
function watchTag(t) {
  const w = t.watch; if (!w) return `<span class="tag watch">À surveiller</span>`;
  if (w.new) return `<span class="tag new">✦ ${w.new} nouveau${w.new > 1 ? "x" : ""} poste${w.new > 1 ? "s" : ""}${w.new_junior ? ` (${w.new_junior} junior${w.new_junior > 1 ? "s" : ""})` : ""}</span>`;
  if (w.status === "ok") return `<span class="tag auto" title="Page carrière ouverte par le robot le ${fmtDate(w.checked)}">Page vérifiée chaque jour</span>`;
  if (/dynamique/.test(w.status || "")) return `<span class="tag watch" title="Les offres de cette page sont chargées par un script que le robot ne lit pas">Page non lisible : à vérifier</span>`;
  return `<span class="tag watch" title="${esc(w.status || "")}">Site bloqué : à vérifier</span>`;
}
function watchList(t) {
  const w = t.watch; if (!w || !w.links?.length) return "";
  const wk = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  return `<details class="wlist" ${w.new ? "open" : ""}><summary>${w.count} poste${w.count > 1 ? "s" : ""} affiché${w.count > 1 ? "s" : ""} sur la page carrière</summary>
    ${w.links.slice(0, 8).map(x => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${x.first !== "initial" && x.first >= wk ? `<i class="nw">nouveau</i>` : ""}${x.junior ? `<i class="jr">junior</i>` : ""}${esc(x.title)} ↗</a>`).join("")}</details>`;
}
function renderTargets() {
  const zones = ["France", "UK", "Europe", "Dubaï", "Afrique", "DFI"];
  const inT = (t, z) => !z || (z === "DFI" ? /^DFI/.test(t.type) : z === "Dubaï" ? /Dubaï|Abu Dhabi|Bahreïn|Riyad|Arabie|Qatar|Golfe/.test(t.zone)
    : z === "Afrique" ? /Afrique|Maroc|Égypte|Nigeria|Kenya/.test(t.zone) : z === "Europe" ? /Europe|Italie|Allemagne|Espagne|Belgique|Suisse|Pays-Bas|Nordiques/.test(t.zone) : t.zone.includes(z));
  const W = t => t.watch || {};
  const hasNews = t => (W(t).new || 0) > 0, hasPosts = t => t.jobs > 0 || (W(t).count || 0) > 0;
  const inT2 = (t, z) => z === "NEW" ? hasNews(t) : z === "POSTS" ? hasPosts(t) : inT(t, z);
  const zc = z => TARGETS.filter(t => inT2(t, z)).length;
  const nNew = zc("NEW");
  $("#targetZone").innerHTML = `<button class="${tZone ? "" : "on"}" data-z="">Toutes<span class="n">${TARGETS.length}</span></button>` +
    `<button class="${tZone === "NEW" ? "on" : ""} hot" data-z="NEW">✦ Nouveautés (7 j)<span class="n">${nNew}</span></button>` +
    `<button class="${tZone === "POSTS" ? "on" : ""}" data-z="POSTS">Recrutent<span class="n">${zc("POSTS")}</span></button>` +
    zones.map(z => `<button class="${tZone === z ? "on" : ""}" data-z="${z}">${z === "DFI" ? "Institutions de développement" : z === "Dubaï" ? "Golfe" : z}<span class="n">${zc(z)}</span></button>`).join("");
  const list = TARGETS.filter(t => inT2(t, tZone))
    .sort((a, b) => (W(b).new || 0) - (W(a).new || 0) || b.jobs - a.jobs || (W(b).count || 0) - (W(a).count || 0) || (b.auto - a.auto) || a.name.localeCompare(b.name));
  const checked = TARGETS.map(t => W(t).checked).filter(Boolean).sort().pop();
  $("#targetsCount").innerHTML = `${list.length} employeurs · ${list.filter(t => t.jobs).length} avec des offres juniors sur le site` +
    (checked ? ` · <b>${TARGETS.filter(t => !t.auto).length} pages carrière vérifiées le ${fmtDate(checked)}</b>${nNew ? `, <span style="color:var(--good);font-weight:700">${nNew} avec du nouveau</span>` : ""}` : "");
  $("#targets").innerHTML = list.map(t => {
    const dom = (t.url.match(/https?:\/\/(?:www\.)?([^/]+)/) || [])[1] || "";
    return `<div class="tcard2">
      <div class="th">${logoHtml({ employer: t.name, domain: dom })}<div><b>${esc(t.name)}</b><small>${esc(t.type)} · ${esc(t.zone)}</small></div></div>
      <div class="tags">${t.jobs ? `<button class="tag new" data-emp="${esc(t.name)}" style="border:0;cursor:pointer">${t.jobs} offre${t.jobs > 1 ? "s" : ""} junior${t.jobs > 1 ? "s" : ""} →</button>` : ""}
        ${t.auto ? `<span class="tag auto">Offres lues chaque jour</span>` : watchTag(t)}</div>
      ${watchList(t)}
      ${t.note ? `<div class="note">${esc(t.note)}</div>` : ""}
      <div class="acts">
        <a class="btn small" href="${esc(t.url)}" target="_blank" rel="noopener">Page carrière ↗</a>
        <a class="btn ghost small" href="https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(t.name.split(" (")[0])}" target="_blank" rel="noopener">Offres LinkedIn ↗</a>
        ${t.email ? `<button class="btn ghost small" data-copy="${esc(t.email)}" title="Copier l'adresse">✉ ${esc(t.email)}</button>` : ""}
      </div></div>`;
  }).join("");
}
$("#targetZone").onclick = e => { const b = e.target.closest("[data-z]"); if (b) { tZone = b.dataset.z; renderTargets(); } };
$("#targets").addEventListener("click", e => {
  const c = e.target.closest("[data-copy]");
  if (c) { navigator.clipboard?.writeText(c.dataset.copy).then(() => toast("Adresse copiée : " + c.dataset.copy), () => toast(c.dataset.copy)); return; }
  const em = e.target.closest("[data-emp]");
  if (em) {
    const name = em.dataset.emp.split(" (")[0].toLowerCase();
    const match = [...new Set(S.data.jobs.map(j => j.employer))].find(x => x.toLowerCase().startsWith(name.slice(0, 12)) || name.startsWith(x.toLowerCase().slice(0, 12)));
    if (match) { setFilter("employer", match); switchTab("list"); }
  }
});

// ---------------------------------------------------------------- contacts clés (liste chiffrée)
let CT = null, ctLevel = "junior", ctShown = 60;
const ctDone = store.get("fjr_contacted", {});
const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function decryptContacts(pass) {
  const r = await fetch("data/contacts.enc.json", { cache: "no-cache" });
  if (!r.ok) throw new Error("absent");
  const e = await r.json();
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: b64(e.salt), iterations: e.iter }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(e.iv) }, key, b64(e.data));
  return JSON.parse(new TextDecoder().decode(pt));
}
async function unlockContacts(pass, remember) {
  $("#ctMsg").textContent = "Déchiffrement…";
  try {
    // tolérance d'écriture : espaces, tirets ou mots collés, majuscules
    const t = pass.trim(), words = t.split(/[\s-]+/).filter(Boolean);
    const variants = [...new Set([pass, t, words.join(" "), words.join("-"), words.join(""), t.toLowerCase(), words.join(" ").toLowerCase(), words.join("-").toLowerCase(), words.join("").toLowerCase()])];
    let err;
    for (const v of variants) {
      try { CT = await decryptContacts(v); pass = v; err = null; break; } catch (e) { err = e; if (e.message === "absent") break; }
    }
    if (err) throw err;
    if (remember) { try { localStorage.setItem("fjr_ctpass", pass); } catch {} }
    $("#ctLock").hidden = true; $("#ctBody").hidden = false; renderContacts();
  } catch (e) {
    $("#ctMsg").textContent = e.message === "absent"
      ? "La liste n'est pas encore en ligne : le robot la génère lors de sa prochaine collecte (le lundi, ou quand on le lance à la main). Réessaie dans quelques minutes."
      : "Phrase secrète incorrecte : tape-la exactement comme dans le secret CONTACTS_KEY de GitHub.";
  }
}
$("#ctForm").addEventListener("submit", e => { e.preventDefault(); unlockContacts($("#ctPass").value, $("#ctRemember").checked); });
$("#ctLockBtn").onclick = () => { try { localStorage.removeItem("fjr_ctpass"); } catch {} CT = null; $("#ctBody").hidden = true; $("#ctLock").hidden = false; $("#ctPass").value = ""; $("#ctMsg").textContent = "Liste verrouillée."; };
document.addEventListener("fjr:tab", e => { if (e.detail === "contacts" && !CT) { let p = null; try { p = localStorage.getItem("fjr_ctpass"); } catch {} if (p) unlockContacts(p, true); } });
let ctFirm = "", ctZone = "", ctSort = "junior";
const CT_ZONES = [["", "Toutes"], ["France", "France"], ["UK", "UK"], ["Europe", "Europe"], ["Golfe", "Golfe"], ["Afrique", "Afrique"], ["DFI", "DFI"], ["Autres", "Autres"]];
function ctMeta(name) {
  const t = TARGETS.find(x => x.name === name) || TARGETS.find(x => x.name.split(" (")[0].toLowerCase() === name.split(" (")[0].toLowerCase());
  const z = t?.zone || "", ty = t?.type || "";
  const zone = /^DFI/.test(ty) ? "DFI" : /Dubaï|Abu Dhabi|Bahreïn|Riyad|Arabie|Qatar|Golfe/.test(z) ? "Golfe" : /Afrique|Maroc|Égypte|Nigeria|Kenya/.test(z) ? "Afrique"
    : /^France/.test(z) ? "France" : /^UK/.test(z) ? "UK" : /Europe|Italie|Allemagne|Espagne|Belgique|Suisse|Pays-Bas|Danemark|Nordiques/.test(z) ? "Europe" : "Autres";
  const jobs = S.data.jobs.filter(j => j.employer.toLowerCase().startsWith(name.split(" (")[0].toLowerCase().slice(0, 12))).length;
  return { type: ty, zone: z, zkey: zone, url: t?.url || "", jobs };
}
function renderContacts() {
  if (!CT) return;
  if (!TARGETS.length) { loadTargets(); setTimeout(renderContacts, 600); }
  const q = norm($("#ctQ").value.trim()), fq = norm($("#ctFirmQ").value.trim());
  const lvOk = p => !ctLevel || p.level === ctLevel;
  const pMatch = p => !q || q.split(/\s+/).every(w => norm(`${p.name} ${p.title}`).includes(w));
  const firms = CT.firms.filter(f => f.people.length).map(f => {
    const m = ctMeta(f.firm), ppl = f.people.filter(pMatch);
    const done = f.people.filter(p => ctDone[`${f.firm}|${p.name}`]).length;
    return { f, m, ppl, n: ppl.filter(lvOk).length, jr: f.people.filter(p => p.level === "junior").length, rh: f.people.filter(p => p.level === "rh").length, done };
  });
  const zc = k => firms.filter(x => (!k || x.m.zkey === k) && x.n).length;
  $("#ctZone").innerHTML = CT_ZONES.filter(([k]) => !k || zc(k)).map(([k, l]) => `<button class="${ctZone === k ? "on" : ""}" data-z="${k}">${l}<span class="n">${zc(k)}</span></button>`).join("");
  let fl = firms.filter(x => x.n && (!ctZone || x.m.zkey === ctZone) && (!fq || norm(x.f.firm).includes(fq)));
  const sorters = { junior: (a, b) => b.jr - a.jr || b.n - a.n, jobs: (a, b) => b.m.jobs - a.m.jobs || b.jr - a.jr, todo: (a, b) => (b.n - b.done) - (a.n - a.done), az: (a, b) => a.f.firm.localeCompare(b.f.firm) };
  fl.sort(sorters[ctSort] || sorters.junior);
  if (ctFirm && !fl.some(x => x.f.firm === ctFirm)) ctFirm = "";
  const total = fl.reduce((a, x) => a + x.n, 0);
  $("#ctFirmList").innerHTML = `<button class="ct-f ${ctFirm ? "" : "on"}" data-f=""><div class="logo">∑</div><div class="grow"><b>Toutes les entreprises</b><small>${fl.length} entreprises</small></div><span class="cnt">${total}</span></button>` +
    fl.map(x => `<button class="ct-f ${ctFirm === x.f.firm ? "on" : ""}" data-f="${esc(x.f.firm)}">${logoHtml({ employer: x.f.firm, domain: x.f.domain })}
      <div class="grow"><b>${esc(x.f.firm)}</b><small>${esc(x.m.type || "")}${x.m.type && x.m.zone ? " · " : ""}${esc(x.m.zone || "")}</small>
      <span class="ct-badges">${x.jr ? `<i class="b-jr">${x.jr} junior${x.jr > 1 ? "s" : ""}</i>` : ""}${x.rh ? `<i class="b-rh">${x.rh} RH</i>` : ""}${x.m.jobs ? `<i class="b-job">${x.m.jobs} offre${x.m.jobs > 1 ? "s" : ""}</i>` : ""}${x.done ? `<i class="b-done">${x.done} contacté${x.done > 1 ? "s" : ""}</i>` : ""}</span></div>
      <span class="cnt">${x.n}</span></button>`).join("") || `<p class="muted small" style="padding:.6rem">Aucune entreprise.</p>`;
  // niveaux (comptés dans la sélection)
  const scope = firms.filter(x => (!ctFirm || x.f.firm === ctFirm) && (!ctZone || ctFirm || x.m.zkey === ctZone) && (!fq || ctFirm || norm(x.f.firm).includes(fq)));
  const lv = { junior: "Analysts & associates", rh: "RH & recrutement", senior: "Seniors", "": "Tous" };
  $("#ctLevel").innerHTML = Object.entries(lv).map(([k, l]) => `<button class="${ctLevel === k ? "on" : ""}" data-l="${k}">${l}<span class="n">${scope.reduce((a, x) => a + x.ppl.filter(p => !k || p.level === k).length, 0)}</span></button>`).join("");
  $("#ctCount").textContent = `${CT.firms.reduce((a, f) => a + f.people.length, 0)} personnes · ${firms.length} entreprises · mis à jour le ${new Date(CT.generated.replace("Z", ":00Z")).toLocaleDateString("fr-FR")}`;
  // en-tête de l'entreprise choisie
  const sel = ctFirm && firms.find(x => x.f.firm === ctFirm);
  $("#ctFirmHead").innerHTML = sel ? `<div class="ct-head">${logoHtml({ employer: sel.f.firm, domain: sel.f.domain })}
      <div class="grow"><h3>${esc(sel.f.firm)}</h3><small>${esc(sel.m.type)}${sel.m.zone ? " · " + esc(sel.m.zone) : ""}</small>
      <div class="ct-fmt">Format d'e-mail : <code>${esc(sel.f.pattern || "?")}@${esc(sel.f.domain || "")}</code> <span class="conf ${/déduit/.test(sel.f.pattern_why || "") ? "ok" : "guess"}">${/déduit/.test(sel.f.pattern_why || "") ? "confirmé par le site" : "supposé"}</span>${sel.f.generic?.length ? ` · générique : ${sel.f.generic.map(g => `<a href="mailto:${esc(g)}">${esc(g)}</a>`).join(", ")}` : ""}</div></div>
      <div class="ct-hacts">${sel.m.jobs ? `<button class="btn small accent" data-emp="${esc(sel.f.firm)}">${sel.m.jobs} offre${sel.m.jobs > 1 ? "s" : ""} junior${sel.m.jobs > 1 ? "s" : ""} →</button>` : ""}${sel.m.url ? `<a class="btn small ghost" href="${esc(sel.m.url)}" target="_blank" rel="noopener">Page carrière ↗</a>` : ""}
      <a class="btn small ghost" href="https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(sel.f.firm + " analyst")}" target="_blank" rel="noopener">LinkedIn ↗</a></div></div>` : "";
  // personnes
  const list = scope.flatMap(x => x.ppl.filter(lvOk).map(p => ({ ...p, firm: x.f.firm, why: x.f.pattern_why })));
  let html = "", firm = "";
  list.slice(0, ctShown).forEach(p => {
    if (!ctFirm && p.firm !== firm) { firm = p.firm; html += `<button class="ctfirm" data-f="${esc(firm)}">${esc(firm)} <span>voir l'équipe →</span></button>`; }
    const id = `${p.firm}|${p.name}`, done = ctDone[id];
    html += `<div class="ct ${done ? "done" : ""}" data-id="${esc(id)}">
      <div class="ct-who"><b>${esc(p.name)}</b><span class="lvl l-${p.level}">${{ junior: "Junior", rh: "RH", senior: "Senior" }[p.level] || ""}</span><div class="ttl">${esc(p.title)}</div></div>
      <button class="ct-mail" data-ct="copy" title="Copier l'e-mail">${esc(p.email || "—")}<i>⧉</i></button>
      <div class="acts">
        <a class="btn ghost small" target="_blank" rel="noopener" href="https://www.google.com/search?q=${encodeURIComponent(`"${p.name}" "${p.firm}" linkedin`)}" title="Vérifier sur Google / LinkedIn">Vérifier ↗</a>
        <button class="btn small" data-ct="claude">✦ E-mail</button>
        <button class="btn ghost small ${done ? "on" : ""}" data-ct="done" title="${done ? "Contacté le " + fmtDate(done) : "Marquer comme contacté"}">${done ? "✓ " + fmtDate(done).slice(0, 5) : "Contacté ?"}</button>
      </div></div>`;
  });
  $("#ctList").innerHTML = html || `<p class="empty">Aucun contact pour ces filtres.</p>`;
  $("#ctMore").hidden = list.length <= ctShown; $("#ctMore").textContent = `Afficher plus (${list.length - ctShown})`;
}
$("#ctFirmList").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (!b) return; ctFirm = b.dataset.f; ctShown = 60; renderContacts(); if (innerWidth < 900) $("#ctFirmHead").scrollIntoView({ behavior: "smooth", block: "start" }); });
$("#ctZone").addEventListener("click", e => { const b = e.target.closest("[data-z]"); if (!b) return; ctZone = b.dataset.z; ctFirm = ""; ctShown = 60; renderContacts(); });
$("#ctSort").onchange = e => { ctSort = e.target.value; renderContacts(); };
let ctFT; $("#ctFirmQ").addEventListener("input", () => { clearTimeout(ctFT); ctFT = setTimeout(renderContacts, 120); });
$("#ctFirmHead").addEventListener("click", e => { const b = e.target.closest("[data-emp]"); if (b) { setFilter("employer", b.dataset.emp); switchTab("list"); } });
$("#ctList").addEventListener("click", e => { const b = e.target.closest(".ctfirm[data-f]"); if (b) { ctFirm = b.dataset.f; ctShown = 60; renderContacts(); scrollTo({ top: $("#ctBody").offsetTop - 80, behavior: "smooth" }); } });
$("#ctMore").onclick = () => { ctShown += 60; renderContacts(); };
let ctT; $("#ctQ").addEventListener("input", () => { clearTimeout(ctT); ctT = setTimeout(() => { ctShown = 60; renderContacts(); }, 150); });
$("#ctLevel").onclick = e => { const b = e.target.closest("[data-l]"); if (b) { ctLevel = b.dataset.l; ctShown = 60; renderContacts(); } };
$("#ctList").addEventListener("click", async e => {
  const b = e.target.closest("[data-ct]"); if (!b || !b.closest(".ct")) return;
  const id = b.closest(".ct").dataset.id, [firm, name] = id.split("|");
  const p = CT.firms.find(f => f.firm === firm).people.find(x => x.name === name);
  if (b.dataset.ct === "copy") { navigator.clipboard?.writeText(p.email).then(() => toast("E-mail copié : " + p.email), () => toast(p.email)); }
  if (b.dataset.ct === "done") {
    if (ctDone[id]) delete ctDone[id]; else ctDone[id] = new Date().toISOString().slice(0, 10);
    store.set("fjr_contacted", ctDone); renderContacts();
  }
  if (b.dataset.ct === "claude") {
    const ctx = `Contact : ${p.name}\nFonction : ${p.title}\nEntreprise : ${firm}\nE-mail : ${p.email}\nSource : site de l'entreprise (page équipe)`;
    try { await navigator.clipboard.writeText(ctx); toast("Contact copié : colle-le dans l'assistant (Ctrl/Cmd + V)"); } catch { toast("Ouvre l'assistant puis colle le contact"); }
    window.open(ASSISTANT + "#email", "_blank", "noopener");
  }
});

// ---------------------------------------------------------------- suivi (kanban)
function renderBoard() {
  const rows = Object.entries(S.track);
  $("#trackCount").textContent = rows.length || "";
  const still = new Set(S.data.jobs.map(j => j.id));
  $("#board").innerHTML = STATUSES.map(st => {
    const items = rows.filter(([, t]) => t.status === st).sort((a, b) => (b[1].updated || "").localeCompare(a[1].updated || ""));
    return `<div class="col" data-status="${st}"><h3>${st}<span class="n">${items.length}</span></h3>${items.map(([id, t]) =>
      `<div class="tcard" draggable="true" data-id="${id}"><b>${esc(t.title)}</b><small>${esc(t.employer)} · ${esc(t.city || "")}${still.has(id) ? "" : " · offre retirée"}</small>
       <input data-note value="${esc(t.note || "")}" placeholder="Note : contact, date d'entretien…">
       <div class="tc-acts"><a href="${esc(t.url)}" target="_blank" rel="noopener">Ouvrir ↗</a><button data-del>Retirer</button></div></div>`).join("") ||
      `<p class="muted small" style="margin:.3rem 0">Glisse une carte ici</p>`}</div>`;
  }).join("");
}
$("#board").addEventListener("dragstart", e => { const c = e.target.closest(".tcard"); if (c) { c.classList.add("dragging"); e.dataTransfer.setData("text/plain", c.dataset.id); } });
$("#board").addEventListener("dragend", e => e.target.closest(".tcard")?.classList.remove("dragging"));
$("#board").addEventListener("dragover", e => { const col = e.target.closest(".col"); if (col) { e.preventDefault(); $$(".col").forEach(c => c.classList.toggle("over", c === col)); } });
$("#board").addEventListener("drop", e => {
  const col = e.target.closest(".col"); $$(".col").forEach(c => c.classList.remove("over")); if (!col) return;
  e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); if (!S.track[id]) return;
  S.track[id].status = col.dataset.status; S.track[id].updated = new Date().toISOString().slice(0, 10);
  store.set("fjr_track", S.track); renderBoard(); renderList();
});
$("#board").addEventListener("change", e => { const id = e.target.closest(".tcard")?.dataset.id; if (id && e.target.matches("[data-note]")) { S.track[id].note = e.target.value; store.set("fjr_track", S.track); } });
$("#board").addEventListener("click", e => { if (e.target.matches("[data-del]")) { delete S.track[e.target.closest(".tcard").dataset.id]; store.set("fjr_track", S.track); renderBoard(); renderList(); } });
$("#exportTrack").onclick = () => {
  const rows = Object.values(S.track);
  const csv = "﻿Offre;Employeur;Ville;Statut;Mis à jour;Notes;Lien\n" + rows.map(t => [t.title, t.employer, t.city, t.status, t.updated, t.note, t.url].map(x => `"${String(x || "").replace(/"/g, '""')}"`).join(";")).join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "suivi-candidatures.csv"; a.click();
};

// ---------------------------------------------------------------- sources
function renderAbout() {
  fetch("data/meta.json", { cache: "no-cache" }).then(r => r.json()).then(m => {
    const src = Object.entries(m.sources).sort((a, b) => a[0].localeCompare(b[0]));
    const byEmp = Object.entries(counts("employer")).sort((a, b) => b[1] - a[1]);
    $("#about").innerHTML = `<h2 style="font-size:1.2rem;margin-bottom:.6rem">Comment fonctionne le site</h2>
      <p>Chaque nuit, un robot interroge directement les sites carrière de ${byEmp.length} employeurs : banques, boutiques de conseil, fonds de private equity et d'infrastructure, du small-cap aux grands fonds. Il ne garde que les <b>postes juniors</b> (stage, VIE, alternance, graduate, analyst 1re année) en M&A, investment banking, leveraged finance, ECM/DCM, private equity, infrastructure et project finance. Les offres qui demandent 2 ans d'expérience ou plus sont écartées.</p>
      <ul>
        <li><b>Date</b> : date de publication quand l'employeur la donne, sinon date à laquelle le robot a repéré l'offre.</li>
        <li><b>Salaire</b> : « annoncé » s'il figure dans l'annonce. Sinon <b>estimation</b>, par ordre de priorité : fourchette observée sur les offres comparables du site qui affichent un salaire (même pays, même type de poste), puis grille de marché par pays et type d'employeur, en devise locale. Fixe, hors bonus. Les indemnités VIE suivent le barème Business France.</li>
        <li><b>Contacts</b> : noms ou e-mails seulement s'ils sont dans l'annonce, plus des recherches LinkedIn prêtes à l'emploi. Le site ne collecte aucune donnée personnelle.</li>
      </ul>
      <h3 style="margin-top:1.2rem">Dernière collecte</h3>
      <p>${m.count} offres juniors · ${new Date(m.generated.replace("Z", ":00Z")).toLocaleString("fr-FR")} · ${src.filter(([, v]) => v.error).length ? `<span style="color:var(--danger)">${src.filter(([, v]) => v.error).length} source(s) en erreur</span>` : "toutes les sources ont répondu"}</p>
      <h3 style="margin-top:1.2rem">Offres par employeur</h3>
      <div class="rows" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr));display:grid">${byEmp.map(([e, n]) => {
        const j = S.data.jobs.find(x => x.employer === e);
        return `<div class="row" data-emp="${esc(e)}">${logoHtml(j)}<span class="grow">${esc(e)}<small>${esc(ETYPE[j.employer_type] || "")}</small></span><span class="n">${n}</span></div>`; }).join("")}</div>
      <details style="margin-top:1rem"><summary class="muted">Détail des ${src.length} sources interrogées</summary>
      <div style="overflow-x:auto"><table><thead><tr><th>Source</th><th class="num">Offres lues</th><th>État</th></tr></thead><tbody>${src.map(([k, v]) =>
        `<tr><td>${esc(k)}</td><td class="num">${v.fetched}</td><td>${v.error ? `<span style="color:var(--danger)">Erreur</span> <span class="muted small">${esc(v.error.slice(0, 80))}</span>` : "✓"}</td></tr>`).join("")}</tbody></table></div></details>
      <p class="hint" style="margin-top:1rem">Ajouter un employeur : <code>scraper/employers.py</code> dans le <a href="https://github.com/${REPO}">dépôt GitHub</a>.</p>`;
    $("#about").onclick = e => { const r = e.target.closest("[data-emp]"); if (r) { setFilter("employer", r.dataset.emp); switchTab("list"); } };
  }).catch(() => {});
}

})();
