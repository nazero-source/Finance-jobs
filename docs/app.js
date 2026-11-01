/* Finance Jobs Radar — site statique, aucune donnée personnelle envoyée à un serveur.
   Profil, CV, suivi et signalements sont stockés dans le navigateur (localStorage). */
(() => {
"use strict";

const CAT_ORDER = ["ma", "ib", "levfin", "ecmdcm", "pe", "infra", "pf"];
const CAT_SHORT = { ma: "M&A / Conseil", ib: "Investment Banking", levfin: "LevFin / Acq. Fin.", ecmdcm: "ECM / DCM",
  pe: "Private Equity", infra: "Infrastructure", pf: "Project Finance" };
const CAT_TEAM = { ma: "M&A", ib: "Investment Banking", levfin: "Leveraged Finance", ecmdcm: "Capital Markets",
  pe: "Private Equity", infra: "Infrastructure", pf: "Project Finance" };
const CONTRACTS = ["Stage", "VIE", "Alternance", "Graduate", "CDI / Expérimenté"];
const SENIORITY = ["Stagiaire / VIE", "Analyst", "Associate", "Vice President", "Director", "Managing Director", "Non précisé"];
const STATUSES = ["", "À postuler", "Envoyée", "Entretien", "Offre", "Refusée"];
const REPO = "nazero-source/finance-jobs";
const PAGE = 60;

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { toast("Stockage du navigateur indisponible"); } },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2600); }
const catColor = c => getComputedStyle(document.documentElement).getPropertyValue(`--c-${c}`).trim() || "#1d4ed8";
const fmtDate = iso => { if (!iso) return ""; const [y, m, d] = iso.slice(0, 10).split("-"); return `${d}/${m}/${y}`; };
const daysAgo = iso => iso ? Math.floor((Date.now() - new Date(iso.slice(0, 10) + "T00:00:00Z")) / 864e5) : 9999;
const flag = cc => cc && cc.length === 2 ? String.fromCodePoint(...[...cc.toUpperCase()].map(c => 127397 + c.charCodeAt())) : "🌐";

let DATA = { jobs: [] }, filtered = [], shown = PAGE;
let state = { cats: new Set(), contracts: new Set(), region: "" };
let track = store.get("fjr_track", {});
let reported = new Set(store.get("fjr_reported", []));
let today = "";

// ---------------------------------------------------------------- chargement
fetch("data/jobs.json", { cache: "no-cache" }).then(r => r.json()).then(d => {
  DATA = d;
  today = d.jobs.reduce((m, j) => j.first_seen > m ? j.first_seen : m, "");
  const firstDay = d.jobs.every(j => j.first_seen === today);
  DATA.firstDay = firstDay;
  DATA.firstRun = d.jobs.reduce((m, j) => j.first_seen < m ? j.first_seen : m, "9999");
  const gen = new Date(d.generated.replace("Z", ":00Z"));
  $("#meta").textContent = `${d.jobs.length} offres · mis à jour le ${gen.toLocaleDateString("fr-FR")} à ${gen.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  buildFilters(); restoreFilters(); apply(); renderTrack(); renderAbout();
}).catch(e => { $("#list").innerHTML = `<p class="empty">Impossible de charger les offres (${esc(e.message)}).</p>`; });

// ---------------------------------------------------------------- filtres
function buildFilters() {
  const count = (key) => DATA.jobs.reduce((m, j) => (m[j[key]] = (m[j[key]] || 0) + 1, m), {});
  const cc = count("category"), ct = count("contract");
  $("#catChips").innerHTML = CAT_ORDER.filter(c => cc[c]).map(c =>
    `<button class="chip" data-cat="${c}"><span style="color:${catColor(c)}">●</span> ${esc(CAT_SHORT[c])}<span class="n">${cc[c]}</span></button>`).join("");
  $("#contractChips").innerHTML = CONTRACTS.filter(c => ct[c]).map(c =>
    `<button class="chip" data-contract="${esc(c)}">${esc(c)}<span class="n">${ct[c]}</span></button>`).join("");
  const opts = (sel, vals) => { $(sel).insertAdjacentHTML("beforeend", vals.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join("")); };
  const uniq = key => Object.entries(count(key)).filter(([k]) => k && k !== "undefined").sort((a, b) => a[0].localeCompare(b[0]));
  opts("#region", uniq("region").map(([k, n]) => [k, `${k} (${n})`]));
  opts("#country", uniq("country").map(([k, n]) => [k, `${k} (${n})`]));
  opts("#employer", uniq("employer").map(([k, n]) => [k, `${k} (${n})`]));
  const sc = count("seniority");
  opts("#seniority", SENIORITY.filter(s => sc[s]).map(s => [s, `${s} (${sc[s]})`]));

  $("#catChips").onclick = e => { const b = e.target.closest(".chip"); if (!b) return; toggleSet(state.cats, b.dataset.cat); b.classList.toggle("on"); apply(); };
  $("#contractChips").onclick = e => { const b = e.target.closest(".chip"); if (!b) return; toggleSet(state.contracts, b.dataset.contract); b.classList.toggle("on"); apply(); };
  ["#q", "#region", "#country", "#employer", "#seniority", "#since", "#sort", "#profileOnly", "#hideReported"].forEach(s =>
    $(s).addEventListener(s === "#q" ? "input" : "change", () => { if (s === "#region") state.region = $("#region").value; apply(); }));
  $("#reset").onclick = () => {
    state = { cats: new Set(), contracts: new Set(), region: "" };
    $$(".chip.on").forEach(c => c.classList.remove("on"));
    ["#q", "#region", "#country", "#employer", "#seniority", "#since"].forEach(s => $(s).value = "");
    $("#profileOnly").checked = false; apply();
  };
}
$("#filtersToggle").onclick = () => $("#filters").classList.toggle("open");
function toggleSet(s, v) { s.has(v) ? s.delete(v) : s.add(v); }
function saveFilters() {
  store.set("fjr_filters", { cats: [...state.cats], contracts: [...state.contracts], region: $("#region").value, country: $("#country").value,
    employer: $("#employer").value, seniority: $("#seniority").value, since: $("#since").value, sort: $("#sort").value, profile: $("#profileOnly").checked });
}
function restoreFilters() {
  const f = store.get("fjr_filters", null); if (!f) return;
  f.cats.forEach(c => { state.cats.add(c); $(`[data-cat="${c}"]`)?.classList.add("on"); });
  f.contracts.forEach(c => { state.contracts.add(c); $$("[data-contract]").find(b => b.dataset.contract === c)?.classList.add("on"); });
  for (const [k, s] of [["region", "#region"], ["country", "#country"], ["employer", "#employer"], ["seniority", "#seniority"], ["since", "#since"], ["sort", "#sort"]])
    if (f[k] && [...$(s).options].some(o => o.value === f[k])) $(s).value = f[k];
  state.region = $("#region").value; $("#profileOnly").checked = !!f.profile;
}

const ENTRY = new Set(["Stage", "VIE", "Graduate", "Alternance"]);
function matchProfile(j) {
  if (!(ENTRY.has(j.contract) || j.seniority === "Analyst")) return false;
  const t = j.title;
  if (/\b2026\b/.test(t) && !/\b2027\b/.test(t)) return false;  // offres pour 2026 : trop tôt
  return true;
}
function apply() {
  const q = $("#q").value.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const region = $("#region").value, country = $("#country").value, emp = $("#employer").value,
    sen = $("#seniority").value, since = +$("#since").value || 0, prof = $("#profileOnly").checked, hide = $("#hideReported").checked;
  filtered = DATA.jobs.filter(j => {
    if (state.cats.size && !state.cats.has(j.category)) return false;
    if (state.contracts.size && !state.contracts.has(j.contract)) return false;
    if (region && j.region !== region) return false;
    if (country && j.country !== country) return false;
    if (emp && j.employer !== emp) return false;
    if (sen && j.seniority !== sen) return false;
    if (since) { const d = since === 1 ? daysAgo(j.first_seen) : daysAgo(j.posted || j.first_seen); if (d > (since === 1 ? 0 : since)) return false; }
    if (prof && !matchProfile(j)) return false;
    if (hide && reported.has(j.id)) return false;
    if (q) { const hay = `${j.title} ${j.employer} ${j.city} ${j.country} ${j.location} ${CAT_SHORT[j.category]}`.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, ""); if (!q.split(/\s+/).every(w => hay.includes(w))) return false; }
    return true;
  });
  const s = $("#sort").value;
  const dateKey = j => j.posted || (j.first_seen > DATA.firstRun ? j.first_seen : "");
  filtered.sort(s === "employer" ? (a, b) => a.employer.localeCompare(b.employer) || dateKey(b).localeCompare(dateKey(a))
    : s === "country" ? (a, b) => (a.country || "~").localeCompare(b.country || "~") || dateKey(b).localeCompare(dateKey(a))
    : (a, b) => dateKey(b).localeCompare(dateKey(a)));
  $("#count").textContent = `${filtered.length} offre${filtered.length > 1 ? "s" : ""}`;
  const nf = state.cats.size + state.contracts.size + ["#region", "#country", "#employer", "#seniority", "#since"].filter(x => $(x).value).length + ($("#profileOnly").checked ? 1 : 0) + ($("#q").value ? 1 : 0);
  $("#filtersToggle").textContent = `Filtres${nf ? ` (${nf})` : ""} · ${filtered.length} offres`;
  shown = PAGE; saveFilters(); renderRegions(); renderList(); if (map) renderMap();
}

// ---------------------------------------------------------------- liste
function renderRegions() {
  const base = DATA.jobs.filter(j => (!state.cats.size || state.cats.has(j.category)) && (!state.contracts.size || state.contracts.has(j.contract)));
  const by = base.reduce((m, j) => (m[j.region] = (m[j.region] || 0) + 1, m), {});
  const order = ["Europe", "Amérique du Nord", "Amérique latine", "Moyen-Orient & Afrique", "Asie-Pacifique", "Autre"];
  $("#byRegion").innerHTML = `<button data-r="" class="${state.region ? "" : "on"}">Monde<b>${base.length}</b></button>` +
    order.filter(r => by[r]).map(r => `<button data-r="${esc(r)}" class="${state.region === r ? "on" : ""}">${esc(r)}<b>${by[r]}</b></button>`).join("");
  $("#byRegion").onclick = e => { const b = e.target.closest("button"); if (!b) return; state.region = b.dataset.r; $("#region").value = b.dataset.r; apply(); };
}

function salaryHtml(s) {
  if (!s) return `<span class="sal">Salaire : non communiqué</span>`;
  return `<span class="sal">💶 <b>${esc(s.text.replace(/\s*\((?:estimation[^)]*|indemnité VIE, estimation)\)/, ""))}</b>${s.estimated ? `<span class="est" title="Estimation à partir d'une grille métier / pays / niveau — pas un chiffre annoncé par l'employeur">estimation</span>` : `<span class="est" style="color:var(--good);background:var(--good-soft)">annoncé</span>`}</span>`;
}
function dateHtml(j) {
  if (j.posted) return `<span>📅 Publiée le ${fmtDate(j.posted)}</span>`;
  return `<span title="L'employeur ne publie pas la date : date de première détection par le robot">📅 Repérée le ${fmtDate(j.first_seen)}</span>`;
}
function jobCard(j) {
  const t = track[j.id]?.status || "";
  const isNew = !DATA.firstDay && j.first_seen === today;
  return `<article class="job ${reported.has(j.id) ? "reported" : ""}" data-id="${j.id}">
    <div class="head"><div>
      <h3><a href="${esc(j.url)}" target="_blank" rel="noopener">${esc(j.title)}</a></h3>
      <div class="emp"><b>${esc(j.employer)}</b> · ${flag(j.cc)} ${esc(j.city || j.location)}${j.country && j.city ? ", " + esc(j.country) : ""}</div>
    </div></div>
    <div class="tags">
      <span class="tag cat" style="background:${catColor(j.category)}">${esc(CAT_SHORT[j.category])}</span>
      <span class="tag">${esc(j.contract)}</span>
      ${j.seniority && j.seniority !== "Non précisé" && j.seniority !== "Stagiaire / VIE" ? `<span class="tag">${esc(j.seniority)}</span>` : ""}
      ${isNew ? `<span class="tag new">Nouveau</span>` : ""}
    </div>
    <div class="meta">${dateHtml(j)}${salaryHtml(j.salary)}</div>
    <div class="jobactions">
      <a class="btn small" href="${esc(j.url)}" target="_blank" rel="noopener">Voir l'offre ↗</a>
      <button class="btn ghost small" data-act="details">Détails & contacts</button>
      <button class="btn ghost small" data-act="apply">Adapter ma candidature</button>
      <select class="status" data-act="status" aria-label="Statut">${STATUSES.map(s => `<option ${s === t ? "selected" : ""} value="${s}">${s || "Suivi…"}</option>`).join("")}</select>
      <button class="link" data-act="report">${reported.has(j.id) ? "Annuler le signalement" : "Signaler hors sujet"}</button>
    </div>
    <div class="details" hidden></div>
  </article>`;
}
function renderList() {
  const el = $("#list");
  if (!filtered.length) { el.innerHTML = `<p class="empty">Aucune offre ne correspond à ces filtres.</p>`; $("#more").hidden = true; return; }
  el.innerHTML = filtered.slice(0, shown).map(jobCard).join("");
  $("#more").hidden = shown >= filtered.length;
  $("#more").textContent = `Afficher plus (${filtered.length - shown} restantes)`;
}
$("#more").onclick = () => { shown += PAGE; renderList(); };

const li = (kw) => `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(kw)}`;
function contactsHtml(j) {
  const p = store.get("fjr_profile", {});
  const team = CAT_TEAM[j.category];
  const city = j.city || "";
  const items = [];
  j.recruiters?.forEach(r => items.push(`👤 <b>${esc(r)}</b> (cité dans l'annonce)`));
  j.emails?.forEach(e => items.push(`✉️ <a href="mailto:${esc(e)}">${esc(e)}</a> (cité dans l'annonce)`));
  items.push(`🔎 <a target="_blank" rel="noopener" href="${li(`${j.employer} recruiter ${city}`)}">Recruteurs / campus recruiting de ${esc(j.employer)}${city ? " à " + esc(city) : ""}</a>`);
  items.push(`🔎 <a target="_blank" rel="noopener" href="${li(`${j.employer} ${team} ${city}`)}">Équipe ${esc(team)} de ${esc(j.employer)}${city ? " à " + esc(city) : ""}</a>`);
  items.push(`🔎 <a target="_blank" rel="noopener" href="${li(`${j.employer} ${team} analyst`)}">Analysts / associates ${esc(team)} (les plus réceptifs pour un premier contact)</a>`);
  if (p.school) items.push(`🎓 <a target="_blank" rel="noopener" href="${li(`${j.employer} ${p.school}`)}">Anciens de ${esc(p.school)} chez ${esc(j.employer)}</a>`);
  return `<div class="contacts"><b>Personnes à contacter</b><ul>${items.map(i => `<li>${i}</li>`).join("")}</ul>
    <p class="hint">Les liens ouvrent une recherche LinkedIn prête à l'emploi. Aucune donnée personnelle n'est collectée par le site.</p></div>`;
}
$("#list").addEventListener("click", e => {
  const card = e.target.closest(".job"); if (!card) return;
  const j = DATA.jobs.find(x => x.id === card.dataset.id);
  const act = e.target.dataset.act;
  if (act === "details") {
    const d = $(".details", card);
    if (d.hidden) d.innerHTML = `${contactsHtml(j)}<div><b>Description</b> <span class="hint">(extrait — source : ${esc(j.source)})</span><div class="desc">${esc(j.desc || "Description non disponible : voir l'offre.")}</div></div>`;
    d.hidden = !d.hidden;
  } else if (act === "apply") {
    setTarget(j); switchTab("apply");
  } else if (act === "report") {
    if (reported.has(j.id)) reported.delete(j.id);
    else {
      reported.add(j.id);
      const body = `Offre hors sujet signalée depuis le site :\n\n- Titre : ${j.title}\n- Employeur : ${j.employer}\n- Classée en : ${CAT_SHORT[j.category]} / ${j.contract}\n- Lien : ${j.url}\n\nPourquoi c'est hors sujet : `;
      toast("Offre masquée. Une page GitHub s'ouvre pour signaler l'erreur (optionnel).");
      window.open(`https://github.com/${REPO}/issues/new?title=${encodeURIComponent("Hors sujet : " + j.title)}&body=${encodeURIComponent(body)}&labels=hors-sujet`, "_blank", "noopener");
    }
    store.set("fjr_reported", [...reported]); apply();
  }
});
$("#list").addEventListener("change", e => {
  if (e.target.dataset.act !== "status") return;
  const id = e.target.closest(".job").dataset.id, j = DATA.jobs.find(x => x.id === id), v = e.target.value;
  if (!v) delete track[id];
  else track[id] = { ...(track[id] || {}), status: v, updated: new Date().toISOString().slice(0, 10),
    title: j.title, employer: j.employer, url: j.url, city: j.city || j.location, note: track[id]?.note || "" };
  store.set("fjr_track", track); renderTrack(); toast(v ? `Ajoutée au suivi : ${v}` : "Retirée du suivi");
});

// ---------------------------------------------------------------- onglets
function switchTab(name) {
  $$(".tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  $$(".tab").forEach(t => t.classList.toggle("active", t.id === "tab-" + name));
  $("#filters").classList.toggle("hidden", !["list", "map"].includes(name));
  if (name === "map") initMap();
  store.set("fjr_tab", name);
  window.scrollTo({ top: 0 });
}
$(".tabs").onclick = e => { const b = e.target.closest("button"); if (b) switchTab(b.dataset.tab); };
const lastTab = store.get("fjr_tab", "list"); if (lastTab !== "list") setTimeout(() => switchTab(lastTab), 0);

// ---------------------------------------------------------------- carte
let map, cluster;
function initMap() {
  if (map) { setTimeout(() => map.invalidateSize(), 50); return; }
  if (!window.L) { $("#map").innerHTML = `<p class="empty">La carte n'a pas pu se charger.</p>`; return; }
  map = L.map("map", { worldCopyJump: true }).setView([30, 10], 2);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 18, className: "tiles" }).addTo(map);
  cluster = L.markerClusterGroup({ maxClusterRadius: 45, showCoverageOnHover: false,
    iconCreateFunction: c => { const n = c.getAllChildMarkers().reduce((a, m) => a + (m.options.count || 1), 0);
      const size = n < 10 ? 34 : n < 100 ? 40 : 48;
      return L.divIcon({ html: `<div><span>${n}</span></div>`, className: "marker-cluster " + (n < 10 ? "marker-cluster-small" : n < 100 ? "marker-cluster-medium" : "marker-cluster-large"), iconSize: [size, size] }); } });
  map.addLayer(cluster);
  renderMap();
}
function renderMap() {
  if (!cluster) return;
  cluster.clearLayers();
  const byCity = {};
  filtered.forEach(j => { if (j.lat == null) return; const k = `${j.lat},${j.lon}`; (byCity[k] ||= []).push(j); });
  Object.values(byCity).forEach(js => {
    const j0 = js[0];
    const cats = js.reduce((m, j) => (m[j.category] = (m[j.category] || 0) + 1, m), {});
    const main = Object.entries(cats).sort((a, b) => b[1] - a[1])[0][0];
    const icon = L.divIcon({ className: "", html: `<div style="background:${catColor(main)};color:#fff;border-radius:99px;min-width:26px;height:26px;padding:0 6px;display:flex;align-items:center;justify-content:center;font:600 12px system-ui;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)">${js.length}</div>`, iconSize: [26, 26], iconAnchor: [13, 13] });
    const m = L.marker([j0.lat, j0.lon], { icon, count: js.length });
    m.bindPopup(() => `<div class="popup"><h4>${flag(j0.cc)} ${esc(j0.city || j0.location)} — ${js.length} offre${js.length > 1 ? "s" : ""}</h4><ul>${js.slice(0, 40).map(j =>
      `<li><a href="${esc(j.url)}" target="_blank" rel="noopener">${esc(j.title)}</a> · <b>${esc(j.employer)}</b> <span style="color:${catColor(j.category)}">●</span></li>`).join("")}</ul>${js.length > 40 ? `<p>… et ${js.length - 40} autres</p>` : ""}</div>`, { maxWidth: 360 });
    cluster.addLayer(m);
  });
  const byCountry = filtered.reduce((m, j) => { const c = j.country || "Non localisé"; m[c] = (m[c] || 0) + 1; return m; }, {});
  $("#countryList").innerHTML = Object.entries(byCountry).sort((a, b) => b[1] - a[1]).map(([c, n]) => `<li data-c="${esc(c)}">${esc(c)} — <b>${n}</b></li>`).join("");
  $("#countryList").onclick = e => { const l = e.target.closest("li"); if (!l) return; const js = filtered.filter(j => j.country === l.dataset.c && j.lat != null);
    if (js.length) map.fitBounds(L.latLngBounds(js.map(j => [j.lat, j.lon])).pad(0.5), { maxZoom: 7 }); };
}

// ---------------------------------------------------------------- profil & candidature
const DEFAULT_BLOCKS = {
  intro: "Dear Hiring Team,\n\n{hook} I would like to join the {team} team at {company} in {city} as {role}.",
  ma: "M&A advisory is where I want to build my career: [pourquoi le conseil, ce que tu as déjà fait en valorisation / exécution].",
  ib: "[Paragraphe investment banking généraliste : coverage, exécution, ce qui t'attire chez {company}.]",
  levfin: "[Paragraphe leveraged / acquisition finance : structuration de dette, capacité d'endettement, LBO.]",
  ecmdcm: "[Paragraphe ECM / DCM.]",
  pe: "[Paragraphe private equity : analyse d'investissement, modélisation LBO, due diligence.]",
  infra: "[Paragraphe infrastructure : actifs, contrats, régulation, horizon long terme.]",
  pf: "[Paragraphe project finance : modèles de projet, debt sizing, DSCR, structuration.]",
  experience: "[Paragraphe commun : tes expériences clés et ce que tu apportes.]",
  closing: "I would welcome the opportunity to discuss how I could contribute to the {team} team at {company}.\n\nYours sincerely,\n\n{name}",
};
const BLOCK_LABELS = { intro: "Introduction", ma: "Paragraphe M&A / Conseil", ib: "Paragraphe Investment Banking", levfin: "Paragraphe LevFin",
  ecmdcm: "Paragraphe ECM / DCM", pe: "Paragraphe Private Equity", infra: "Paragraphe Infrastructure", pf: "Paragraphe Project Finance",
  experience: "Paragraphe commun (expériences)", closing: "Conclusion & signature" };
let profile = store.get("fjr_profile", { blocks: {} });

function renderProfile() {
  ["name", "email", "phone", "city", "school", "cv"].forEach(k => $("#p_" + k).value = profile[k] || "");
  $("#letterBlocks").innerHTML = Object.keys(DEFAULT_BLOCKS).map(k =>
    `<div class="blk"><label>${esc(BLOCK_LABELS[k])}</label><textarea data-blk="${k}" rows="${k === "intro" || k === "closing" ? 4 : 5}">${esc(profile.blocks?.[k] ?? DEFAULT_BLOCKS[k])}</textarea></div>`).join("");
}
function saveProfile() {
  ["name", "email", "phone", "city", "school", "cv"].forEach(k => profile[k] = $("#p_" + k).value);
  profile.blocks = Object.fromEntries($$("[data-blk]").map(t => [t.dataset.blk, t.value]));
  store.set("fjr_profile", profile);
}
$("#tab-apply").addEventListener("input", e => { if (e.target.closest(".card") === $("#tab-apply .card")) { saveProfile(); clearTimeout(saveProfile._t); saveProfile._t = setTimeout(() => toast("Profil enregistré dans ce navigateur"), 900); } });
$("#importProfile").onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try { const p = JSON.parse(await f.text()); profile = { ...profile, ...p, blocks: { ...(profile.blocks || {}), ...(p.blocks || {}) } }; store.set("fjr_profile", profile); renderProfile(); toast("Profil importé ✔"); if (target) analyse(); }
  catch { toast("Fichier invalide"); }
  e.target.value = "";
};
$("#exportProfile").onclick = () => { saveProfile(); download("mon-profil-finance-jobs.json", JSON.stringify(profile, null, 2), "application/json"); };
$("#clearProfile").onclick = () => { if (!confirm("Effacer ton profil, ton CV et tes modèles de lettre de ce navigateur ?")) return; store.del("fjr_profile"); profile = { blocks: {} }; renderProfile(); toast("Profil effacé"); };
$("#importCvPdf").onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  if (!window.pdfjsLib) return toast("Lecteur PDF indisponible : colle le texte à la main");
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const pdf = await pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise;
    let txt = "";
    for (let i = 1; i <= pdf.numPages; i++) { const c = await (await pdf.getPage(i)).getTextContent(); txt += c.items.map(it => it.str + (it.hasEOL ? "\n" : " ")).join("") + "\n"; }
    $("#p_cv").value = txt.trim(); saveProfile(); toast("CV importé (lu localement, rien n'est envoyé)"); if (target) analyse();
  } catch (err) { toast("Lecture du PDF impossible"); }
  e.target.value = "";
};

let target = null;
function setTarget(j) {
  target = j; store.set("fjr_target", j.id);
  $("#targetJob").classList.remove("muted");
  $("#targetJob").innerHTML = `<b>${esc(j.title)}</b><br>${esc(j.employer)} · ${flag(j.cc)} ${esc(j.city || j.location)} · ${esc(CAT_SHORT[j.category])} · ${esc(j.contract)}<br><a href="${esc(j.url)}" target="_blank" rel="noopener">Voir l'offre ↗</a>`;
  $("#applyTools").hidden = false;
  $("#l_company").value = j.employer; $("#l_role").value = cleanRole(j.title); $("#l_city").value = j.city || "";
  $("#l_cat").innerHTML = CAT_ORDER.map(c => `<option value="${c}" ${c === j.category ? "selected" : ""}>${esc(CAT_SHORT[c])}</option>`).join("");
  $("#l_hook").value = "";
  $("#newsLink").href = `https://news.google.com/search?q=${encodeURIComponent(j.employer)}`;
  $("#letterOut").value = "";
  analyse();
}
function cleanRole(t) { return t.replace(/\s*[\(\[][^)\]]*[\)\]]\s*/g, " ").replace(/\s*[|–-]\s*[A-Z][a-zA-Z .]+$/, "").replace(/\s+/g, " ").trim(); }
function kwTest(re, text) { return new RegExp(`(?<![a-z])(?:${re})(?![a-z])`, "i").test(text); }
function analyse() {
  if (!target) return;
  const offer = `${target.title}\n${target.desc || ""}`, cv = $("#p_cv").value;
  const hits = FIN_KEYWORDS.filter(([, re]) => kwTest(re, offer));
  if (!hits.length) { $("#kw").innerHTML = `<span class="muted">Description trop courte pour l'analyse : ouvre l'offre pour la lire en entier.</span>`; return; }
  if (!cv.trim()) { $("#kw").innerHTML = hits.map(([l]) => `<span class="miss">${esc(l)}</span>`).join("") + `<p class="hint">Ajoute ton CV dans « Mon profil » pour voir ce qui manque.</p>`; return; }
  const ok = hits.filter(([, re]) => kwTest(re, cv)), miss = hits.filter(([, re]) => !kwTest(re, cv));
  $("#kw").innerHTML = miss.map(([l]) => `<span class="miss">✚ ${esc(l)}</span>`).join("") + ok.map(([l]) => `<span class="ok">✓ ${esc(l)}</span>`).join("") +
    `<p class="hint" style="width:100%">${ok.length}/${hits.length} mots-clés de l'offre déjà présents dans ton CV.</p>`;
}
function fill(s, v) { return s.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m); }
function letterText() {
  saveProfile();
  const b = { ...DEFAULT_BLOCKS, ...(profile.blocks || {}) };
  const cat = $("#l_cat").value;
  const hook = $("#l_hook").value.trim();
  const v = { company: $("#l_company").value, role: $("#l_role").value, city: $("#l_city").value || "", team: CAT_TEAM[cat],
    hook: hook ? hook.replace(/\s*$/, " ") : "", name: profile.name || "", date: new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" }) };
  const header = [profile.name, [profile.city, profile.email, profile.phone].filter(Boolean).join(" · "), "", `${v.company}${v.city ? ", " + v.city : ""}`,
    `${profile.city ? profile.city + ", " : ""}${v.date}`, "", `Re: ${v.role}`, ""].filter((x, i) => x !== undefined && !(i === 0 && !x)).join("\n");
  const body = [b.intro, b[cat], b.experience, b.closing].filter(x => x && !/^\[.*\]$/s.test(x.trim())).map(x => fill(x, v).trim()).join("\n\n");
  return (header + "\n" + body).replace(/\n{3,}/g, "\n\n");
}
$("#genLetter").onclick = () => { $("#letterOut").value = letterText(); toast("Lettre générée : relis-la et ajuste-la"); };
$("#copyLetter").onclick = () => copy($("#letterOut").value || letterText());
$("#docLetter").onclick = () => {
  const t = $("#letterOut").value || letterText();
  const html = `<html><head><meta charset="utf-8"></head><body style="font-family:Georgia,serif;font-size:11pt">${esc(t).split("\n\n").map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("")}</body></html>`;
  download(`Cover_Letter_${($("#l_company").value || "").replace(/\W+/g, "_")}.doc`, html, "application/msword");
};
$("#printLetter").onclick = () => {
  let a = $("#printArea"); if (!a) { a = document.createElement("div"); a.id = "printArea"; document.body.appendChild(a); }
  a.textContent = $("#letterOut").value || letterText(); window.print();
};
$("#claudePrompt").onclick = () => {
  saveProfile();
  if (!target) return;
  const p = `Tu es un recruteur expérimenté en ${CAT_SHORT[$("#l_cat").value]} et un coach de candidature.

OBJECTIF : adapter mon CV et ma lettre de motivation à l'offre ci-dessous.

RÈGLES :
- N'invente aucune expérience, aucun chiffre, aucune compétence : reformule et réordonne seulement ce qui existe.
- Reprends le vocabulaire exact de l'offre quand il correspond réellement à mon expérience (pour les logiciels de tri ATS).
- CV : 1 page, mêmes rubriques ; propose les puces à modifier sous forme « avant → après ».
- Lettre : 1 page maximum, en ${/[àéèêç]/.test(target.desc || "") ? "français" : "anglais"}, ton sobre et précis, avec une accroche sur l'actualité de ${target.employer}.
- Termine par 3 questions que je devrais préparer pour l'entretien.

=== OFFRE ===
${target.title} — ${target.employer} — ${target.city || target.location}
${target.url}
${(target.desc || "(description non disponible, voir le lien)").slice(0, 6000)}

=== MON CV ===
${profile.cv || "(colle ton CV ici)"}

=== MA LETTRE DE BASE ===
${$("#letterOut").value || letterText()}`;
  copy(p, "Consigne copiée : colle-la dans Claude (Ctrl/Cmd + V)");
  window.open("https://claude.ai/new", "_blank", "noopener");
};
function copy(t, msg = "Copié ✔") { navigator.clipboard?.writeText(t).then(() => toast(msg), () => toast("Copie impossible : sélectionne le texte à la main")); }
function download(name, content, type) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
["#l_cat"].forEach(s => $(s).addEventListener("change", analyse));
renderProfile();
const tId = store.get("fjr_target", null);
const waitTarget = setInterval(() => { if (DATA.jobs.length) { clearInterval(waitTarget); const j = DATA.jobs.find(x => x.id === tId); if (j) setTarget(j); } }, 200);
setTimeout(() => clearInterval(waitTarget), 15000);

// ---------------------------------------------------------------- suivi
function renderTrack() {
  const rows = Object.entries(track).sort((a, b) => (b[1].updated || "").localeCompare(a[1].updated || ""));
  $("#trackCount").textContent = rows.length || "";
  if (!rows.length) { $("#trackTable").innerHTML = `<p class="empty">Aucune candidature suivie. Dans la liste des offres, choisis un statut (« À postuler », « Envoyée »…) pour l'ajouter ici.</p>`; return; }
  const still = new Set(DATA.jobs.map(j => j.id));
  $("#trackTable").innerHTML = `<div style="overflow-x:auto"><table><thead><tr><th>Offre</th><th>Statut</th><th>Mis à jour</th><th>Notes</th></tr></thead><tbody>${rows.map(([id, t]) =>
    `<tr data-id="${id}"><td><a href="${esc(t.url)}" target="_blank" rel="noopener">${esc(t.title)}</a><br><span class="hint">${esc(t.employer)} · ${esc(t.city || "")}${still.has(id) ? "" : " · <i>offre retirée du site</i>"}</span></td>
    <td><select data-tr="status">${STATUSES.map(s => `<option ${s === t.status ? "selected" : ""} value="${s}">${s || "— retirer —"}</option>`).join("")}</select></td>
    <td>${fmtDate(t.updated)}</td><td><input data-tr="note" value="${esc(t.note || "")}" placeholder="Contact, date d'entretien…"></td></tr>`).join("")}</tbody></table></div>
    <div class="actions"><button class="btn ghost small" id="exportTrack">Exporter (CSV)</button></div>`;
  $("#exportTrack").onclick = () => download("suivi-candidatures.csv", "﻿Offre;Employeur;Ville;Statut;Mis à jour;Notes;Lien\n" +
    rows.map(([, t]) => [t.title, t.employer, t.city, t.status, t.updated, t.note, t.url].map(x => `"${String(x || "").replace(/"/g, '""')}"`).join(";")).join("\n"), "text/csv");
}
$("#trackTable").addEventListener("change", e => {
  const id = e.target.closest("tr")?.dataset.id; if (!id) return;
  if (e.target.dataset.tr === "status") { if (!e.target.value) delete track[id]; else { track[id].status = e.target.value; track[id].updated = new Date().toISOString().slice(0, 10); } }
  if (e.target.dataset.tr === "note") track[id].note = e.target.value;
  store.set("fjr_track", track); renderTrack(); if ($("#tab-list").classList.contains("active")) renderList();
});

// ---------------------------------------------------------------- sources
function renderAbout() {
  fetch("data/meta.json", { cache: "no-cache" }).then(r => r.json()).then(m => {
    const src = Object.entries(m.sources).sort((a, b) => a[0].localeCompare(b[0]));
    const byEmp = DATA.jobs.reduce((acc, j) => (acc[j.employer] = (acc[j.employer] || 0) + 1, acc), {});
    $("#about").innerHTML = `<h2>Comment fonctionne le site</h2>
      <p>Chaque nuit, un robot (GitHub Actions, gratuit) interroge directement les sites carrière des employeurs, garde les offres
      M&A, investment banking, leveraged finance, ECM/DCM, private equity, infrastructure et project finance, les classe par règles
      (mots-clés), les place sur la carte (OpenStreetMap) et republie le site.</p>
      <ul>
        <li><b>Date</b> : date de publication quand l'employeur la fournit, sinon date à laquelle le robot a repéré l'offre (« Repérée le »).</li>
        <li><b>Salaire</b> : « annoncé » quand il figure dans l'annonce ; sinon <b>estimation</b> à partir d'une grille métier × pays × niveau (fixe, hors bonus) — un ordre de grandeur, pas une donnée de l'employeur.</li>
        <li><b>Contacts</b> : noms ou e-mails seulement s'ils figurent dans l'annonce, plus des recherches LinkedIn prêtes à l'emploi. Le site ne collecte aucune donnée personnelle.</li>
        <li><b>Ton profil, ton CV, ton suivi</b> restent dans ton navigateur. Pense à exporter ton profil pour le garder.</li>
      </ul>
      <h3>Dernière collecte</h3>
      <p>${m.count} offres retenues · durée ${Math.round(m.duration_s / 60)} min · ${new Date(m.generated.replace("Z", ":00Z")).toLocaleString("fr-FR")}</p>
      <div style="overflow-x:auto"><table><thead><tr><th>Source</th><th>Offres lues</th><th>État</th></tr></thead><tbody>${src.map(([k, v]) =>
        `<tr><td>${esc(k)}</td><td>${v.fetched}</td><td>${v.error ? `<span style="color:var(--danger)">Erreur</span> <span class="hint">${esc(v.error.slice(0, 90))}</span>` : "✓"}</td></tr>`).join("")}</tbody></table></div>
      <h3>Offres retenues par employeur</h3>
      <p>${Object.entries(byEmp).sort((a, b) => b[1] - a[1]).map(([e, n]) => `${esc(e)} (${n})`).join(" · ")}</p>
      <p class="hint">Pour ajouter un employeur : <code>scraper/employers.py</code> dans le <a href="https://github.com/${REPO}">dépôt GitHub</a>.</p>`;
  }).catch(() => {});
}
})();
