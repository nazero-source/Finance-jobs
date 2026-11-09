"""Veille des pages carrière des employeurs non lus automatiquement (onglet Infra & énergie).

Chaque jour, le robot ouvre la page carrière de chaque employeur « à surveiller », relève les liens
qui ressemblent à des offres, les compare à la veille et note les nouveaux. L'état est gardé dans
scraper/watch_state.json : {employeur: {"links": {url: {"t": titre, "first": date}}, "checked": date, "status": ...}}.
"""
import concurrent.futures as cf
import datetime as dt
import html
import json
import os
import re
import urllib.parse

from fetchers import http_text

HERE = os.path.dirname(__file__)
STATE = os.path.join(HERE, "watch_state.json")
TODAY = dt.date.today().isoformat()

JOBISH = re.compile(r"(?i)\b(analyst|analyste|associate|associé|intern(ship)?|stage|stagiaire|graduate|alternan\w*|apprenti\w*|trainee|v\.?i\.?e\.?|"
                    r"junior|manager|officer|director|directeur|controller|contrôleur|engineer|ingénieur|specialist|consultant|assistant|"
                    r"chargée? (d'affaires|de|d')|responsable|vice president|vp|cdi|cdd|thesis|mémoire|programme|program|vacancy|opening)\b")
JUNIOR = re.compile(r"(?i)\b(analyst|analyste|intern(ship)?|stage|stagiaire|graduate|alternan\w*|apprenti\w*|trainee|v\.?i\.?e\.?|junior|"
                    r"off[- ]cycle|summer|young professional|chargée? d'affaires junior)\b")
SENIOR = re.compile(r"(?i)\b(director|directeur|directrice|partner|head of|vp|vice president|managing|principal|senior manager|chief|cfo|ceo)\b")
NAV = re.compile(r"(?i)^(careers?|carrières?|jobs?|join us|rejoignez[- ]nous|nous rejoindre|work with us|current (openings|vacancies)|open positions|"
                 r"see all|voir (toutes )?les offres|apply|postuler|en savoir plus|learn more|read more|home|accueil|contact|team|équipe|"
                 r"about|à propos|news|actualités|our people|life at .*|working at .*|why join .*|graduates?|students?|internships?|"
                 r"early careers|programmes?|privacy|cookies?|linkedin|twitter|instagram|facebook|youtube|menu|search|recherche)$")
ATS_HOSTS = ("greenhouse.io", "lever.co", "workable.com", "teamtailor.com", "welcometothejungle.com", "recruitee.com", "smartrecruiters.com",
             "bamboohr.com", "personio", "ashbyhq.com", "pinpointhq.com", "applytojob.com", "myworkdayjobs.com", "tal.net", "hibob.com",
             "jobteaser.com", "successfactors", "taleo", "icims.com", "jobvite.com", "breezy.hr", "join.com", "flatchr", "talent-soft", "talentsoft")
A = re.compile(r"<a\b[^>]*href=[\"']([^\"'#]+)[\"'][^>]*>(.*?)</a>", re.S | re.I)


def clean(t):
    t = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", t or ""))).strip()
    t = re.sub(r"(?i)\s*\b(read more|en savoir plus|view job|apply now|learn more)\b.*$", "", t)
    return t.strip(" >›→-–|·").strip()


def offers_on(url, page):
    """Liens d'une page carrière qui ressemblent à des offres (titre, url)."""
    base = urllib.parse.urlparse(url)
    out, ats = {}, set()
    for href, inner in A.findall(page):
        full = urllib.parse.urljoin(url, html.unescape(href.strip()))
        if not full.startswith("http"):
            continue
        host = urllib.parse.urlparse(full).netloc.lower()
        for h in ATS_HOSTS:
            if h in host:
                ats.add(h)
        title = clean(inner)
        if not (8 <= len(title) <= 140) or NAV.match(title) or title.count(" ") > 18 or '"' in title or "=" in title:
            continue
        if re.search(r"(?i)^(our |nos |find |explore |see |view |latest |all |follow |go to|benefits|espace)", title) or title.lower().startswith(base.netloc.split(".")[-2] if base.netloc.count(".") else "~"):
            continue
        path = urllib.parse.urlparse(full).path.lower()
        if re.search(r"(team|people|profile|equipe|équipe|about|news|blog|stor(y|ies)|insight|portfolio|press|media|interview)", path) or re.search(r"(?i)interview|testimonial|what we do|^careers? at", title):
            continue
        on_site = host.endswith(base.netloc.replace("www.", "")) or any(h in host for h in ATS_HOSTS)
        looks_job = JOBISH.search(title) and not re.search(r"(?i)portfolio|principles|fund management|our (team|people)|unsolicited|candidature spontanée|spontaneous", title) and (re.search(r"(job|career|carriere|vacanc|position|offre|poste|opening|recrut|apply|stage|intern|o/|/j/|jobs/)", path + host) or any(h in host for h in ATS_HOSTS))
        if on_site and looks_job and full.rstrip("/") != url.rstrip("/"):
            out[full.split("?utm")[0]] = title
    return out, sorted(ats)


def check(target):
    url = target["url"]
    try:
        page = http_text(url, timeout=25)
    except Exception as e:  # site bloqué, hors ligne…
        return target["name"], None, [], f"inaccessible ({type(e).__name__})"
    if not page or len(page) < 500:
        return target["name"], None, [], "page vide"
    links, ats = offers_on(url, page)
    dynamic = len(re.findall(r"<script", page, re.I)) > 25 and not links
    return target["name"], links, ats, "page dynamique (offres chargées par script)" if dynamic else "ok"


def render_pages(urls, budget=240):
    """Ouvre des pages dans un navigateur sans écran (Playwright) pour lire celles qui chargent leurs offres par script.
    Retourne {url: html}. Sans Playwright installé, ne fait rien."""
    try:
        from playwright.sync_api import sync_playwright
    except Exception:
        return {}
    import glob, time
    out, t0 = {}, time.time()
    exe = next(iter(sorted(glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome"))), None)   # navigateur déjà présent, sinon celui de Playwright
    try:
        with sync_playwright() as pw:
            br = pw.chromium.launch(executable_path=exe) if exe else pw.chromium.launch()
            ctx = br.new_context(locale="fr-FR", user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36")
            ctx.route(re.compile(r"\.(png|jpe?g|gif|webp|svg|woff2?|ttf|mp4|webm)(\?|$)"), lambda r: r.abort())
            for u in urls:
                if time.time() - t0 > budget:
                    break
                pg = ctx.new_page()
                try:
                    pg.goto(u, wait_until="domcontentloaded", timeout=20000)
                    try:
                        pg.wait_for_load_state("networkidle", timeout=8000)
                    except Exception:
                        pass
                    html_ = pg.content()
                    for fr in pg.frames[1:6]:          # offres servies dans un cadre (outil de recrutement intégré)
                        try:
                            html_ += "\n<!-- frame -->\n" + re.sub(r'href="/', f'href="{urllib.parse.urljoin(fr.url, "/")}', fr.content())
                        except Exception:
                            pass
                    out[u] = html_
                except Exception:
                    pass
                finally:
                    pg.close()
            br.close()
    except Exception as e:
        print("Veille : navigateur indisponible", type(e).__name__, str(e)[:120])
    return out


def run(targets):
    """Met à jour l'état de veille et renvoie {employeur: résumé} pour targets.json."""
    try:
        state = json.load(open(STATE))
    except Exception:
        state = {}
    todo = [t for t in targets if not t.get("auto") and t.get("url")]
    with cf.ThreadPoolExecutor(12) as ex:
        results = list(ex.map(check, todo))
    # 2e passe : pages illisibles en lecture simple (script, blocage, vide) ouvertes dans un vrai navigateur
    by_name = {t["name"]: t for t in todo}
    retry = [by_name[n]["url"] for n, links, ats, status in results if status != "ok" or not links]
    rendered = render_pages(retry) if os.environ.get("WATCH_RENDER") == "1" else {}   # désactivé par défaut : lent, peu de gain
    if rendered:
        fixed = 0
        for i, (name, links, ats, status) in enumerate(results):
            page = rendered.get(by_name[name]["url"])
            if not page:
                continue
            l2, a2 = offers_on(by_name[name]["url"], page)
            if status != "ok" or l2:
                results[i] = (name, {**(links or {}), **l2}, sorted(set(ats) | set(a2)), "ok")
                fixed += status != "ok"
        print(f"Veille : {len(rendered)} pages ouvertes dans le navigateur, {fixed} rendues lisibles")
    first_run = not state
    for name, links, ats, status in results:
        s = state.setdefault(name, {"links": {}})
        s["checked"], s["status"], s["ats"] = TODAY, status, ats
        if links is None:
            continue
        for u, t in links.items():
            if u not in s["links"]:
                # au tout premier passage, rien n'est « nouveau » : on photographie l'existant
                s["links"][u] = {"t": t, "first": "initial" if first_run or not s.get("seeded") else TODAY}
            s["links"][u]["seen"] = TODAY
        s["seeded"] = True
        # on oublie les liens disparus depuis 30 jours
        for u in [u for u, v in s["links"].items() if v.get("seen", TODAY) < (dt.date.today() - dt.timedelta(days=30)).isoformat()]:
            del s["links"][u]
    json.dump(state, open(STATE, "w"), ensure_ascii=False, indent=0, sort_keys=True)
    week = (dt.date.today() - dt.timedelta(days=7)).isoformat()
    summary = {}
    for name, s in state.items():
        live = [{"title": v["t"], "url": u, "first": v["first"], "junior": bool(JUNIOR.search(v["t"]) and not SENIOR.search(v["t"]))}
                for u, v in s["links"].items() if v.get("seen") == s.get("checked")]
        new = [x for x in live if x["first"] not in ("initial",) and x["first"] >= week]
        live.sort(key=lambda x: (x["first"] == "initial", x["first"] if x["first"] != "initial" else "", not x["junior"]), reverse=False)
        live.sort(key=lambda x: (0 if x in new else 1, 0 if x["junior"] else 1))
        summary[name] = {"checked": s.get("checked"), "status": s.get("status"), "ats": s.get("ats", []),
                         "count": len(live), "new": len(new), "new_junior": sum(x["junior"] for x in new), "links": live[:25]}
    print(f"Veille des pages carrière : {len(todo)} pages, {sum(v['new'] for v in summary.values())} nouveautés cette semaine")
    return summary
