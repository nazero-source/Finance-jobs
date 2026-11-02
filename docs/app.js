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
const ETYPE = { bank: "Banque", boutique: "Boutique / conseil", pe: "Private equity", infra: "Infrastructure", am: "Gestion d'actifs" };
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

// ---------------------------------------------------------------- chargement
fetch("data/jobs.json", { cache: "no-cache" }).then(r => r.json()).then(d => {
  S.data = d;
  S.today = d.jobs.reduce((m, j) => j.first_seen > m ? j.first_seen : m, "");
  S.firstRun = d.jobs.reduce((m, j) => j.first_seen < m ? j.first_seen : m, "9999");
  S.firstDay = S.today === S.firstRun;
  const gen = new Date(d.generated.replace("Z", ":00Z"));
  $("#meta").textContent = `${d.jobs.length} offres juniors · mis à jour le ${gen.toLocaleDateString("fr-FR")} à ${gen.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  buildFilters(); restoreFilters(); apply(); renderBoard(); renderAbout(); loadTargets();
  document.dispatchEvent(new CustomEvent("fjr:data"));
  const hash = location.hash.slice(1); if (["list", "map", "apply", "targets", "track", "about"].includes(hash)) switchTab(hash);
}).catch(e => { $("#list").innerHTML = `<p class="empty">Impossible de charger les offres (${esc(e.message)}).</p>`; });

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
  const region = $("#region").value, country = $("#country").value, emp = $("#employer").value, et = $("#etype").value, since = +$("#since").value || 0;
  if (region && j.region !== region) return false;
  if (country && j.country !== country) return false;
  if (emp && j.employer !== emp) return false;
  if (et && j.employer_type !== et) return false;
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
  S.shown = PAGE; saveFilters(); renderChips(); renderKpis(); renderList();
  document.dispatchEvent(new CustomEvent("fjr:filtered"));
}

// ---------------------------------------------------------------- KPIs & liste
function renderKpis() {
  const f = S.filtered, c = counts("seniority", f);
  const fresh = f.filter(j => !S.firstDay && j.first_seen === S.today).length;
  const tiles = [["", f.length, "offres"], ["Stage", c.Stage || 0, "stages"], ["VIE", c.VIE || 0, "VIE"],
    ["Graduate", (c.Graduate || 0), "graduate"], ["Analyst 1", c["Analyst 1"] || 0, "analyst 1re année"]];
  $("#kpis").innerHTML = tiles.map(([lv, n, l]) => `<button class="kpi ${S.level === lv && lv ? "on" : ""}" data-level="${lv}"><b>${n}</b><span>${l}${lv === "" && fresh ? ` · <span style="color:var(--good);font-weight:600">${fresh} nouvelles</span>` : ""}</span></button>`).join("");
  $("#kpis").onclick = e => { const k = e.target.closest(".kpi"); if (k) { S.level = S.level === k.dataset.level ? "" : k.dataset.level; apply(); } };
}
function salaryHtml(s) {
  if (!s) return "";
  const main = s.text.replace(/\s*\(≈.*\)$/, "");
  return `<span class="sal" title="${esc(s.text)} — ${s.estimated ? "estimation : " + esc(s.basis || "") : "salaire indiqué dans l'annonce"}">${esc(main)} ${s.estimated ? `<span class="est">est.</span>` : `<span class="ann">annoncé</span>`}</span>`;
}
function jobCard(j) {
  const tracked = !!S.track[j.id];
  const isNew = !S.firstDay && j.first_seen === S.today;
  return `<article class="job ${S.reported.has(j.id) ? "reported" : ""}" data-id="${j.id}" tabindex="0">
    ${logoHtml(j)}
    <div><h3>${esc(j.title)}</h3><div class="sub"><b>${esc(j.employer)}</b> · ${flag(j.cc)} ${esc(j.city || j.location || "—")}${j.country && j.city ? ", " + esc(j.country) : ""}</div></div>
    <div class="right"><span class="when">${j.posted ? rel(j.posted) : "repérée " + rel(j.first_seen)}</span></div>
    <div class="tags">
      <span class="tag level">${esc(j.seniority)}</span>
      <span class="tag"><span class="dot" style="background:${catColor(j.category)}"></span>${esc(CAT[j.category])}</span>
      ${isNew ? `<span class="tag new">Nouveau</span>` : ""}
      ${salaryHtml(j.salary)}
    </div>
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
async function askClaude(j) {
  try { await navigator.clipboard.writeText(jobContext(j)); toast("Offre copiée : colle-la dans l'assistant Claude (Ctrl/Cmd + V)"); }
  catch { toast("Ouvre l'assistant puis colle l'offre"); }
  window.open(ASSISTANT, "_blank", "noopener");
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
        <button class="btn ghost" data-act="prep">Préparer CV & lettre</button>
        <button class="btn ghost" data-act="claude">✦ Demander à Claude</button>
        <select data-act="status" aria-label="Statut de suivi"><option value="">Suivi : aucun</option>${STATUSES.map(s => `<option ${s === st ? "selected" : ""}>${s}</option>`).join("")}</select>
      </div>
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
    if (a === "claude") askClaude(j);
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
  $$(".tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  $$(".tab").forEach(t => t.classList.toggle("active", t.id === "tab-" + name));
  $("#filterbar").classList.toggle("hidden", !["list", "map"].includes(name));
  if (name === "targets" && !TARGETS.length) loadTargets();
  history.replaceState(null, "", "#" + name);
  document.dispatchEvent(new CustomEvent("fjr:tab", { detail: name }));
  window.scrollTo({ top: 0 });
}
document.addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (b && (b.closest(".tabs") || b.classList.contains("brand"))) { e.preventDefault(); switchTab(b.dataset.tab); } });

// ---------------------------------------------------------------- cibles infra & énergie
let TARGETS = [], tZone = "";
function loadTargets() {
  fetch("data/targets.json", { cache: "no-cache" }).then(r => r.ok ? r.json() : []).then(t => { TARGETS = t; renderTargets(); }).catch(() => {});
}
function renderTargets() {
  const zones = ["France", "UK", "Dubaï", "Afrique"];
  const zc = z => TARGETS.filter(t => !z || (z === "Dubaï" ? /Dubaï|Abu Dhabi|Bahreïn/.test(t.zone) : t.zone.includes(z))).length;
  $("#targetZone").innerHTML = `<button class="${tZone ? "" : "on"}" data-z="">Toutes<span class="n">${TARGETS.length}</span></button>` +
    zones.map(z => `<button class="${tZone === z ? "on" : ""}" data-z="${z}">${z}<span class="n">${zc(z)}</span></button>`).join("");
  const list = TARGETS.filter(t => !tZone || (tZone === "Dubaï" ? /Dubaï|Abu Dhabi|Bahreïn/.test(t.zone) : t.zone.includes(tZone)))
    .sort((a, b) => b.jobs - a.jobs || (b.auto - a.auto) || a.name.localeCompare(b.name));
  $("#targetsCount").textContent = `${list.length} employeurs · ${list.filter(t => t.jobs).length} avec des offres juniors en ce moment`;
  $("#targets").innerHTML = list.map(t => {
    const dom = (t.url.match(/https?:\/\/(?:www\.)?([^/]+)/) || [])[1] || "";
    return `<div class="tcard2">
      <div class="th">${logoHtml({ employer: t.name, domain: dom })}<div><b>${esc(t.name)}</b><small>${esc(t.type)} · ${esc(t.zone)}</small></div></div>
      <div class="tags">${t.jobs ? `<button class="tag new" data-emp="${esc(t.name)}" style="border:0;cursor:pointer">${t.jobs} offre${t.jobs > 1 ? "s" : ""} junior${t.jobs > 1 ? "s" : ""} →</button>` : ""}
        <span class="tag ${t.auto ? "auto" : "watch"}">${t.auto ? "Suivi automatique" : "À surveiller"}</span></div>
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
