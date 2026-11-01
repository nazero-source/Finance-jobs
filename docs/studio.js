/* Studio de candidature : CV adapté à l'offre + lettre de motivation, en anglais, aperçu A4.
   Tout reste dans le navigateur (localStorage) ; rien n'est envoyé à un serveur. */
(() => {
"use strict";
const F = window.FJR, { S, CAT, CAT_ORDER, TEAM, $, $$, esc, store, toast, flag, logoHtml } = F;

const EMPTY_CV = { sections: [
  { title: "Work Experience", items: [] }, { title: "Education", items: [] },
  { title: "Skills & Interests", lines: [{ label: "Languages", text: "" }, { label: "Technical Skills", text: "" }, { label: "Interests", text: "" }] } ] };
const DEFAULT_BLOCKS = {
  intro: "Dear Hiring Team,\n\n{hook}I would like to join the {team} team at {company} in {city} as {role}.",
  ma: "", ib: "", levfin: "", ecmdcm: "", pe: "", infra: "", pf: "", experience: "",
  closing: "I would welcome the opportunity to discuss how I could contribute to the {team} team at {company}.\n\nYours sincerely,\n\n{name}",
};
const BLOCK_LABELS = { intro: "Introduction", ma: "Paragraphe M&A / Conseil", ib: "Paragraphe Investment Banking", levfin: "Paragraphe LevFin",
  ecmdcm: "Paragraphe ECM / DCM", pe: "Paragraphe Private Equity", infra: "Paragraphe Infrastructure", pf: "Paragraphe Project Finance",
  experience: "Paragraphe commun (ce que j'apporte)", closing: "Conclusion & signature" };
const CAT_BOOST = { ma: "m&a|merger|valuation|dcf|sell-side|buy-side|due diligence|transaction", ib: "m&a|valuation|pitch|transaction|capital",
  levfin: "lbo|leverage|debt|financing|credit", ecmdcm: "capital markets|equity|debt|issuance", pe: "lbo|private equity|investment|due diligence|portfolio|add-on",
  infra: "infrastructure|energy|renewable|greenfield|brownfield|irr|dscr|transport|bot|epc", pf: "project finance|debt sizing|dscr|financing|renewable|epc|bot|concession" };

let profile = migrate(store.get("fjr_profile", null));
let target = null, offerKw = [], cvOff = new Set(), letterDirty = false;

function migrate(p) {
  p = p || {};
  p.blocks = { ...DEFAULT_BLOCKS, ...(p.blocks || {}) };
  if (!p.cvData) p.cvData = JSON.parse(JSON.stringify(EMPTY_CV));
  return p;
}
const save = () => store.set("fjr_profile", profile);

// ---------------------------------------------------------------- entrée depuis la liste
F.prepare = j => { setTarget(j); F.switchTab("apply"); };
document.addEventListener("fjr:data", () => { const id = store.get("fjr_target", null); const j = S.data.jobs.find(x => x.id === id); if (j) setTarget(j); else renderAll(); });

// ---------------------------------------------------------------- sélection de l'offre
const picker = $("#jobPicker"), plist = $("#pickerList");
picker.addEventListener("input", () => {
  const q = F.norm(picker.value.trim()); if (!q) { plist.hidden = true; return; }
  const res = S.data.jobs.filter(j => q.split(/\s+/).every(w => F.norm(`${j.title} ${j.employer} ${j.city}`).includes(w))).slice(0, 14);
  plist.innerHTML = res.length ? res.map(j => `<div class="row" data-id="${j.id}">${logoHtml(j)}<span class="grow">${esc(j.title)}<small>${esc(j.employer)} · ${flag(j.cc)} ${esc(j.city || "")} · ${esc(j.seniority)}</small></span></div>`).join("") : `<p class="muted small" style="padding:.5rem">Aucune offre</p>`;
  plist.hidden = false;
});
plist.addEventListener("click", e => { const r = e.target.closest("[data-id]"); if (!r) return; setTarget(S.data.jobs.find(j => j.id === r.dataset.id)); picker.value = ""; plist.hidden = true; });
document.addEventListener("click", e => { if (!e.target.closest(".picker")) plist.hidden = true; });

function setTarget(j) {
  target = j; cvOff = new Set(); letterDirty = false; store.set("fjr_target", j.id);
  $("#targetJob").className = "target";
  $("#targetJob").innerHTML = `${logoHtml(j)}<div><b>${esc(j.title)}</b><span class="muted">${esc(j.employer)} · ${flag(j.cc)} ${esc(j.city || j.location)} · ${esc(j.seniority)}</span><br><a href="${esc(j.url)}" target="_blank" rel="noopener">Voir l'offre ↗</a></div>`;
  $("#l_cat").innerHTML = CAT_ORDER.map(c => `<option value="${c}" ${c === j.category ? "selected" : ""}>${esc(CAT[c])}</option>`).join("");
  $("#l_role").value = cleanRole(j.title); $("#l_city").value = j.city || ""; $("#l_hook").value = "";
  $("#newsLink").href = `https://news.google.com/search?q=${encodeURIComponent(j.employer)}`;
  ["#matchCard", "#cvControls", "#letterControls", "#claudeCard"].forEach(s => $(s).hidden = false);
  renderAll();
}
function cleanRole(t) {
  return t.replace(/\s*[\(\[][^)\]]*[\)\]]\s*/g, " ").replace(/\b(H\/F|F\/H|M\/F\/D|m\/w\/d|f\/m\/x|M\/F|F\/M)\b/gi, "")
    .replace(/\s*[|–-]\s*(?:London|Paris|New York|Frankfurt|Madrid|Milan|Hong Kong|Singapore|Dubai|Tokyo|Sydney|Toronto|S[aã]o Paulo)\b.*$/i, "").replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------- mots-clés
const kwRe = re => new RegExp(`(?<![a-z])(?:${re})(?![a-z])`, "i");
function cvText() {
  const c = profile.cvData;
  return c.sections.map(s => (s.items || []).map(i => [i.org, i.role, i.orgDesc, ...(i.bullets || [])].join(" ")).join(" ") + (s.lines || []).map(l => l.text).join(" ")).join(" ") + " " + (profile.cv || "");
}
function analyse() {
  if (!target) return;
  const offer = `${target.title}\n${target.desc || ""}`, cv = cvText();
  offerKw = FIN_KEYWORDS.filter(([, re]) => kwRe(re).test(offer));
  const ok = offerKw.filter(([, re]) => kwRe(re).test(cv)), miss = offerKw.filter(([, re]) => !kwRe(re).test(cv));
  const pct = offerKw.length ? Math.round(100 * ok.length / offerKw.length) : 0;
  $("#matchPct").textContent = offerKw.length ? `${pct} %` : "—";
  $("#matchTxt").textContent = offerKw.length ? `des ${offerKw.length} mots-clés de l'offre sont déjà dans ton CV` : "Description trop courte : ouvre l'offre pour la lire en entier.";
  $("#ringFg").style.strokeDashoffset = 97.4 * (1 - pct / 100);
  $("#ringFg").style.stroke = pct >= 70 ? "var(--good)" : pct >= 45 ? "var(--warn)" : "var(--danger)";
  $("#kw").innerHTML = miss.map(([l]) => `<span class="miss" title="Dans l'offre, absent de ton CV : à ajouter seulement si c'est vrai">+ ${esc(l)}</span>`).join("") + ok.map(([l]) => `<span class="ok">✓ ${esc(l)}</span>`).join("");
}

// ---------------------------------------------------------------- CV
function hl(text) {
  if (!offerKw.length || !$("#cvHighlight").checked) return esc(text);
  const re = new RegExp(`(?<![a-z])(?:${offerKw.map(k => k[1]).join("|")})(?![a-z])`, "gi");
  let out = "", last = 0;
  for (const m of text.matchAll(re)) { if (!m[0]) continue; out += esc(text.slice(last, m.index)) + `<mark class="hit">${esc(m[0])}</mark>`; last = m.index + m[0].length; }
  return out + esc(text.slice(last));
}
function score(b) {
  let s = offerKw.filter(([, re]) => kwRe(re).test(b)).length;
  if (target && CAT_BOOST[$("#l_cat").value || target.category] && new RegExp(CAT_BOOST[$("#l_cat").value || target.category], "i").test(b)) s += 0.5;
  return s;
}
function renderCv() {
  const P = profile, c = P.cvData, el = $("#paperCv");
  const has = c.sections.some(s => (s.items || []).length || (s.lines || []).some(l => l.text));
  if (!has) { el.innerHTML = `<div style="font-family:var(--font);color:#555;padding:20mm 0;text-align:center"><b style="font-size:13pt">Ton CV apparaîtra ici</b><p>Ouvre <b>Mon profil</b> et importe ton fichier <code>profil-prive-….json</code>,<br>ou remplis les sections à la main.</p></div>`; return; }
  const reorder = $("#cvReorder").checked && target;
  const contact = [P.phone, P.email, P.linkedin].filter(Boolean).join(" | ");
  let html = `<h1 class="cv-name">${esc(P.name || "")}</h1><div class="cv-contact">${esc(contact)}</div>`;
  c.sections.forEach((s, si) => {
    html += `<section class="cv-sec"><h4>${esc(s.title)}</h4>`;
    (s.items || []).forEach((it, ii) => {
      let bl = (it.bullets || []).map((b, bi) => ({ b, bi, sc: target ? score(b) : 0 }));
      if (reorder) bl = bl.slice().sort((a, b) => b.sc - a.sc || a.bi - b.bi);
      html += `<div class="cv-item"><div class="cv-dates">${esc(it.dates || "")}${it.duration ? `<small>${esc(it.duration)}</small>` : ""}</div><div>
        <div class="cv-head"><span><b>${esc(it.org || "")}</b>${it.orgDesc ? `<span class="org-d"> - ${esc(it.orgDesc)}</span>` : ""}</span><span class="cv-loc">${esc(it.location || "")}</span></div>
        ${it.role ? `<div class="cv-role">${esc(it.role)}</div>` : ""}
        ${bl.length ? `<ul class="cv-bul">${bl.map(x => { const k = `${si}.${ii}.${x.bi}`; return `<li data-k="${k}" class="${cvOff.has(k) ? "off" : ""} ${reorder && x.sc >= 1 ? "rel" : ""}" title="Cliquer pour masquer / afficher">${hl(x.b)}</li>`; }).join("")}</ul>` : ""}
      </div></div>`;
    });
    (s.lines || []).filter(l => l.text).forEach(l => {
      let txt = l.text;
      if (reorder && /technical|skills|tools/i.test(l.label)) {
        const parts = txt.split(/,\s*/); txt = parts.map((p, i) => ({ p, i, s: score(p) })).sort((a, b) => b.s - a.s || a.i - b.i).map(x => x.p).join(", ");
      }
      html += `<div class="cv-skill"><b>${esc(l.label)}</b><span>${hl(txt)}</span></div>`;
    });
    html += `</section>`;
  });
  el.innerHTML = html;
  el.classList.toggle("nohl", !$("#cvHighlight").checked);
}
$("#paperCv").addEventListener("click", e => { const li = e.target.closest("li[data-k]"); if (!li) return; const k = li.dataset.k; cvOff.has(k) ? cvOff.delete(k) : cvOff.add(k); li.classList.toggle("off"); });
["#cvReorder", "#cvHighlight"].forEach(s => $(s).addEventListener("change", renderCv));

// ---------------------------------------------------------------- lettre
function fill(s, v) { return s.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m); }
function letterText() {
  const b = profile.blocks, cat = $("#l_cat").value || target?.category || "ma";
  const hook = $("#l_hook").value.trim();
  const v = { company: target?.employer || "", role: $("#l_role").value, city: $("#l_city").value, team: TEAM[cat],
    hook: hook ? hook.replace(/\s*$/, " ") : "", name: profile.name || "" };
  const date = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const header = [profile.name, profile.city, "", `${v.company}${v.city ? ", " + v.city : ""}`, "", `${profile.city ? profile.city + ", " : ""}${date}`, "", `Re: ${v.role}`, ""].join("\n");
  const body = [b.intro, b[cat] || b.ib || b.ma, b.experience, b.closing].filter(x => x && x.trim()).map(x => fill(x, v).trim()).join("\n\n");
  return (header + "\n" + body).replace(/\n{3,}/g, "\n\n").trim();
}
function renderLetter(force) {
  if (!target) { $("#paperLetter").textContent = "Choisis une offre pour générer la lettre."; return; }
  if (letterDirty && !force) return;
  $("#paperLetter").textContent = letterText(); letterDirty = false;
}
$("#paperLetter").addEventListener("input", () => letterDirty = true);
$("#genLetter").onclick = () => { renderLetter(true); toast("Lettre régénérée : relis-la et ajuste-la directement sur la feuille"); };
["#l_cat", "#l_role", "#l_city", "#l_hook"].forEach(s => $(s).addEventListener("input", () => { renderLetter(); if (s === "#l_cat") { renderCv(); } }));
$("#copyLetter").onclick = () => navigator.clipboard?.writeText($("#paperLetter").innerText).then(() => toast("Lettre copiée"), () => toast("Copie impossible"));

// ---------------------------------------------------------------- feuilles & export
$$(".paper-tabs button").forEach(b => b.onclick = () => {
  $$(".paper-tabs button").forEach(x => x.classList.toggle("active", x === b));
  $("#paperCv").hidden = b.dataset.paper !== "cv"; $("#paperLetter").hidden = b.dataset.paper !== "letter"; fitPaper();
});
function fitPaper() {
  const st = $("#paperStage"); if (!st.offsetWidth) return;
  const z = Math.min(1, (st.clientWidth - 24) / 794);
  $$(".paper").forEach(p => p.style.zoom = z);
}
addEventListener("resize", fitPaper);
document.addEventListener("fjr:tab", e => { if (e.detail === "apply") setTimeout(fitPaper, 30); });
function printPaper(kind) {
  document.body.classList.add(kind === "cv" ? "print-cv" : "print-letter");
  const z = $$(".paper").map(p => p.style.zoom); $$(".paper").forEach(p => p.style.zoom = 1);
  setTimeout(() => { window.print(); document.body.classList.remove("print-cv", "print-letter"); $$(".paper").forEach((p, i) => p.style.zoom = z[i]); }, 50);
}
$("#printCv").onclick = () => printPaper("cv");
$("#printLetter").onclick = () => printPaper("letter");
function docDownload(name, inner) {
  const html = `<html><head><meta charset="utf-8"><style>body{font-family:Garamond,'Times New Roman',serif;font-size:11pt} h1{text-align:center;font-size:16pt;margin:0} h4{text-transform:uppercase;border-bottom:1px solid #000;font-size:10.5pt;margin:8pt 0 3pt} ul{margin:2pt 0 2pt 14pt;padding:0} .cv-contact{text-align:center} .cv-head{font-weight:bold} .cv-loc{float:right;font-weight:normal} .cv-role{font-style:italic} .cv-dates{font-size:9.5pt;color:#333} li.off{display:none} mark{background:none}</style></head><body>${inner}</body></html>`;
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([html], { type: "application/msword" })); a.download = name; a.click();
}
const fileBase = () => `${(profile.name || "CV").replace(/\W+/g, "_")}_${(target?.employer || "").replace(/\W+/g, "_")}`;
$("#docCv").onclick = () => docDownload(`CV_${fileBase()}.doc`, $("#paperCv").innerHTML);
$("#docLetter").onclick = () => docDownload(`Cover_Letter_${fileBase()}.doc`, esc($("#paperLetter").innerText).split("\n\n").map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join(""));

$("#claudePrompt").onclick = () => {
  if (!target) return;
  const p = `You are an experienced ${CAT[target.category]} recruiter and application coach.

GOAL: tailor my CV and cover letter (both in English) to the job below.

RULES:
- Never invent experience, figures or skills: only rephrase and reorder what already exists.
- Reuse the exact wording of the job ad where it genuinely matches my experience (for ATS screening).
- CV: one page, same sections; list the bullets to change as "before → after".
- Cover letter: one page maximum, sober and precise, with an opening hook on recent news about ${target.employer}.
- End with 3 interview questions I should prepare for this role.

=== JOB ===
${target.title} — ${target.employer} — ${target.city || target.location}
${target.url}
${(target.desc || "(description not available, see link)").slice(0, 6000)}

=== MY CV ===
${$("#paperCv").innerText}

=== MY DRAFT COVER LETTER ===
${$("#paperLetter").innerText}`;
  navigator.clipboard?.writeText(p).then(() => toast("Consigne copiée : colle-la dans Claude (Ctrl/Cmd + V)"), () => toast("Copie impossible"));
  window.open("https://claude.ai/new", "_blank", "noopener");
};

// ---------------------------------------------------------------- profil (tiroir)
$("#openProfile").onclick = () => { renderProfileEditor(); F.openDrawer($("#profileDrawer")); };
function renderProfileEditor() {
  ["name", "email", "phone", "city", "school"].forEach(k => $("#p_" + k).value = profile[k] || "");
  const c = profile.cvData;
  $("#cvEditor").innerHTML = c.sections.map((s, si) => `<div class="cv-ed"><h4>${esc(s.title)}</h4>
    ${(s.items || []).map((it, ii) => `<div class="cv-ed" data-si="${si}" data-ii="${ii}">
      <div class="formgrid"><label>Dates<input data-f="dates" value="${esc(it.dates || "")}"></label><label>Durée<input data-f="duration" value="${esc(it.duration || "")}"></label>
      <label>Organisation<input data-f="org" value="${esc(it.org || "")}"></label><label>Lieu<input data-f="location" value="${esc(it.location || "")}"></label></div>
      <div class="formgrid" style="grid-template-columns:1fr 1fr"><label>Description de l'organisation<input data-f="orgDesc" value="${esc(it.orgDesc || "")}"></label><label>Poste / diplôme<input data-f="role" value="${esc(it.role || "")}"></label></div>
      <label>Puces (une par ligne)<textarea data-f="bullets" rows="${Math.max(2, (it.bullets || []).length + 1)}">${esc((it.bullets || []).join("\n"))}</textarea></label>
      <button class="btn ghost small danger" data-del style="justify-self:start">Supprimer</button></div>`).join("")}
    ${s.items ? `<button class="btn ghost small" data-add="${si}" style="justify-self:start">+ Ajouter une ligne</button>` : ""}
    ${(s.lines || []).map((l, li) => `<label data-si="${si}" data-li="${li}">${esc(l.label)}<input data-f="line" value="${esc(l.text || "")}"></label>`).join("")}
  </div>`).join("");
  $("#letterBlocks").innerHTML = Object.keys(DEFAULT_BLOCKS).map(k => `<label>${esc(BLOCK_LABELS[k])}<textarea data-blk="${k}" rows="${k === "intro" || k === "closing" ? 3 : 5}">${esc(profile.blocks[k] || "")}</textarea></label>`).join("");
}
$("#profileDrawer").addEventListener("input", e => {
  const t = e.target;
  if (t.id?.startsWith("p_")) profile[t.id.slice(2)] = t.value;
  else if (t.dataset.blk) profile.blocks[t.dataset.blk] = t.value;
  else if (t.dataset.f === "line") { const w = t.closest("[data-li]"); profile.cvData.sections[w.dataset.si].lines[w.dataset.li].text = t.value; }
  else if (t.dataset.f) { const w = t.closest("[data-ii]"); const it = profile.cvData.sections[w.dataset.si].items[w.dataset.ii];
    it[t.dataset.f] = t.dataset.f === "bullets" ? t.value.split("\n").map(x => x.trim()).filter(Boolean) : t.value; }
  save(); clearTimeout(save._t); save._t = setTimeout(() => { renderAll(); }, 400);
});
$("#profileDrawer").addEventListener("click", e => {
  const add = e.target.closest("[data-add]"), del = e.target.closest("[data-del]");
  if (add) { profile.cvData.sections[add.dataset.add].items.unshift({ dates: "", org: "", role: "", location: "", bullets: [] }); save(); renderProfileEditor(); }
  if (del) { const w = del.closest("[data-ii]"); profile.cvData.sections[w.dataset.si].items.splice(w.dataset.ii, 1); save(); renderProfileEditor(); renderAll(); }
});
$("#importProfile").onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try { const p = JSON.parse(await f.text()); profile = migrate({ ...profile, ...p, blocks: { ...(p.blocks || {}) } }); save(); renderProfileEditor(); renderAll(); toast("Profil importé ✔"); }
  catch { toast("Fichier invalide"); }
  e.target.value = "";
};
$("#exportProfile").onclick = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" })); a.download = "mon-profil-finance-jobs.json"; a.click(); };
$("#clearProfile").onclick = () => { if (!confirm("Effacer ton profil, ton CV et tes paragraphes de lettre de ce navigateur ?")) return; store.del("fjr_profile"); profile = migrate(null); renderProfileEditor(); renderAll(); toast("Profil effacé"); };

function renderAll() { analyse(); renderCv(); renderLetter(); fitPaper(); }
renderAll();
})();
