"""Offres venues d'agrégateurs (Jooble…) : retrouver l'offre sur le site carrière de l'employeur.

- Si l'employeur est déjà suivi en direct, on cherche l'offre équivalente (titre proche) et on prend son lien.
- Sinon, on cherche son site carrière sur les plateformes publiques (Greenhouse, Lever, Ashby, SmartRecruiters,
  Recruitee) ; si l'offre y figure, on remplace le lien Jooble par le lien direct de candidature.
- Les offres d'agrégateurs anonymes, de cabinets de recrutement ou trop anciennes sont écartées
  (risque d'offres fantômes ou déjà pourvues).
"""
import datetime as dt, difflib, json, os, re, urllib.request

CACHE = os.path.join(os.path.dirname(__file__), "ats_cache.json")
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36", "Accept": "application/json"}
MAX_AGE_DAYS = 30
MAX_PROBES = 70

# Agrégateurs, job boards et cabinets de recrutement : offres souvent republiées, anonymes ou déjà pourvues
NOT_EMPLOYER = re.compile(r"(?i)\b(jobrapido|career launch|confidential|anonym|lensa|ziprecruiter|talent\.com|jobleads|jooble|indeed|"
                          r"glassdoor|monster|adzuna|staffing|recruit\w*|executive search|headhunt\w*|search partners|"
                          r"selby jennings|michael page|page group|hays|robert walters|robert half|morgan mckinley|harvey nash|"
                          r"randstad|adecco|manpower|kelly services|aston carter|teksystems|insight global|mission staffing|"
                          r"stevendouglas|beathchapman|merries|dartmouth partners|circle square|oliver james|goodman masson|"
                          r"jobs?board|career site|jobs? in|mercor|synthires|yo ai|outlier|alignerr|crossing hurdles|"
                          r"wayne state university|university|college|school|avocats?|law firm|lawyers|legal|notaires?|llp law|attorneys?)\b")


FINANCE_EMPLOYER = re.compile(r"(?i)(bank|banque|banca|securities|capital|partners|advis|investment|investissement|finance|financial|"
    r"equity|infrastructure|infra|asset|fund|fonds|gestion|energy|énergie|renewabl|jefferies|piper|stephens|kbw|raymond james|"
    r"lazard|rothschild|evercore|moelis|houlihan|baird|stifel|citi|jpmorgan|j\.p\. morgan|morgan stanley|goldman|barclays|hsbc|bnp|"
    r"soci[eé]t[eé] g[eé]n[eé]rale|natixis|cr[eé]dit agricole|ubs|deutsche|santander|bbva|\bing\b|nomura|mizuho|mufg|smbc|macquarie|"
    r"wells fargo|bofa|bank of america|\btd\b|rbc|bmo|cibc|scotia|alantra|oddo|edmond|degroof|kepler|mediobanca|intesa|unicredit|"
    r"investec|numis|peel hunt|cavendish|canaccord|liberum|panmure|clearwater|oaklins|lincoln|harris williams|william blair|kpmg|"
    r"deloitte|pwc|\bey\b|mazars|bdo|grant thornton|eurazeo|\bardian\b|tikehau|meridiam|antin|mirova|bpifrance|caisse|cdpq|blackstone|"
    r"kkr|apollo|carlyle|tpg|eqt|cvc|permira|cinven|bridgepoint|\bpai\b|ik partners|wendel|idinvest|siparex|naxicap|keensight|abenex)")
# Titres réécrits façon publicité (« Hybrid NY: Sell-Side M&A Analyst – Early-Deal Ownership ») : souvent des offres fantômes
SPAM_TITLE = re.compile(r"(?i):\s|\s[—–]\s.*(?:ownership|growth|hands-on|early|live|independent|remote|hybrid)|\b(?:independent|live|"
    r"commission|hands-on|10-week|deal ownership|growth,)\b")


def norm(s):
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def title_key(t):
    t = re.sub(r"\(.*?\)|\[.*?\]", " ", (t or "").lower())
    t = re.sub(r"\b(h/f|f/h|m/f/d|m/w/d|f/m/x|m/f|w/m/d|full[- ]time|part[- ]time|hybrid|remote)\b", " ", t)
    return re.sub(r"[^a-z0-9 ]", " ", t)


def similar(a, b):
    a, b = title_key(a), title_key(b)
    r = difflib.SequenceMatcher(None, a, b).ratio()
    ta, tb = set(a.split()), set(b.split())
    jac = len(ta & tb) / max(1, len(ta | tb))
    return max(r, jac)


def slugs(name):
    base = re.sub(r"(?i)\b(inc|llc|ltd|limited|plc|sa|sas|gmbh|ag|lp|llp|co|corp|corporation|company|the|group|holdings?)\b\.?", " ", name)
    words = re.sub(r"[^a-z0-9 ]", " ", base.lower()).split()
    if not words:
        return []
    c = ["".join(words), "-".join(words), words[0]]
    if len(words) > 1:
        c.append("".join(words[:2]))
    return list(dict.fromkeys(x for x in c if len(x) >= 3))


def _get(u, data=None):
    try:
        h = dict(UA)
        if data is not None:
            h["Content-Type"] = "application/json"
            data = json.dumps(data).encode()
        with urllib.request.urlopen(urllib.request.Request(u, data=data, headers=h), timeout=15) as r:
            return json.load(r)
    except Exception:
        return None


def board_jobs(platform, slug):
    """Liste [(titre, url)] du site carrière public."""
    if platform == "greenhouse":
        d = _get(f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs")
        return [(j["title"], j["absolute_url"]) for j in (d or {}).get("jobs", [])]
    if platform == "lever":
        d = _get(f"https://api.lever.co/v0/postings/{slug}?mode=json")
        return [(j["text"], j["hostedUrl"]) for j in d] if isinstance(d, list) else []
    if platform == "ashby":
        d = _get(f"https://api.ashbyhq.com/posting-api/job-board/{slug}")
        return [(j["title"], j["jobUrl"]) for j in (d or {}).get("jobs", [])]
    if platform == "smartrecruiters":
        d = _get(f"https://api.smartrecruiters.com/v1/companies/{slug}/postings?limit=100")
        return [(j["name"], f"https://jobs.smartrecruiters.com/{slug}/{j['id']}") for j in (d or {}).get("content", [])]
    if platform == "recruitee":
        d = _get(f"https://{slug}.recruitee.com/api/offers/")
        return [(j["title"], j["careers_url"]) for j in (d or {}).get("offers", [])]
    return []


def find_board(name, cache, budget):
    k = norm(name)
    hit = cache.get(k)
    today = dt.date.today()
    if hit and (hit.get("platform") or (today - dt.date.fromisoformat(hit["checked"])).days < 14):
        return hit
    if budget[0] <= 0:
        return None
    budget[0] -= 1
    found = {"platform": None, "slug": None, "checked": today.isoformat()}
    for slug in slugs(name):
        for platform in ("greenhouse", "lever", "ashby", "smartrecruiters", "recruitee"):
            jobs = board_jobs(platform, slug)
            if jobs:
                found.update(platform=platform, slug=slug)
                break
        if found["platform"]:
            break
    cache[k] = found
    return found


def resolve(aggregated, direct_jobs, today=None):
    """Retourne la liste des offres d'agrégateur conservées, avec lien direct quand il a été trouvé."""
    today = today or dt.date.today()
    try:
        cache = json.load(open(CACHE))
    except Exception:
        cache = {}
    by_emp = {}
    for j in direct_jobs:
        by_emp.setdefault(norm(j["employer"])[:5], []).append(j)
    budget = [MAX_PROBES]
    boards = {}
    kept, stats = [], {"direct": 0, "board": 0, "unverified": 0, "dropped_old": 0, "dropped_agency": 0, "dropped_dup": 0}
    for j in aggregated:
        emp = j["employer"] or ""
        if not emp or emp == "?" or NOT_EMPLOYER.search(emp) or not FINANCE_EMPLOYER.search(emp + " " + j["title"][:0]):
            stats["dropped_agency"] += 1
            continue
        if SPAM_TITLE.search(j["title"]):
            stats["dropped_agency"] += 1
            continue
        if j.get("posted"):
            try:
                if (today - dt.date.fromisoformat(j["posted"])).days > MAX_AGE_DAYS:
                    stats["dropped_old"] += 1
                    continue
            except ValueError:
                pass
        # 1) même employeur déjà suivi en direct : l'offre y est (ou pas)
        same = by_emp.get(norm(emp)[:5], [])
        if same:
            best = max(same, key=lambda d: similar(d["title"], j["title"]))
            if similar(best["title"], j["title"]) >= 0.72:
                stats["dropped_dup"] += 1       # la version directe est déjà sur le site
                continue
        # 2) site carrière public de l'employeur
        b = find_board(emp, cache, budget)
        if b and b.get("platform"):
            key = (b["platform"], b["slug"])
            if key not in boards:
                boards[key] = board_jobs(*key)
            cands = boards[key]
            if cands:
                t, u = max(cands, key=lambda c: similar(c[0], j["title"]))
                if similar(t, j["title"]) >= 0.72:
                    j.update(url=u, title=t, verified="site carrière", source=f"{b['platform'].capitalize()} (via Jooble)")
                    stats["board"] += 1
                    kept.append(j)
                    continue
                # l'employeur a un site carrière lisible mais l'offre n'y est plus : probablement pourvue
                stats["dropped_old"] += 1
                continue
        j["verified"] = ""
        stats["unverified"] += 1
        kept.append(j)
    json.dump(cache, open(CACHE, "w"), indent=0, sort_keys=True)
    return kept, stats
