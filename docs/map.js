/* Carte interactive : pays colorés selon le nombre d'offres, bulles par ville,
   panneau de détail (métiers, types de poste, employeurs, villes, offres) au clic. */
(() => {
"use strict";
const F = window.FJR, { S, CAT, CAT_ORDER, LEVELS, $, esc, catColor, flag, logoHtml, rel } = F;

// ISO 3166 numérique (world-atlas) -> alpha-2
const NUM2A2 = { "840": "US", "124": "CA", "826": "GB", "250": "FR", "276": "DE", "756": "CH", "528": "NL", "056": "BE", "442": "LU",
  "380": "IT", "724": "ES", "620": "PT", "372": "IE", "040": "AT", "752": "SE", "578": "NO", "208": "DK", "246": "FI", "616": "PL",
  "203": "CZ", "348": "HU", "642": "RO", "300": "GR", "784": "AE", "682": "SA", "634": "QA", "414": "KW", "048": "BH", "512": "OM",
  "376": "IL", "792": "TR", "818": "EG", "504": "MA", "710": "ZA", "566": "NG", "404": "KE", "288": "GH", "384": "CI", "686": "SN",
  "788": "TN", "702": "SG", "344": "HK", "156": "CN", "392": "JP", "410": "KR", "356": "IN", "036": "AU", "554": "NZ", "158": "TW",
  "764": "TH", "458": "MY", "360": "ID", "608": "PH", "704": "VN", "076": "BR", "484": "MX", "152": "CL", "170": "CO", "604": "PE",
  "032": "AR", "858": "UY", "591": "PA", "643": "RU", "804": "UA", "586": "PK", "050": "BD", "012": "DZ", "231": "ET", "703": "SK",
  "705": "SI", "191": "HR", "100": "BG", "688": "RS", "233": "EE", "428": "LV", "440": "LT", "196": "CY", "352": "IS", "400": "JO", "422": "LB" };
const REGION_VIEW = { "Europe": [[-12, 35], [32, 61]], "Amérique du Nord": [[-128, 22], [-60, 58]], "Amérique latine": [[-95, -40], [-33, 25]],
  "Moyen-Orient & Afrique": [[-18, -35], [60, 38]], "Asie-Pacifique": [[68, -42], [155, 45]] };
const STYLE = dark => `https://tiles.openfreemap.org/styles/${dark ? "dark" : "positron"}`;

let map, world, ready = false, sel = { type: "world" }, hoverId = null;
const isDark = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

document.addEventListener("fjr:tab", e => { if (e.detail === "map") init(); });
document.addEventListener("fjr:filtered", () => { if (ready) { refresh(); renderPanel(); } });
document.addEventListener("fjr:theme", () => { if (map) { ready = false; map.setStyle(STYLE(isDark()), { diff: false }); } });

async function init() {
  if (map) { setTimeout(() => map.resize(), 30); return; }
  if (!window.maplibregl) { $("#map").innerHTML = `<p class="empty">La carte n'a pas pu se charger.</p>`; return; }
  map = new maplibregl.Map({ container: "map", style: STYLE(isDark()), center: [10, 28], zoom: 1.35, minZoom: 1, maxZoom: 11,
    attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
  map.touchZoomRotate.disableRotation();
  const styleReady = new Promise(r => map.once("style.load", r));
  try {
    const topo = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json").then(r => r.json());
    world = topojson.feature(topo, topo.objects.countries);
    world.features.forEach((f, i) => { f.properties.cc = NUM2A2[String(f.id ?? "").padStart(3, "0")] || ""; f.id = i + 1; });
  } catch { world = { type: "FeatureCollection", features: [] }; }
  await styleReady;
  addLayers();
  map.on("style.load", addLayers);   // changement de thème
  bindEvents();
}

function addLayers() {
  if (map.getSource("countries")) return;
  const first = map.getStyle().layers.find(l => l.type === "symbol")?.id;
  map.addSource("countries", { type: "geojson", data: world });
  map.addLayer({ id: "country-fill", type: "fill", source: "countries", paint: { "fill-color": "rgba(0,0,0,0)", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 2, 0.85, 4, 0.45, 6, 0.18] } }, first);
  map.addLayer({ id: "country-line", type: "line", source: "countries", paint: {
    "line-color": css("--text"), "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 1.6, ["boolean", ["feature-state", "sel"], false], 2, 0],
    "line-opacity": 0.8 } }, first);
  map.addSource("cities", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  map.addLayer({ id: "city-halo", type: "circle", source: "cities", paint: {
    "circle-radius": ["+", ["interpolate", ["linear"], ["sqrt", ["get", "n"]], 1, 7, 6, 17, 15, 34], 3],
    "circle-color": css("--surface"), "circle-opacity": 0.9 } });
  map.addLayer({ id: "city-dot", type: "circle", source: "cities", paint: {
    "circle-radius": ["interpolate", ["linear"], ["sqrt", ["get", "n"]], 1, 7, 6, 17, 15, 34],
    "circle-color": css("--bubble"), "circle-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 1, 0.86] } });
  map.addLayer({ id: "city-n", type: "symbol", source: "cities", layout: {
    "text-field": ["to-string", ["get", "n"]], "text-font": ["Noto Sans Bold"], "text-size": ["interpolate", ["linear"], ["get", "n"], 1, 10, 50, 13],
    "text-allow-overlap": true, "text-ignore-placement": true }, paint: { "text-color": css("--surface") } });
  ready = true; refresh(); renderPanel();
}

function aggregates(jobs) {
  const byCc = {}, byCity = {};
  jobs.forEach(j => {
    if (j.cc) (byCc[j.cc] ||= []).push(j);
    if (j.lat != null) { const k = `${(j.city || j.location)}|${j.cc}`; (byCity[k] ||= { jobs: [], lat: j.lat, lon: j.lon, city: j.city || j.location, cc: j.cc, country: j.country }).jobs.push(j); }
  });
  return { byCc, byCity };
}

function refresh() {
  if (!ready) return;
  const { byCc, byCity } = aggregates(S.filtered);
  const max = Math.max(1, ...Object.values(byCc).map(a => a.length));
  const steps = [1, 2, 3, 5, 10, 20, 50, 100].filter(v => v <= max * 1.01);
  const ramp = ["--seq-0", "--seq-1", "--seq-2", "--seq-3", "--seq-4", "--seq-5", "--seq-6", "--seq-7"].map(css);
  const expr = ["match", ["get", "cc"]];
  Object.entries(byCc).forEach(([cc, arr]) => { const n = arr.length; let i = 0; steps.forEach((s, k) => { if (n >= s) i = k; }); expr.push(cc, ramp[Math.min(7, i)]); });
  expr.push("rgba(0,0,0,0)");
  map.setPaintProperty("country-fill", "fill-color", expr.length > 3 ? expr : "rgba(0,0,0,0)");
  const feats = Object.values(byCity).map((c, i) => ({ type: "Feature", id: i + 1, geometry: { type: "Point", coordinates: [c.lon, c.lat] },
    properties: { n: c.jobs.length, city: c.city, cc: c.cc, country: c.country } }));
  map.getSource("cities").setData({ type: "FeatureCollection", features: feats.sort((a, b) => b.properties.n - a.properties.n) });
  $("#mapLegend").innerHTML = `<b style="color:var(--text)">Offres par pays</b><div class="ramp">${steps.map((s, k) => `<span style="background:${ramp[k]}"></span>`).join("")}</div>
    <div class="ends"><span>${steps[0]}</span><span>${steps[steps.length - 1]}+</span></div>
    <div style="display:flex;align-items:center;gap:.4rem"><span style="width:12px;height:12px;border-radius:50%;background:var(--bubble);display:inline-block"></span>bulle = offres par ville</div>`;
}

function bindEvents() {
  const tip = $("#mapTip");
  const showTip = (e, html) => { tip.innerHTML = html; tip.hidden = false; const r = $("#map").getBoundingClientRect();
    tip.style.left = Math.min(e.point.x + 14, r.width - 250) + "px"; tip.style.top = (e.point.y + 14) + "px"; };
  const setHover = (src, id) => { if (hoverId) map.setFeatureState(hoverId, { hover: false }); hoverId = id ? { source: src, id } : null; if (hoverId) map.setFeatureState(hoverId, { hover: true }); };
  map.on("mousemove", "city-dot", e => {
    const f = e.features[0]; map.getCanvas().style.cursor = "pointer"; setHover("cities", f.id);
    const js = S.filtered.filter(j => (j.city || j.location) === f.properties.city && j.cc === f.properties.cc);
    showTip(e, `<b>${f.properties.n}</b> offre${f.properties.n > 1 ? "s" : ""}<small>${flag(f.properties.cc)} ${esc(f.properties.city)} · ${esc(topCat(js))}</small><small>Cliquer pour le détail</small>`);
  });
  map.on("mousemove", "country-fill", e => {
    if (map.queryRenderedFeatures(e.point, { layers: ["city-dot"] }).length) return;
    const f = e.features[0], cc = f.properties.cc, js = S.filtered.filter(j => j.cc === cc);
    map.getCanvas().style.cursor = js.length ? "pointer" : ""; setHover("countries", f.id);
    showTip(e, `<b>${js.length}</b> offre${js.length > 1 ? "s" : ""}<small>${flag(cc)} ${esc(js[0]?.country || f.properties.name)}${js.length ? " · " + esc(topCat(js)) : ""}</small>`);
  });
  map.on("mouseleave", "country-fill", () => { tip.hidden = true; setHover(); map.getCanvas().style.cursor = ""; });
  map.on("mouseleave", "city-dot", () => { tip.hidden = true; setHover(); map.getCanvas().style.cursor = ""; });
  map.on("click", e => {
    const c = map.queryRenderedFeatures(e.point, { layers: ["city-dot"] })[0];
    if (c) { selectCity(c.properties.city, c.properties.cc); return; }
    const f = map.queryRenderedFeatures(e.point, { layers: ["country-fill"] })[0];
    if (f && S.filtered.some(j => j.cc === f.properties.cc)) selectCountry(f.properties.cc);
    else { sel = { type: "world" }; markSel(); renderPanel(); }
  });
}
function topCat(js) { const c = {}; js.forEach(j => c[j.category] = (c[j.category] || 0) + 1); const t = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; return t ? `surtout ${CAT[t[0]]}` : ""; }
function markSel() {
  if (!world) return;
  world.features.forEach(f => map.setFeatureState({ source: "countries", id: f.id }, { sel: sel.type !== "world" && f.properties.cc === sel.cc }));
}
const pad = () => innerWidth > 1000 ? { top: 40, bottom: 40, left: 40, right: 400 } : { top: 30, bottom: innerHeight * 0.4, left: 30, right: 30 };
function bboxOf(geom) {
  let b = [180, 90, -180, -90];
  const walk = c => typeof c[0] === "number" ? (b = [Math.min(b[0], c[0]), Math.min(b[1], c[1]), Math.max(b[2], c[0]), Math.max(b[3], c[1])]) : c.forEach(walk);
  walk(geom.coordinates); return [[b[0], b[1]], [b[2], b[3]]];
}
function selectCountry(cc) {
  sel = { type: "country", cc }; markSel(); renderPanel();
  const f = world.features.find(x => x.properties.cc === cc);
  const pts = S.filtered.filter(j => j.cc === cc && j.lat != null);
  let b = f && !["US", "RU", "FR", "NO"].includes(cc) ? bboxOf(f.geometry) : null;
  if (!b && pts.length) { const xs = pts.map(j => j.lon), ys = pts.map(j => j.lat); b = [[Math.min(...xs) - 2, Math.min(...ys) - 2], [Math.max(...xs) + 2, Math.max(...ys) + 2]]; }
  if (b) map.fitBounds(b, { padding: pad(), maxZoom: 6, duration: 900 });
}
function selectCity(city, cc) {
  sel = { type: "city", city, cc }; markSel(); renderPanel();
  const j = S.filtered.find(x => (x.city || x.location) === city && x.cc === cc);
  if (j) map.flyTo({ center: [j.lon, j.lat], zoom: Math.max(map.getZoom(), 7), padding: pad(), duration: 900 });
}
function selectRegion(r) { if (REGION_VIEW[r]) map.fitBounds(REGION_VIEW[r], { padding: pad(), duration: 900 }); }

// ---------------------------------------------------------------- panneau
function bars(entries, colorFn, kind) {
  const max = Math.max(1, ...entries.map(e => e[2]));
  return `<div class="bars">${entries.map(([key, label, n]) =>
    `<div class="bar" data-${kind}="${esc(key)}" tabindex="0" title="${esc(label)} : ${n} offre${n > 1 ? "s" : ""}"><span class="lbl">${colorFn ? `<span style="width:8px;height:8px;border-radius:2px;background:${colorFn(key)};flex:none"></span>` : ""}${esc(label)}</span>
      <span class="track"><span class="fill" style="width:${(n / max) * 100}%;${colorFn ? `background:${colorFn(key)}` : ""}"></span></span><span class="val">${n}</span></div>`).join("")}</div>`;
}
function rowsHtml(items) { return `<div class="rows">${items.join("")}</div>`; }
function renderPanel() {
  const P = $("#mapPanel"); if (!P) return;
  let js = S.filtered, head;
  if (sel.type === "country") js = js.filter(j => j.cc === sel.cc);
  if (sel.type === "city") js = js.filter(j => (j.city || j.location) === sel.city && j.cc === sel.cc);
  if (sel.type !== "world" && !js.length) { sel = { type: "world" }; js = S.filtered; }
  const cnt = (k) => js.reduce((m, j) => (m[j[k]] = (m[j[k]] || 0) + 1, m), {});
  const cats = cnt("category"), lv = cnt("seniority");
  if (sel.type === "world") head = `<div class="ph"><span class="flag">🌍</span><div><h2>Monde</h2><span class="muted small">${js.length} offres · clique sur un pays ou une ville</span></div></div>`;
  else if (sel.type === "country") head = `<button class="back" data-back>← Monde</button><div class="ph"><span class="flag">${flag(sel.cc)}</span><div><h2>${esc(js[0].country)}</h2><span class="muted small">${js.length} offre${js.length > 1 ? "s" : ""}</span></div></div>`;
  else head = `<button class="back" data-back-country="${sel.cc}">← ${esc(js[0].country)}</button><div class="ph"><span class="flag">${flag(sel.cc)}</span><div><h2>${esc(sel.city)}</h2><span class="muted small">${js.length} offre${js.length > 1 ? "s" : ""}</span></div></div>`;

  const kp = `<div class="mini-kpis"><div><b>${lv.Stage || 0}</b><span>stages</span></div><div><b>${lv.VIE || 0}</b><span>VIE</span></div><div><b>${(lv.Graduate || 0) + (lv["Analyst 1"] || 0)}</b><span>graduate / analyst</span></div></div>`;
  const catBars = bars(CAT_ORDER.filter(c => cats[c]).map(c => [c, CAT[c], cats[c]]).sort((a, b) => b[2] - a[2]), catColor, "cat");
  const lvBars = bars(LEVELS.filter(l => lv[l]).map(l => [l, l, lv[l]]), null, "level");
  let geoBlock = "";
  if (sel.type === "world") {
    const rg = cnt("region"); const cc = {}; js.forEach(j => { if (j.cc) cc[j.cc] = cc[j.cc] || { n: 0, name: j.country }; if (j.cc) cc[j.cc].n++; });
    geoBlock = `<div><h3>Par région</h3>${bars(Object.entries(rg).filter(([r]) => r !== "Autre").sort((a, b) => b[1] - a[1]).map(([r, n]) => [r, r, n]), null, "region")}</div>
      <div><h3>Top pays</h3>${rowsHtml(Object.entries(cc).sort((a, b) => b[1].n - a[1].n).slice(0, 12).map(([c, o]) => `<div class="row" data-cc="${c}"><span style="font-size:1.1rem">${flag(c)}</span><span class="grow">${esc(o.name)}</span><span class="n">${o.n}</span></div>`))}</div>`;
  } else if (sel.type === "country") {
    const cities = {}; js.forEach(j => { const c = j.city || j.location; cities[c] = (cities[c] || 0) + 1; });
    geoBlock = `<div><h3>Villes</h3>${rowsHtml(Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([c, n]) => `<div class="row" data-city="${esc(c)}"><span class="grow">${esc(c)}</span><span class="n">${n}</span></div>`))}</div>`;
  }
  const emps = {}; js.forEach(j => { emps[j.employer] ||= { n: 0, j }; emps[j.employer].n++; });
  const empBlock = `<div><h3>Employeurs</h3>${rowsHtml(Object.entries(emps).sort((a, b) => b[1].n - a[1].n).slice(0, 8).map(([e, o]) => `<div class="row" data-emp="${esc(e)}">${logoHtml(o.j)}<span class="grow">${esc(e)}</span><span class="n">${o.n}</span></div>`))}</div>`;
  const jobsBlock = sel.type === "world" ? "" : `<div><h3>Offres</h3>${rowsHtml(js.slice(0, 40).map(j => `<div class="row" data-job="${j.id}">${logoHtml(j)}<span class="grow">${esc(j.title)}<small>${esc(j.employer)} · ${esc(j.seniority)} · ${j.posted ? rel(j.posted) : ""}</small></span></div>`))}${js.length > 40 ? `<p class="muted small">… et ${js.length - 40} autres</p>` : ""}</div>`;
  const cta = sel.type === "world" ? "" : `<button class="btn wide" data-tolist>${js.length > 1 ? `Voir ces ${js.length} offres` : "Voir cette offre"} dans la liste</button>`;
  P.scrollTop = 0;
  P.innerHTML = `${head}${kp}<div><h3>Par métier</h3>${catBars}</div><div><h3>Par type de poste</h3>${lvBars}</div>${geoBlock}${empBlock}${jobsBlock}${cta}`;
}
$("#mapPanel").addEventListener("click", e => {
  const t = e.target.closest("[data-back],[data-back-country],[data-cc],[data-city],[data-emp],[data-job],[data-tolist],[data-cat],[data-level],[data-region]"); if (!t) return;
  const d = t.dataset;
  if ("back" in d) { sel = { type: "world" }; markSel(); renderPanel(); map.flyTo({ center: [10, 28], zoom: 1.35, duration: 900 }); }
  else if (d.backCountry) selectCountry(d.backCountry);
  else if (d.cc) selectCountry(d.cc);
  else if (d.city) selectCity(d.city, sel.cc);
  else if (d.job) F.openJob(S.data.jobs.find(j => j.id === d.job));
  else if (d.emp) { F.setFilter("employer", d.emp); }
  else if (d.cat) { F.setFilter("cat", S.cats.size === 1 && S.cats.has(d.cat) ? "" : d.cat); }
  else if (d.level) { F.setFilter("level", S.level === d.level ? "" : d.level); }
  else if (d.region) selectRegion(d.region);
  else if ("tolist" in d) {
    if (sel.type === "city") F.setFilter("city", sel.city);
    const js = S.filtered.find(j => j.cc === sel.cc); if (js) F.setFilter("country", js.country);
    F.switchTab("list");
  }
});
})();
