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
const save = () => { store.set("fjr_profile", profile); clearTimeout(save._e); save._e = setTimeout(() => document.dispatchEvent(new CustomEvent("fjr:profile")), 300); };

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
  ["#matchCard", "#letterControls", "#claudeCard"].forEach(s => $(s).hidden = false);
  renderAll(); renderExpress();
}
// ---- candidature express : du CV à l'envoi, sans quitter la page
function renderExpress() {
  if (!target) return;
  const tr = S.track[target.id], st = tr?.status || "";
  const m = F.matchScore?.(target);
  $("#express").hidden = false;
  $("#express").innerHTML = `
    <div class="ex-head">${logoHtml(target)}<div class="grow"><b>${esc(target.title)}</b><small>${esc(target.employer)} · ${flag(target.cc)} ${esc(target.city || target.location || "")}${m ? ` · <b>${m.score} % match</b>` : ""}</small></div>
      <span class="ex-state">${st ? `Suivi : ${esc(st)}` : "Pas encore suivie"}</span></div>
    <ol class="ex-steps">
      <li class="${st ? "done" : ""}"><span>1</span><div><b>Relis ton CV</b><small>Puces liées à l'offre en tête</small><div class="ex-acts"><button class="btn small ghost" data-x="cvpdf">CV en PDF</button><button class="btn small ghost" data-x="cvdoc">Word</button></div></div></li>
      <li class="${st ? "done" : ""}"><span>2</span><div><b>Finalise ta lettre</b><small>Complète les passages surlignés</small><div class="ex-acts"><button class="btn small ghost" data-x="letter">Voir la lettre</button><button class="btn small ghost" data-x="ltpdf">Lettre en PDF</button></div></div></li>
      <li class="${["Envoyée", "Entretien", "Offre"].includes(st) ? "done" : ""}"><span>3</span><div><b>Postule</b><small>Sur le site de l'employeur</small><div class="ex-acts"><a class="btn small accent" href="${esc(target.url)}" target="_blank" rel="noopener" data-x="go">Ouvrir l'offre ↗</a></div></div></li>
      <li class="${["Envoyée", "Entretien", "Offre"].includes(st) ? "done" : ""}"><span>4</span><div><b>Note-la</b><small>Elle rejoint ton suivi</small><div class="ex-acts">${["Envoyée", "Entretien", "Offre"].includes(st) ? `<span class="ok">✓ ${esc(st)}</span>` : `<button class="btn small" data-x="sent">Marquer « envoyée »</button>`}</div></div></li>
    </ol>`;
}
$("#express").addEventListener("click", e => {
  const x = e.target.closest("[data-x]")?.dataset.x; if (!x || !target) return;
  if (x === "cvpdf") printPaper("cv");
  if (x === "cvdoc") $("#docCv").click();
  if (x === "letter") $("[data-paper=letter]").click();
  if (x === "ltpdf") { $("[data-paper=letter]").click(); printPaper("letter"); }
  if (x === "go" && !S.track[target.id]) { F.toggleTrack(target, "À postuler"); setTimeout(renderExpress, 50); }
  if (x === "sent") { F.toggleTrack(target, "Envoyée"); renderExpress(); }
});
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
  if (!has) { el.innerHTML = `<div style="font-family:var(--font);color:#555;padding:20mm 0;text-align:center"><b style="font-size:13pt">Ton CV apparaîtra ici</b><p>Clique sur <b>📄 Importer mon CV (PDF)</b> à gauche,<br>ou remplis les sections dans « Modifier mon profil ».</p></div>`; return; }
  const edit = $("#cvEdit").checked;
  const reorder = !edit && $("#cvReorder").checked && target;
  const E = (path, text, cls = "") => edit ? `<span class="ed ${cls}" contenteditable="plaintext-only" spellcheck="true" data-e="${path}">${esc(text || "")}</span>` : (cls ? `<span class="${cls}">${hl(text || "")}</span>` : hl(text || ""));
  const contact = [P.phone, P.email, P.linkedin].filter(Boolean).join(" | ");
  let html = `<h1 class="cv-name">${E("name", P.name)}</h1><div class="cv-contact">${esc(contact)}</div>`;
  c.sections.forEach((s, si) => {
    html += `<section class="cv-sec"><h4>${E(`${si}.title`, s.title)}</h4>`;
    (s.items || []).forEach((it, ii) => {
      const p = `${si}.${ii}`;
      let bl = (it.bullets || []).map((b, bi) => ({ b, bi, sc: target ? score(b) : 0 }));
      if (reorder) bl = bl.slice().sort((a, b) => b.sc - a.sc || a.bi - b.bi);
      if (!edit) bl = bl.filter(x => x.b);
      html += `<div class="cv-item"><div class="cv-dates">${E(p + ".dates", it.dates)}${it.duration || edit ? `<small>${E(p + ".duration", it.duration)}</small>` : ""}</div><div>
        <div class="cv-head"><span><b>${E(p + ".org", it.org)}</b>${it.orgDesc || edit ? `<span class="org-d"> - ${E(p + ".orgDesc", it.orgDesc)}</span>` : ""}</span><span class="cv-loc">${E(p + ".location", it.location)}</span></div>
        ${it.role || edit ? `<div class="cv-role">${E(p + ".role", it.role)}</div>` : ""}
        ${bl.length ? `<ul class="cv-bul">${bl.map(x => { const k = `${si}.${ii}.${x.bi}`;
          return edit ? `<li class="ed" contenteditable="plaintext-only" spellcheck="true" data-e="${p}.b.${x.bi}">${esc(x.b)}</li>`
            : `<li data-k="${k}" class="${cvOff.has(k) ? "off" : ""} ${reorder && x.sc >= 1 ? "rel" : ""}" title="Cliquer pour masquer / afficher">${hl(x.b)}</li>`; }).join("")}</ul>`
          : edit ? `<ul class="cv-bul"><li class="ed" contenteditable="plaintext-only" data-e="${p}.b.0"></li></ul>` : ""}
      </div></div>`;
    });
    (s.lines || []).filter(l => l.text || edit).forEach(l => {
      const li = s.lines.indexOf(l);
      let txt = l.text;
      if (reorder && /technical|skills|tools/i.test(l.label)) {
        const parts = txt.split(/,\s*/); txt = parts.map((p, i) => ({ p, i, s: score(p) })).sort((a, b) => b.s - a.s || a.i - b.i).map(x => x.p).join(", ");
      }
      html += `<div class="cv-skill"><b>${E(`${si}.l.${li}.label`, l.label)}</b><span>${E(`${si}.l.${li}.text`, txt)}</span></div>`;
    });
    html += `</section>`;
  });
  el.innerHTML = html;
  el.classList.toggle("nohl", !$("#cvHighlight").checked || edit);
  el.classList.toggle("editing", edit);
  fitCv();
}
// ---- édition directe sur la feuille
function setPath(path, val) {
  const c = profile.cvData, k = path.split(".");
  if (k[0] === "name") { profile.name = val; return; }
  const sec = c.sections[+k[0]];
  if (k[1] === "title") sec.title = val;
  else if (k[1] === "l") sec.lines[+k[2]][k[3]] = val;
  else { const it = sec.items[+k[1]]; if (k[2] === "b") { it.bullets = it.bullets || []; it.bullets[+k[3]] = val; } else it[k[2]] = val; }
}
$("#paperCv").addEventListener("input", e => {
  const t = e.target.closest("[data-e]"); if (!t) return;
  setPath(t.dataset.e, t.textContent.replace(/\s+/g, " ").trim());
  clearTimeout(renderCv._s); renderCv._s = setTimeout(() => { save(); fitCv(); }, 350);
});
$("#paperCv").addEventListener("keydown", e => {
  const t = e.target.closest("[data-e]"); if (!t) return;
  const k = t.dataset.e.split(".");
  if (e.key === "Enter") {
    e.preventDefault();
    if (k[2] !== "b") { t.blur(); return; }                 // Entrée dans une puce = nouvelle puce
    const it = profile.cvData.sections[+k[0]].items[+k[1]]; const bi = +k[3];
    it.bullets = (it.bullets || []).filter((b, i) => b || i === bi); it.bullets.splice(bi + 1, 0, "");
    save(); renderCv(); $(`#paperCv [data-e="${k[0]}.${k[1]}.b.${bi + 1}"]`)?.focus();
  } else if (e.key === "Backspace" && k[2] === "b" && !t.textContent) {
    e.preventDefault();
    const it = profile.cvData.sections[+k[0]].items[+k[1]]; const bi = +k[3];
    it.bullets.splice(bi, 1); save(); renderCv();
    const prev = $(`#paperCv [data-e="${k[0]}.${k[1]}.b.${Math.max(0, bi - 1)}"]`);
    if (prev) { prev.focus(); getSelection().selectAllChildren(prev); getSelection().collapseToEnd(); }
  }
});
$("#paperCv").addEventListener("focusout", () => save());
$("#cvEdit").addEventListener("change", () => {
  $("#cvHint").textContent = $("#cvEdit").checked ? "Clique sur n'importe quel texte du CV pour le corriger. Entrée = nouvelle puce, Retour arrière sur une puce vide = la supprimer. Tout est enregistré dans ton navigateur."
    : "Clique sur une puce de l'aperçu pour la masquer ou l'afficher. Le point vert signale les puces liées à l'offre.";
  if (!$("#cvEdit").checked) { profile.cvData.sections.forEach(s => (s.items || []).forEach(it => it.bullets && (it.bullets = it.bullets.filter(Boolean)))); save(); }
  renderCv(); if (!$("#cvEdit").checked) { analyse(); renderLetter(); }
});
$("#paperCv").addEventListener("click", e => { if ($("#cvEdit").checked) return; const li = e.target.closest("li[data-k]"); if (!li) return; const k = li.dataset.k; cvOff.has(k) ? cvOff.delete(k) : cvOff.add(k); li.classList.toggle("off"); });
["#cvReorder", "#cvHighlight"].forEach(s => $(s).addEventListener("change", renderCv));

// ---------------------------------------------------------------- lettre
function fill(s, v) { return s.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m); }
const custom = k => { const b = (profile.blocks[k] || "").trim(); return b && b !== (DEFAULT_BLOCKS[k] || "").trim() ? b : ""; };
const ACR = /^(?:[A-Z0-9&]{2,5}|BNP|EY|PwC|KPMG|LCA|AXA|SA|SAS|LLP|LLC|UK|US|EU|PE|M&A)$/;
function tidyOrg(o) {
  o = (o || "").trim();
  if (o && o === o.toUpperCase() && /[A-Z]{3}/.test(o)) o = o.split(/\s+/).map(w => ACR.test(w) && w.length <= 3 ? w : w.charAt(0) + w.slice(1).toLowerCase()).join(" ");
  return o;
}
const tidyPlace = l => (l || "").split(",")[0].trim().replace(/\b([A-ZÀ-Ý])([A-ZÀ-Ý]+)\b/g, (m, a, b) => a + b.toLowerCase());
const art = w => /^[aeiouAEIOU]/.test(w) && !/^(?:uni|eur|one)/i.test(w) ? "an" : "a";
const lcFirst = t => /^[A-Z][a-z]/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;
const listJoin = a => a.length < 2 ? (a[0] || "") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
const MONTHS = { jan: "January", feb: "February", mar: "March", apr: "April", may: "May", jun: "June", jul: "July", aug: "August", sep: "September", oct: "October", nov: "November", dec: "December",
  janv: "January", fev: "February", févr: "February", avr: "April", mai: "May", juin: "June", juil: "July", août: "August", aout: "August", déc: "December" };
function parseDate(t) {   // "Sep 26", "Sept 2026", "09/2026", "2026"
  t = (t || "").trim().toLowerCase(); let m;
  if ((m = t.match(/^([a-zéû]+)\.?\s*'?(\d{2,4})/))) { const mo = MONTHS[m[1].slice(0, 4)] || MONTHS[m[1].slice(0, 3)]; let y = +m[2]; if (y < 100) y += 2000; return mo ? { label: `${mo} ${y}`, t: new Date(`${mo} 1, ${y}`).getTime() } : null; }
  if ((m = t.match(/^(\d{1,2})\/(\d{2,4})/))) { let y = +m[2]; if (y < 100) y += 2000; const d = new Date(y, +m[1] - 1, 1); return { label: d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }), t: d.getTime() }; }
  if ((m = t.match(/^((?:19|20)\d{2})/))) return { label: m[1], t: new Date(+m[1], 0, 1).getTime() };
  return null;
}
function expItems() {
  const sec = profile.cvData.sections.find(x => /experience|expérience|professional/i.test(x.title)) || profile.cvData.sections.find(x => (x.items || []).length);
  return (sec?.items || []).filter(it => it.org || it.role).map(it => {
    const [a, b] = (it.dates || "").split(/\s*[-–—]\s*|\s+to\s+/i);
    const start = parseDate(a), end = /present|today|now|current|aujourd/i.test(b || "") ? { t: Infinity } : parseDate(b);
    return { ...it, start, current: !!end && end.t > Date.now(), sc: score([it.org, it.orgDesc, it.role, ...(it.bullets || [])].join(" ")) };
  });
}
function expPara(it, nth) {
  const org = tidyOrg(it.org), city = tidyPlace(it.location);
  const desc = it.orgDesc ? `, ${art(it.orgDesc)} ${lcFirst(it.orgDesc.trim())}` : "";
  const role = (it.role || "").trim();
  const bl = (it.bullets || []).map((b, i) => ({ b: b.trim().replace(/[.;]+$/, ""), i, s: score(b) })).sort((a, b) => b.s - a.s || a.i - b.i).slice(0, 3).sort((a, b) => a.i - b.i).map(x => lcFirst(x.b));
  const did = bl.length ? ` I ${bl[0]}.${bl.length > 1 ? ` I also ${listJoin(bl.slice(1))}.` : ""}` : "";
  if (it.current && it.start) return `Since ${it.start.label}, I have been working as ${role ? `${art(role)} ${role}` : "an intern"} at ${org}${desc}${city ? `, in ${city}` : ""}.${did}`;
  const lead = nth === 0 ? "At" : "Before that, at";
  return `${lead} ${org}${desc}${city ? ` in ${city}` : ""}, I worked as ${role ? `${art(role)} ${role}` : "an intern"}.${did}`;
}
const DOMAIN_RE = [["project finance", /project finance/i], ["private equity", /private equity|lbo|buy-?out/i], ["infrastructure investment", /infra/i],
  ["M&A advisory", /m&a|merger|advisory|transaction/i], ["investment banking", /investment bank/i], ["corporate finance", /corporate finance/i],
  ["consulting", /consult/i], ["asset management", /asset management/i], ["debt finance", /debt|credit|lev(?:erage)?d? fin/i]];
const PH = t => `⟦${t}⟧`;   // passage à compléter (surligné à l'écran)
function autoLetter(v, cat) {
  const ex = expItems(), cur = ex.find(e => e.current);
  const ranked = ex.slice().sort((a, b) => b.sc - a.sc || (b.start?.t || 0) - (a.start?.t || 0));
  const top = [], seen = new Set();
  if (cur) { top.push(cur); seen.add(cur); }
  for (const e of ranked) if (top.length < 2 && !seen.has(e)) { top.push(e); seen.add(e); }
  top.sort((a, b) => (b.current - a.current) || (b.start?.t || 0) - (a.start?.t || 0));
  const allTxt = ex.map(e => [e.org, e.orgDesc, e.role].join(" ")).join(" ");
  const domains = DOMAIN_RE.filter(([, re]) => re.test(allTxt)).map(([d]) => d).slice(0, 4);
  const nInt = ex.filter(e => /intern|stagiaire|analyst|assistant/i.test(e.role || "")).length || ex.length;
  const NUM = ["", "one", "two", "three", "four", "five", "six"];
  const intro = `I would like to join the ${v.team} team at ${v.company}${v.city ? ` in ${v.city}` : ""} as ${v.role ? art(v.role) + " " + v.role : "an intern"}` +
    (ex.length ? `, building on ${NUM[nInt] || nInt} ${nInt > 1 ? "internships" : "internship"}${domains.length ? ` across ${listJoin(domains)}` : ""}.` : ".");
  const why = v.hookRaw ? `${v.hookRaw.replace(/\s*$/, "")} ${PH(`Explain in one or two sentences why this makes you want to join ${v.company}.`)}`
    : `What draws me to ${v.company} is ${PH(`a specific reason: a recent deal, a fund, the team's strategy or a sector focus`)}.`;
  const matched = offerKw.filter(([, re]) => kwRe(re).test(cvText())).map(([l]) => /^[A-Z]{2,}|^M&A|Excel|PowerPoint/.test(l) ? l : l.toLowerCase()).slice(0, 3);
  const fit = matched.length ? ` The role's focus on ${listJoin(matched)} matches the work I have done so far.` : "";
  const skills = (profile.cvData.sections.flatMap(s => s.lines || []).find(l => /technical|skills|outils|compétences/i.test(l.label))?.text || "").split(/,\s*/).filter(Boolean).slice(0, 4);
  const langs = profile.cvData.sections.flatMap(s => s.lines || []).find(l => /language|langue/i.test(l.label))?.text || "";
  const av = profile.available ? new Date(profile.available + "-01T12:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "";
  const bring = `I would bring ${skills.length ? `a solid command of ${listJoin(skills)}` : "solid modelling and analytical skills"}${langs ? `, and I speak ${langs.replace(/\s*\|\s*/g, ", ")}` : ""}.` +
    (av ? ` I am available from ${av}.` : "");
  const close = `I would welcome the opportunity to discuss how I could contribute to the ${v.team} team at ${v.company}.\n\nYours sincerely,\n\n${v.name}`;
  const body = [intro, ...top.map((e, i) => expPara(e, i)), why + fit, bring + " " + close];
  return body;
}
function letterText() {
  const b = profile.blocks, cat = $("#l_cat").value || target?.category || "ma";
  const hook = $("#l_hook").value.trim();
  const v = { company: target?.employer || "", role: $("#l_role").value, city: $("#l_city").value, team: TEAM[cat],
    hook: hook ? hook.replace(/\s*$/, " ") : "", hookRaw: hook, name: profile.name || "" };
  const date = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const header = [profile.name, profile.city, "", `${v.company}${v.city ? ", " + v.city : ""}`, "", `${profile.city ? profile.city + ", " : ""}${date}`, "", `Re: ${v.role}`, "", "Dear Hiring Team,", ""].join("\n");
  let paras;
  const hasModel = custom("intro") || custom(cat) || custom("experience") || custom("closing") || CAT_ORDER.some(c => custom(c));
  if (hasModel) {
    // ta lettre modèle (ou tes paragraphes) + ce qui est propre à l'offre
    const auto = autoLetter(v, cat);
    const intro = (custom("intro") || DEFAULT_BLOCKS.intro).replace(/^Dear[^\n]*\n+/i, "");
    const mid = [custom(cat), custom("experience")].filter(Boolean);
    const bodyExp = mid.length ? mid : auto.slice(1, -2);
    const hookSlot = intro.includes("{hook}");
    const why = hookSlot ? "" : auto[auto.length - 2];
    const hook = hookSlot ? (v.hookRaw ? v.hook : PH(`One sentence on a recent deal, fund or news of ${v.company}`) + " ") : "";
    const closing = custom("closing") || auto[auto.length - 1];
    paras = [fill(intro, { ...v, hook }), ...bodyExp.map(x => fill(x, v)), why, fill(closing, v)].filter(x => x && x.trim());
    if (!/sincerely|regards|faithfully/i.test(paras[paras.length - 1])) paras.push(`Yours sincerely,\n\n${v.name}`);
  } else paras = autoLetter(v, cat);
  return (header + "\n" + paras.map(x => x.trim()).join("\n\n")).replace(/\n{3,}/g, "\n\n").trim();
}
function renderLetter(force) {
  if (!target) { $("#paperLetter").textContent = "Choisis une offre pour générer la lettre."; return; }
  if (letterDirty && !force) return;
  $("#paperLetter").innerHTML = esc(letterText()).replace(/⟦([^⟧]*)⟧/g, '<mark class="ph">[$1]</mark>'); letterDirty = false;
  fitLetter();
}
// la lettre doit tenir sur une page A4 : police et marges réduites progressivement si besoin
function fitLetter() {
  const el = $("#paperLetter"), z = el.style.zoom, hid = el.hidden;
  el.hidden = false; el.style.zoom = 1; el.style.minHeight = "0";
  const PAGE = 297 * 96 / 25.4 - 2;
  let size = 11.2, pad = 22; el.style.fontSize = size + "pt"; el.style.padding = `${pad}mm`;
  let g = 0;
  while (el.scrollHeight > PAGE && g++ < 24) { if (pad > 15) pad -= 1.5; else size -= 0.2; el.style.fontSize = size.toFixed(1) + "pt"; el.style.padding = `${pad}mm ${pad + 1}mm`; if (size < 9.6) break; }
  el.style.minHeight = ""; el.style.zoom = z; el.hidden = hid;
}
$("#paperLetter").addEventListener("input", () => { letterDirty = true; clearTimeout(fitLetter._t); fitLetter._t = setTimeout(fitLetter, 500); });
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
// Le CV doit tenir sur UNE page A4 : on réduit légèrement la police si besoin (comme on le ferait dans Word)
function fitCv() {
  const el = $("#paperCv"); if (!el.offsetParent && el.hidden) { el.style.fontSize = ""; }
  const z = el.style.zoom; el.style.zoom = 1;
  const PAGE = 297 * 96 / 25.4 - 2;                 // hauteur A4 en px CSS
  el.style.minHeight = "0";
  let size = 10.6; el.style.fontSize = size + "pt"; el.style.lineHeight = "";
  let guard = 0;
  while (el.scrollHeight > PAGE && size > 8.6 && guard++ < 20) { size -= 0.2; el.style.fontSize = size.toFixed(1) + "pt"; }
  if (el.scrollHeight > PAGE) el.style.lineHeight = "1.22";
  el.style.minHeight = ""; el.style.zoom = z;
  const note = $("#paperNote"); if (note) note.textContent = size < 10.5 ? `Aperçu A4 · police ajustée à ${size.toFixed(1)} pt pour tenir sur une page` : "Aperçu A4 · en anglais";
}

function printPaper(kind) {
  document.body.classList.add(kind === "cv" ? "print-cv" : "print-letter");
  const z = $$(".paper").map(p => p.style.zoom); $$(".paper").forEach(p => p.style.zoom = 1);
  setTimeout(() => { window.print(); document.body.classList.remove("print-cv", "print-letter"); $$(".paper").forEach((p, i) => p.style.zoom = z[i]); }, 50);
}
$("#printCv").onclick = () => printPaper("cv");
$("#printLetter").onclick = () => printPaper("letter");
function docDownload(name, inner) {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><style>@page WordSection1{size:595.3pt 841.9pt;margin:36pt 40pt} div.WordSection1{page:WordSection1} p,li,td{margin:0;mso-margin-top-alt:0;mso-margin-bottom-alt:0;line-height:112%} ul{margin-top:0;margin-bottom:0} body{font-family:Garamond,'Times New Roman',serif;font-size:11pt} h1{text-align:center;font-size:16pt;margin:0} h4{text-transform:uppercase;border-bottom:1px solid #000;font-size:10.5pt;margin:8pt 0 3pt} ul{margin:2pt 0 2pt 14pt;padding:0} .cv-contact{text-align:center} .cv-head{font-weight:bold} .cv-loc{float:right;font-weight:normal} .cv-role{font-style:italic} .cv-dates{font-size:9.5pt;color:#333} li.off{display:none} mark{background:none}</style></head><body><div class="WordSection1">${inner}</div></body></html>`;
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([html], { type: "application/msword" })); a.download = name; a.click();
}
const fileBase = () => `${(profile.name || "CV").replace(/\W+/g, "_")}_${(target?.employer || "").replace(/\W+/g, "_")}`;
function cvDocHtml() {
  // Reconstruit le CV depuis l'aperçu (ordre et puces masquées respectés) en tableaux compatibles Word
  const P = profile, paper = $("#paperCv");
  const T = "font-family:Garamond,'EB Garamond','Times New Roman',serif;";
  let h = `<p style="${T}text-align:center;font-size:16pt;font-weight:bold;margin:0">${esc(P.name || "")}</p>
    <p style="${T}text-align:center;font-size:9.5pt;margin:0 0 6pt">${esc([P.phone, P.email].filter(Boolean).join(" | "))}</p>`;
  paper.querySelectorAll(".cv-sec").forEach(sec => {
    h += `<p style="${T}font-size:10.5pt;font-weight:bold;text-transform:uppercase;letter-spacing:.5pt;border-bottom:1px solid #000;margin:8pt 0 3pt;padding-bottom:1pt">${esc(sec.querySelector("h4").textContent)}</p>`;
    h += `<table style="width:100%;border-collapse:collapse;${T}font-size:10pt" cellpadding="0" cellspacing="0">`;
    sec.querySelectorAll(".cv-item").forEach(it => {
      const dates = it.querySelector(".cv-dates");
      const dTxt = esc(dates.childNodes[0]?.textContent || ""), dur = esc(dates.querySelector("small")?.textContent || "");
      const org = esc(it.querySelector(".cv-head b")?.textContent || ""), od = esc(it.querySelector(".org-d")?.textContent || "");
      const loc = esc(it.querySelector(".cv-loc")?.textContent || ""), role = esc(it.querySelector(".cv-role")?.textContent || "");
      const buls = [...it.querySelectorAll(".cv-bul li")].filter(li => !li.classList.contains("off")).map(li => `<li style="margin:0">${esc(li.textContent)}</li>`).join("");
      const W = "vertical-align:top;padding:0;";
      h += `<tr><td style="${W}width:78pt;font-size:9.5pt;white-space:nowrap">${dTxt}</td><td style="${W}"><b>${org}</b>${od}</td><td style="${W}width:110pt;text-align:right">${loc}</td></tr>`;
      if (role || dur) h += `<tr><td style="${W}font-size:9pt;color:#555">${dur}</td><td colspan="2" style="${W}"><i>${role}</i></td></tr>`;
      if (buls) h += `<tr><td style="${W}"></td><td colspan="2" style="${W}"><ul style="margin:0 0 0 14pt;padding:0">${buls}</ul></td></tr>`;
      h += `<tr><td colspan="3" style="height:4pt;font-size:2pt;line-height:2pt">&nbsp;</td></tr>`;
    });
    sec.querySelectorAll(".cv-skill").forEach(sk => {
      h += `<tr><td style="vertical-align:top;width:78pt;padding:0"><b>${esc(sk.querySelector("b").textContent)}</b></td><td colspan="2" style="vertical-align:top;padding:0 0 2pt">${esc(sk.querySelector("span").textContent)}</td></tr>`;
    });
    h += `</table>`;
  });
  return h;
}
// Vrai fichier Word (.docx) : même mise en page que l'aperçu, avec des tabulations (robuste dans Word)
function loadDocx() {
  if (window.docx) return Promise.resolve();
  return new Promise((res, rej) => { const sc = document.createElement("script");
    sc.src = "https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js"; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); });
}
async function cvDocx() {
  await loadDocx();
  const D = window.docx, P = profile, paper = $("#paperCv");
  const FONT = "Garamond", CM = 567, LEFT = Math.round(3.1 * CM), WIDTH = Math.round(17.8 * CM);
  const t = (text, o = {}) => new D.TextRun({ text, font: FONT, size: o.size || 20, bold: o.bold, italics: o.italics, color: o.color });
  const para = (children, o = {}) => new D.Paragraph({ children, spacing: { before: o.before || 0, after: o.after || 0, line: 252 },
    alignment: o.align, tabStops: o.tabs, indent: o.indent, border: o.border, keepNext: o.keepNext });
  const tabs = [{ type: D.TabStopType.LEFT, position: LEFT }, { type: D.TabStopType.RIGHT, position: WIDTH }];
  const kids = [
    para([t(P.name || "", { size: 32, bold: true })], { align: D.AlignmentType.CENTER }),
    para([t([P.phone, P.email].filter(Boolean).join(" | "), { size: 19 })], { align: D.AlignmentType.CENTER, after: 80 }),
  ];
  paper.querySelectorAll(".cv-sec").forEach(sec => {
    kids.push(para([t(sec.querySelector("h4").textContent.toUpperCase(), { bold: true, size: 21 })],
      { before: 140, after: 60, keepNext: true, border: { bottom: { style: D.BorderStyle.SINGLE, size: 6, color: "000000", space: 1 } } }));
    sec.querySelectorAll(".cv-item").forEach(it => {
      const dates = it.querySelector(".cv-dates"), dTxt = dates.childNodes[0]?.textContent || "", dur = dates.querySelector("small")?.textContent || "";
      const org = it.querySelector(".cv-head b")?.textContent || "", od = it.querySelector(".org-d")?.textContent || "";
      const loc = it.querySelector(".cv-loc")?.textContent || "", role = it.querySelector(".cv-role")?.textContent || "";
      kids.push(para([t(dTxt, { size: 19 }), new D.TextRun({ text: "\t", font: FONT }), t(org, { bold: true }), t(od), new D.TextRun({ text: "\t", font: FONT }), t(loc, { size: 19 })], { tabs, before: 60, keepNext: true }));
      if (role || dur) kids.push(para([t(dur, { size: 17, color: "555555" }), new D.TextRun({ text: "\t", font: FONT }), t(role, { italics: true })], { tabs, keepNext: true, indent: { left: LEFT, hanging: LEFT } }));
      it.querySelectorAll(".cv-bul li").forEach(li => {
        if (li.classList.contains("off")) return;
        kids.push(para([t("▪", { size: 14 }), new D.TextRun({ text: "\t", font: FONT }), t(li.textContent)],
          { tabs: [{ type: D.TabStopType.LEFT, position: LEFT + 260 }], indent: { left: LEFT + 260, hanging: 260 } }));
      });
    });
    sec.querySelectorAll(".cv-skill").forEach(sk => {
      kids.push(para([t(sk.querySelector("b").textContent, { bold: true }), new D.TextRun({ text: "\t", font: FONT }), t(sk.querySelector("span").textContent)],
        { tabs: [{ type: D.TabStopType.LEFT, position: LEFT }], indent: { left: LEFT, hanging: LEFT }, before: 20 }));
    });
  });
  const doc = new D.Document({ sections: [{ properties: { page: { size: { width: 11906, height: 16838 },
    margin: { top: Math.round(1.3 * CM), bottom: Math.round(1.2 * CM), left: Math.round(1.6 * CM), right: Math.round(1.6 * CM) } } }, children: kids }] });
  const blob = await D.Packer.toBlob(doc);
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `CV_${fileBase()}.docx`; a.click();
}
$("#docCv").onclick = async () => {
  const b = $("#docCv"), lbl = b.textContent; b.disabled = true; b.textContent = "Création…";
  try { await cvDocx(); toast("CV Word (.docx) téléchargé"); }
  catch (e) { console.error(e); docDownload(`CV_${fileBase()}.doc`, cvDocHtml()); toast("Export Word simplifié (.doc)"); }
  finally { b.disabled = false; b.textContent = lbl; }
};
$("#docLetter").onclick = () => docDownload(`Cover_Letter_${fileBase()}.doc`, esc($("#paperLetter").innerText).split("\n\n").map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join(""));

$("#askAssistant").onclick = () => { if (target) F.askClaude(target, "chat"); };
$("#letterClaude").onclick = () => { if (target) F.askClaude(target, "letter"); };
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
  ["name", "email", "phone", "city", "school", "available"].forEach(k => $("#p_" + k).value = profile[k] || "");
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
// ---------------------------------------------------------------- import du CV en PDF (lu localement)
const MON = "jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|janv|févr|fev|avr|mai|juin|juil|août|aout|déc";
const DATE_START = new RegExp(`^(?:(?:${MON})[a-zé]*\\.?\\s*'?\\d{2,4}|\\d{1,2}/\\d{2,4}|(?:19|20)\\d{2}|since|depuis|present|today)\\b`, "i");
const BULLET = /^[▪•●◦‣∙·\-–—*■□➢➤✓]\s*/;
const HEADING_WORDS = /experience|expérience|education|formation|skills|compétences|activities|activités|languages|langues|interests|intérêts|projects|projets|leadership|certifications|awards|extracurricular|associati|profile|profil|summary|langues/i;

async function pdfLines(file) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const lines = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n), tc = await page.getTextContent();
    const items = tc.items.filter(i => i.str.trim()).map(i => ({ s: i.str, x: i.transform[4], y: i.transform[5], w: i.width, h: Math.abs(i.transform[3]) || 10, bold: /bold|black|semibold/i.test(i.fontName + (tc.styles[i.fontName]?.fontFamily || "")) }));
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    let cur = null;
    for (const it of items) {
      if (!cur || Math.abs(cur.y - it.y) > Math.max(2.5, it.h * 0.45)) { cur = { y: it.y, page: n, items: [] }; lines.push(cur); }
      cur.items.push(it);
    }
  }
  return lines.map(l => {
    l.items.sort((a, b) => a.x - b.x);
    const cells = []; let last = null;
    for (const it of l.items) {
      if (last && it.x - (last.x + last.w) < Math.max(6, it.h * 0.9)) { cells[cells.length - 1].s += (it.x - (last.x + last.w) > 1 ? " " : "") + it.s; }
      else cells.push({ s: it.s, x: it.x });
      last = it;
    }
    cells.forEach(c => c.s = c.s.replace(/\s+/g, " ").trim());
    return { cells: cells.filter(c => c.s), y: l.y, page: l.page, x: l.items[0].x, h: Math.max(...l.items.map(i => i.h)), text: cells.map(c => c.s).join(" ").trim() };
  }).filter(l => l.text);
}

function parseCv(lines) {
  const out = { name: "", contact: "", sections: [] };
  const sizes = lines.map(l => l.h).sort((a, b) => a - b), body = sizes[Math.floor(sizes.length / 2)];
  let i = 0;
  if (lines[0] && !DATE_START.test(lines[0].text)) { out.name = lines[0].text; i = 1; }
  while (i < lines.length && i < 4 && /@|\+?\d[\d ().-]{6,}|linkedin/i.test(lines[i].text)) { out.contact += (out.contact ? " | " : "") + lines[i].text; i++; }
  const minX = Math.min(...lines.map(l => l.x));
  let sec = null, item = null, lastBullet = null;
  const isHeading = l => {
    const t = l.text; if (t.length > 45 || /\d/.test(t) || BULLET.test(t)) return false;
    const upper = t === t.toUpperCase() && /[A-Z]/.test(t);
    return (upper && t.split(" ").length <= 5) || (HEADING_WORDS.test(t) && t.split(" ").length <= 4 && l.h >= body);
  };
  for (; i < lines.length; i++) {
    const l = lines[i], t = l.text;
    if (isHeading(l)) { sec = { title: t.replace(/\b\w+/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase()).replace(/ & /g, " & "), items: [], lines: [] }; out.sections.push(sec); item = null; lastBullet = null; continue; }
    if (!sec) { sec = { title: "Experience", items: [], lines: [] }; out.sections.push(sec); }
    const c = l.cells;
    if (DATE_START.test(c[0]?.s || "")) {
      // nouvelle ligne d'expérience : [dates] [organisation - description] [lieu]
      const dates = c[0].s; let rest = c.slice(1).map(x => x.s);
      let loc = "";
      if (rest.length > 1 && /,|^[A-Z][a-zé]+$/.test(rest[rest.length - 1])) loc = rest.pop();
      const orgFull = rest.join(" ");
      const [org, ...desc] = orgFull.split(/\s+[-–—]\s+/);
      item = { dates, duration: "", org: org || "", orgDesc: desc.join(" - "), location: loc, role: "", bullets: [] };
      sec.items.push(item); lastBullet = null; continue;
    }
    if (item && !item.role && !BULLET.test(t)) {
      // ligne sous l'organisation : [(6 months)] [poste]
      let cells = c.map(x => x.s);
      if (/^\(.*\)$/.test(cells[0])) item.duration = cells.shift();
      item.role = cells.join(" "); continue;
    }
    if (BULLET.test(t)) {
      const txt = t.replace(BULLET, "");
      if (item) { item.bullets.push(txt); lastBullet = item.bullets.length - 1; }
      else sec.lines.push({ label: "", text: txt });
      continue;
    }
    const kv = t.match(/^([A-Za-zÀ-ÿ &/]{3,30})\s*:\s*(.+)$/);
    if (kv && (!item || /skill|language|langue|interest|intérêt|technical|outils|tools/i.test(sec.title))) { sec.lines.push({ label: kv[1].trim(), text: kv[2].trim() }); item = null; continue; }
    if (item && lastBullet != null) { item.bullets[lastBullet] += " " + t; continue; }       // suite d'une puce
    if (item && /^\(.*\)$/.test(c[0]?.s || "") && !item.duration) { item.duration = c[0].s; continue; }
    if (item) { item.role = item.role ? item.role + " " + t : t; continue; }
    if (sec.lines.length) sec.lines[sec.lines.length - 1].text += " " + t; else sec.lines.push({ label: "", text: t });
  }
  out.sections.forEach(s => { if (!s.items.length) delete s.items; if (!s.lines.length) delete s.lines; if (!s.items && !s.lines) s.items = []; });
  return out;
}

function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve();
  return new Promise((res, rej) => { const sc = document.createElement("script");
    sc.src = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js"; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); });
}
const setPdfStatus = t => { ["#pdfStatus", "#pdfStatusSide"].forEach(s => { if ($(s)) $(s).textContent = t; }); };
document.addEventListener("change", async e => {
  if (!e.target.classList?.contains("pdf-input")) return;
  const f = e.target.files[0]; if (!f) return;
  e.target.value = "";
  setPdfStatus("Lecture du PDF dans ton navigateur…");
  try { await loadPdfJs(); } catch { setPdfStatus("Le lecteur PDF n'a pas pu se charger (connexion ou bloqueur de contenu). Réessaie ou remplis les sections dans « Modifier mon profil »."); toast("Lecteur PDF indisponible"); return; }
  try {
    const lines = await pdfLines(f), cv = parseCv(lines);
    if (!cv.sections.some(s => (s.items || []).length || (s.lines || []).length)) throw new Error("vide");
    const contact = cv.contact || "";
    profile.name = profile.name || cv.name;
    profile.email = profile.email || (contact.match(/[\w.+-]+@[\w-]+\.[\w.-]+/) || [""])[0];
    profile.phone = profile.phone || (contact.match(/\+?\d[\d ().-]{7,}\d/) || [""])[0].trim();
    profile.cvData = { sections: cv.sections };
    profile.cv = lines.map(l => l.text).join("\n");
    save(); renderProfileEditor(); renderAll();
    const n = cv.sections.reduce((a, s) => a + (s.items || []).length, 0);
    setPdfStatus(`✔ CV importé : ${n} expériences / formations dans ${cv.sections.length} sections. Vérifie-les dans « Modifier mon profil ». Le PDF n'a été envoyé nulle part.`);
    toast("CV importé depuis le PDF ✔");
  } catch (err) {
    console.error(err);
    setPdfStatus(`Impossible de lire ce PDF automatiquement (${err && err.message ? err.message : "format inhabituel"}). S'il s'agit d'un scan, remplis les sections dans « Modifier mon profil ».`);
    toast("Lecture du PDF impossible");
  }
});

// ---------------------------------------------------------------- lettre modèle (PDF, lue localement)
function modelStatus() {
  const m = profile.model;
  $("#modelStatus").innerHTML = m ? `✔ Lettre modèle chargée (${m.n} paragraphes${m.company ? `, « ${esc(m.company)} » remplacé par l'entreprise visée` : ""}). Ses paragraphes sont repris et adaptés à chaque offre.`
    : (custom("intro") || custom("experience") ? "✔ Tes paragraphes de lettre (profil) sont utilisés." : "Aucune lettre modèle : la lettre est écrite à partir de ton CV. Importe ta lettre pour qu'elle serve de modèle.");
}
$("#modelPdf").onchange = async e => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  $("#modelStatus").textContent = "Lecture de ta lettre dans ton navigateur…";
  try {
    await loadPdfJs();
    const lines = await pdfLines(f);
    // paragraphes : un saut vertical plus grand que l'interligne habituel
    const gaps = lines.slice(1).map((l, i) => l.page === lines[i].page ? lines[i].y - l.y : 0).filter(g => g > 0).sort((a, b) => a - b);
    const lh = gaps[Math.floor(gaps.length * 0.35)] || 12;
    const paras = []; let cur = [];
    lines.forEach((l, i) => {
      const gap = i && l.page === lines[i - 1].page ? lines[i - 1].y - l.y : lh;
      if (i && (gap > lh * 1.45 || l.page !== lines[i - 1].page && /^\s*[A-Z]/.test(l.text) && /[.:]$/.test(lines[i - 1].text))) { paras.push(cur); cur = []; }
      cur.push(l.text);
    });
    if (cur.length) paras.push(cur);
    const P = paras.map(p => p.join(" ").replace(/-\s+(?=[a-z])/g, "").replace(/\s+/g, " ").trim()).filter(Boolean);
    const d = P.findIndex(p => /^(dear|to whom|madame|monsieur|hello)/i.test(p));
    let head = d > 0 ? P.slice(0, d) : [], body = P.slice(d >= 0 ? d : 0);
    if (d >= 0) body[0] = body[0].replace(/^(dear|to whom|madame|monsieur|hello)[^,]*,\s*/i, "");
    body = body.filter(Boolean);
    const sig = body.findIndex(p => /^(yours|sincerely|kind regards|best regards|regards|cordialement)/i.test(p));
    if (sig >= 0) body = body.slice(0, sig);
    if (body.length < 2) throw new Error("paragraphes introuvables");
    // entreprise et poste du modèle, à remplacer par ceux de chaque offre
    const re = head.join(" \n ").match(/\b(?:Re|Objet|Subject)\s*:\s*([^\n]+)/i);
    let role = re ? re[1].replace(/\s+\d{4}.*$/, "").trim() : "";
    const freq = {};
    body.join(" ").replace(/\b(?:at|join|joining|to|with|within|for)\s+((?:[A-Z][\w&'.-]*\s?){1,4})/g, (m, c) => { c = c.trim(); if (!/^(I|The|My|In|This|Brazil|Africa|Europe|Paris|London|Latin)$/.test(c) && !(profile.name || "").includes(c)) freq[c] = (freq[c] || 0) + 1; });
    const cvOrgs = expItems().map(e => tidyOrg(e.org).toLowerCase());
    const company = Object.entries(freq).filter(([c]) => !cvOrgs.some(o => o.includes(c.toLowerCase()) || c.toLowerCase().includes(o))).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
    const sub = t => { if (company) t = t.split(company).join("{company}"); if (role && role.length > 4) t = t.split(role).join("{role}"); return t; };
    const B = body.map(sub);
    // l'accroche propre à l'ancienne entreprise devient un emplacement {hook}, et sa ville devient {city}
    const k = B[0].search(/(?:^|[.!?]\s+)I(?: would| am|'m| wish| want| was)\b/);
    B[0] = "{hook}" + (k > 0 ? B[0].slice(k).replace(/^[.!?]\s+/, "") : B[0]);
    B[0] = B[0].replace(/(\{company\}[^.]*?) in ([A-Z][\wÀ-ÿ-]+(?: [A-Z][\wÀ-ÿ-]+)?)\b/, "$1 in {city}");
    profile.blocks = { ...profile.blocks, intro: B[0], experience: B.slice(1, -1).join("\n\n"), closing: B.length > 1 ? B[B.length - 1] + "\n\nYours sincerely,\n\n{name}" : DEFAULT_BLOCKS.closing };
    CAT_ORDER.forEach(c => { if (!custom(c)) profile.blocks[c] = ""; });
    profile.model = { n: body.length, company, role, at: new Date().toISOString().slice(0, 10) };
    save(); modelStatus(); renderProfileEditor(); renderLetter(true);
    toast("Lettre modèle importée ✔");
  } catch (err) {
    console.error(err);
    $("#modelStatus").textContent = `Impossible de découper cette lettre (${err.message || "format inhabituel"}). Colle plutôt tes paragraphes dans « Modifier mon profil ».`;
  }
};

$("#importProfile").onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try { const p = JSON.parse(await f.text()); profile = migrate({ ...profile, ...p, blocks: { ...(p.blocks || {}) } }); save(); renderProfileEditor(); renderAll(); toast("Profil importé ✔"); }
  catch { toast("Fichier invalide"); }
  e.target.value = "";
};
$("#exportProfile").onclick = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" })); a.download = "mon-profil-finance-jobs.json"; a.click(); };
$("#clearProfile").onclick = () => { if (!confirm("Effacer ton profil, ton CV et tes paragraphes de lettre de ce navigateur ?")) return; store.del("fjr_profile"); profile = migrate(null); renderProfileEditor(); renderAll(); toast("Profil effacé"); };

function renderAll() { analyse(); renderCv(); renderLetter(); fitPaper(); modelStatus(); }
renderAll();
})();
