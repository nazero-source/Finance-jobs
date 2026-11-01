"""Lance la collecte complète et écrit docs/data/jobs.json + meta.json.

Usage : python scraper/run.py
"""
import concurrent.futures as cf, datetime as dt, hashlib, json, os, re, sys, time, traceback

sys.path.insert(0, os.path.dirname(__file__))
import employers as E
import fetchers as F
from classify import classify, title_prefilter, CATEGORIES
from salary import extract, estimate, calibrate, fmt
from geo import Geocoder, region_of

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "data")
TODAY = dt.date.today().isoformat()

EMAIL_RX = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
EMAIL_OK = re.compile(r"recruit|campus|career|talent|graduate|intern|jobs|hr|rh|stage|emploi|hiring", re.I)
RECRUITER_RX = re.compile(r"(?:recruiter|recruiting contact|talent partner|contact)\s*[:\-]\s*([A-Z][a-z]+(?: [A-Z][a-zA-Z'\-]+){1,2})")


def sources():
    s = []
    for args in E.WORKDAY:
        s.append((f"Workday · {args[0]} · {args[4]}", F.workday, args))
    for args in E.ORACLE:
        s.append((f"Oracle · {args[0]} · {args[3]}", F.oracle, args))
    s.append(("Goldman Sachs", F.goldman, E.GOLDMAN))
    for args in E.GREENHOUSE:
        s.append((f"Greenhouse · {args[0]}", F.greenhouse, args))
    for args in E.LEVER:
        s.append((f"Lever · {args[0]}", F.lever, args))
    for args in E.WORKABLE:
        s.append((f"Workable · {args[0]}", F.workable, args))
    for args in E.RECRUITEE:
        s.append((f"Recruitee · {args[0]}", F.recruitee, args))
    for args in E.SMARTRECRUITERS:
        s.append((f"SmartRecruiters · {args[0]}", F.smartrecruiters, args))
    for args in E.PERSONIO:
        s.append((f"Personio · {args[0]}", F.personio, args))
    for args in E.TEAMTAILOR:
        s.append((f"Teamtailor · {args[0]}", F.teamtailor, args))
    for args in E.PINPOINT:
        s.append((f"Pinpoint · {args[0]}", F.pinpoint, args))
    for args in E.JAZZHR:
        s.append((f"JazzHR · {args[0]}", F.jazzhr, args))
    for args in E.SUCCESSFACTORS:
        s.append((f"SuccessFactors · {args[0]}", F.successfactors, args))
    for args in E.AVATURE:
        s.append((f"Avature · {args[0]}", F.avature, args))
    for args in E.HTML_PAGES:
        s.append((f"Site carrière · {args[0]}", F.html_links, args))
    for args in E.BAMBOOHR:
        s.append((f"BambooHR · {args[0]}", F.bamboohr, args))
    for args in E.ASHBY:
        s.append((f"Ashby · {args[0]}", F.ashby, args))
    for args in E.EIGHTFOLD:
        s.append((f"Eightfold · {args[0]}", F.eightfold, args))
    s.append(("Site carrière · Crédit Agricole CIB", F.cacib, E.CACIB))
    if os.environ.get("ADZUNA_APP_ID"):
        s.append(("Agrégateur · Adzuna", F.adzuna, ()))
    if any(k.startswith("JOOBLE_API_KEY") for k in os.environ):
        s.append(("Agrégateur · Jooble", F.jooble, ()))
    return s


def fetch_all():
    raw, report = [], {}
    def run(src):
        label, fn, args = src
        t = time.time()
        try:
            res = fn(*args)
            return label, res, None, time.time() - t
        except Exception as e:
            return label, [], f"{type(e).__name__}: {e}", time.time() - t
    with cf.ThreadPoolExecutor(8) as ex:
        for label, res, err, secs in ex.map(run, sources()):
            report[label] = {"fetched": len(res), "error": err, "seconds": round(secs, 1)}
            print(f"{label:55s} {len(res):5d} {'ERREUR ' + err if err else ''}", flush=True)
            for j in res:
                j["_src"] = label
            raw.extend(res)
    return raw, report


def enrich(j):
    """Description + classement final (appelé seulement pour les offres qui passent le 1er filtre)."""
    if j.get("desc_fn"):
        try:
            extra = j["desc_fn"]() or {}
            for k, v in extra.items():
                if v:
                    j[k] = v
        except Exception:
            pass
    j.pop("desc_fn", None)
    c = classify(j["title"], j.get("desc", ""), j["etype"], j.get("experience", ""))
    if not c:
        return None
    j.update(c)
    return j


def main():
    t0 = time.time()
    prev = {}
    try:
        with open(os.path.join(OUT, "jobs.json")) as f:
            for p in json.load(f)["jobs"]:
                prev[p["id"]] = p
    except Exception:
        pass

    raw, report = fetch_all()
    cand = [j for j in raw if title_prefilter(j["title"], j["etype"])]
    # dédoublonnage avant enrichissement
    uniq = {}
    for j in cand:
        uniq.setdefault((j["employer"], j["native_id"]), j)
    cand = list(uniq.values())
    # Les agrégateurs reprennent souvent des offres déjà lues à la source : on garde la version directe
    norm = lambda x: F.re.sub(r"[^a-z0-9]", "", (x or "").lower())
    direct = {(norm(j["title"]), norm(j["location"])[:12]) for j in cand if not j["source"].startswith(("Jooble", "Adzuna"))}
    direct_emp = {norm(j["employer"])[:8] for j in cand if not j["source"].startswith(("Jooble", "Adzuna"))}
    seen_agg = set()
    def keep_agg(j):
        if not j["source"].startswith(("Jooble", "Adzuna")):
            return True
        k = (norm(j["title"]), norm(j["employer"])[:8])
        if (norm(j["title"]), norm(j["location"])[:12]) in direct or k in seen_agg:
            return False
        if norm(j["employer"])[:8] in direct_emp and any(norm(j["title"]) == t for t, _ in direct):
            return False
        seen_agg.add(k)
        return True
    cand = [j for j in cand if keep_agg(j)]
    print(f"\n{len(raw)} offres brutes, {len(cand)} après filtre titre", flush=True)

    with cf.ThreadPoolExecutor(12) as ex:
        kept = [j for j in ex.map(enrich, cand) if j]
    print(f"{len(kept)} offres retenues après classement", flush=True)

    geo = Geocoder()
    jobs, seen_ids = [], set()
    for j in kept:
        jid = hashlib.sha1(f"{j['employer']}|{j['native_id']}".encode()).hexdigest()[:12]
        if jid in seen_ids:
            continue
        # doublons de la même offre publiée sous deux identifiants (même employeur, titre, lieu)
        key2 = (j["employer"], j["title"].strip().lower(), F.re.sub(r"\W", "", j["location"].lower()))
        if key2 in seen_ids:
            continue
        seen_ids.update([jid, key2])

        loc_q = j["location"].replace(j["employer"], "").strip(" -")
        if j.get("country_hint") and j["country_hint"].lower() not in loc_q.lower() and len(j["country_hint"]) > 2:
            loc_q = f"{loc_q}, {j['country_hint']}"
        g = geo.lookup(loc_q)
        if not g and j.get("country_hint"):
            g = geo.lookup(j["country_hint"])
        if j.get("latlon") and g:
            g = dict(g, lat=j["latlon"][0], lon=j["latlon"][1])

        desc = j.get("desc") or ""
        sal = extract(desc)
        if not sal and j.get("salary_raw"):
            lo, hi = j["salary_raw"]
            sal = {"lo": lo, "hi": hi or lo, "cur": "", "unit": "an", "estimated": False, "basis": "annonce"}

        emails = sorted({e.rstrip(".") for e in EMAIL_RX.findall(desc) if EMAIL_OK.search(e)})[:3]
        recruiters = sorted(set(RECRUITER_RX.findall(desc)))[:3]

        old = prev.get(jid, {})
        jobs.append({
            "id": jid, "title": j["title"].strip(), "employer": j["employer"], "employer_type": j["etype"],
            "category": j["category"], "contract": j["contract"], "seniority": j["seniority"],
            "url": j["url"], "source": j["source"],
            "location": F.re.sub(r"\s+", " ", j["location"]).strip(),
            "city": (g or {}).get("city", ""), "country": (g or {}).get("country", j.get("country_hint", "")),
            "cc": (g or {}).get("cc", ""), "region": region_of((g or {}).get("cc")),
            "lat": (g or {}).get("lat"), "lon": (g or {}).get("lon"),
            "posted": j.get("posted") or old.get("posted"),
            "first_seen": old.get("first_seen", TODAY),
            "_sal": sal, "emails": emails, "recruiters": recruiters, "domain": E.DOMAINS.get(j["employer"], ""),
            "desc": desc[:3500],
        })
    geo.save()

    # Salaires : annoncé > calibré sur les offres comparables > grille de marché
    calib = calibrate(jobs)
    for x in jobs:
        s_ = x.pop("_sal", None) or estimate(x["employer"], x["contract"], x["cc"], calib)
        x["salary"] = {"text": fmt(s_), "estimated": s_["estimated"], "basis": s_["basis"]} if s_ else None

    # Si une source a planté, on garde ses anciennes offres plutôt que de les perdre
    failed = {lbl for lbl, r in report.items() if r["error"]}
    if failed:
        kept_ids = {x["id"] for x in jobs}
        failed_employers = {lbl.split(" · ")[1] if " · " in lbl else lbl for lbl in failed}
        for p in prev.values():
            if p["id"] not in kept_ids and p["employer"] in failed_employers:
                c = classify(p["title"], p.get("desc", ""), p.get("employer_type", "bank"))
                if c:
                    p.update(c)
                    jobs.append(p)

    jobs.sort(key=lambda x: (x.get("posted") or x["first_seen"]), reverse=True)
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "jobs.json"), "w") as f:
        json.dump({"generated": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "categories": CATEGORIES,
                   "jobs": jobs}, f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(OUT, "meta.json"), "w") as f:
        json.dump({"generated": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "count": len(jobs),
                   "new_today": sum(1 for x in jobs if x["first_seen"] == TODAY and prev),
                   "sources": report, "geocoding_calls": geo.calls,
                   "duration_s": round(time.time() - t0)}, f, ensure_ascii=False, indent=1)
    # Annuaire des boutiques et fonds infra / énergie, avec le nombre d'offres trouvées
    cnt = {}
    for x in jobs:
        cnt[x["employer"]] = cnt.get(x["employer"], 0) + 1
    def n_for(name):
        base = name.split(" (")[0].lower()
        return sum(v for k, v in cnt.items() if k.lower().startswith(base[:12]) or base.startswith(k.lower()[:12]))
    followed = {l.split(" · ")[1] if " · " in l else l for l in report}
    targets = [{"name": n, "type": t, "zone": z, "url": u, "email": e, "note": note, "jobs": n_for(n),
                "auto": any(n.split(" (")[0].lower().startswith(f.lower()[:10]) for f in followed)}
               for n, t, z, u, e, note in E.TARGETS]
    with open(os.path.join(OUT, "targets.json"), "w") as f:
        json.dump(targets, f, ensure_ascii=False, indent=0)
    print(f"\nTerminé : {len(jobs)} offres, {geo.calls} géolocalisations, {time.time()-t0:.0f}s")


if __name__ == "__main__":
    main()
