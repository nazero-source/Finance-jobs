"""Connecteurs vers les plateformes de recrutement (API publiques, gratuites)."""
import datetime as dt, html, json, os, re, time, urllib.error, urllib.parse, urllib.request
from employers import SEARCH_TERMS

UA = {"User-Agent": "Mozilla/5.0 (finance-jobs-radar)", "Accept": "application/json"}
TODAY = dt.date.today()


def http(url, data=None, timeout=30, tries=4):
    headers = dict(UA)
    if data is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(data).encode()
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code not in (429, 500, 502, 503, 504) or attempt == tries - 1:
                raise
        except (urllib.error.URLError, ConnectionError, TimeoutError, OSError):
            if attempt == tries - 1:
                raise
        time.sleep(3 * (attempt + 1) ** 2)


def strip_html(s):
    if not s:
        return ""
    s = html.unescape(html.unescape(s))
    s = re.sub(r"<(?:br|/p|/li|/div|/h\d)[^>]*>", "\n", s, flags=re.I)
    s = re.sub(r"<li[^>]*>", "\n• ", s, flags=re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"[ \t\xa0]+", " ", s)
    return re.sub(r"\n\s*\n+", "\n", s).strip()


def job(**kw):
    """Format commun à toutes les sources. desc_fn = fonction appelée seulement si l'offre passe le 1er filtre."""
    base = dict(source="", employer="", etype="bank", native_id="", title="", url="", location="",
                country_hint="", posted=None, desc="", desc_fn=None, experience="", salary_raw=None, latlon=None)
    base.update(kw)
    return base


# ---------------- Workday ----------------
def _wd_posted(s):
    if not s:
        return None
    s = s.lower()
    if "today" in s:
        return TODAY.isoformat()
    if "yesterday" in s:
        return (TODAY - dt.timedelta(days=1)).isoformat()
    m = re.search(r"(\d+)\+? days", s)
    if m and "+" not in s:
        return (TODAY - dt.timedelta(days=int(m.group(1)))).isoformat()
    return None


def workday(name, etype, host, tenant, site, mode):
    api = f"https://{host}/wday/cxs/{tenant}/{site}"
    seen, out = set(), []
    terms = [""] if mode == "all" else SEARCH_TERMS
    for term in terms:
        offset, maxn, total = 0, (400 if mode == "all" else 100), None
        while offset < maxn:
            d = http(f"{api}/jobs", {"appliedFacets": {}, "limit": 20, "offset": offset, "searchText": term})
            posts = d.get("jobPostings") or []
            for p in posts:
                path = p.get("externalPath")
                if not path or path in seen:
                    continue
                seen.add(path)
                def desc_fn(path=path):
                    info = http(f"{api}{path}").get("jobPostingInfo", {})
                    loc = info.get("location") or ""
                    country = ((info.get("jobRequisitionLocation") or {}).get("country") or {})
                    return {"desc": strip_html(info.get("jobDescription")),
                            "posted": info.get("startDate"),
                            "url": info.get("externalUrl"),
                            "location": loc,
                            "country_hint": (info.get("country") or {}).get("descriptor") or country.get("descriptor", "")}
                pub = f"https://{host}/{site}{path}" if "myworkdayjobs" in host else \
                    f"https://{host}/recruiting/{tenant}/{site}{path}"
                out.append(job(source="Workday", employer=name, etype=etype, native_id=f"{tenant}:{path}",
                               title=p.get("title", ""), url=pub, location=p.get("locationsText", ""),
                               posted=_wd_posted(p.get("postedOn")), desc_fn=desc_fn))
            if total is None:          # Workday ne renvoie le total que sur la 1re page
                total = d.get("total") or 0
            offset += 20
            if not posts or offset >= total:
                break
    return out


# ---------------- Oracle Recruiting Cloud ----------------
def oracle(name, etype, host, site, mode):
    base = f"https://{host}/hcmRestApi/resources/latest"
    seen, out = set(), []
    terms = [""] if mode == "all" else SEARCH_TERMS
    for term in terms:
        offset, maxn = 0, (500 if mode == "all" else 100)
        while offset < maxn:
            kw = f',keyword="{term}"' if term else ""
            url = (f"{base}/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList"
                   f"&finder=findReqs;siteNumber={site}{urllib.parse.quote(kw)},limit=25,offset={offset},sortBy=POSTING_DATES_DESC")
            d = http(url)["items"][0]
            reqs = d.get("requisitionList") or []
            for r in reqs:
                rid = r["Id"]
                if rid in seen:
                    continue
                seen.add(rid)
                def desc_fn(rid=rid):
                    u = (f"{base}/recruitingCEJobRequisitionDetails?expand=all&onlyData=true"
                         f"&finder=ById;Id=%22{rid}%22,siteNumber={site}")
                    it = (http(u).get("items") or [{}])[0]
                    txt = " \n".join(strip_html(it.get(k)) for k in
                                     ("ExternalDescriptionStr", "ExternalResponsibilitiesStr", "ExternalQualificationsStr")
                                     if it.get(k))
                    return {"desc": txt}
                out.append(job(source="Oracle", employer=name, etype=etype, native_id=f"{host}:{rid}",
                               title=r.get("Title", ""),
                               url=f"https://{host}/hcmUI/CandidateExperience/en/sites/{site}/job/{rid}",
                               location=r.get("PrimaryLocation", ""), country_hint=r.get("PrimaryLocationCountry", ""),
                               posted=r.get("PostedDate"), desc=r.get("ShortDescriptionStr") or "", desc_fn=desc_fn))
            offset += 25
            if not reqs or offset >= (d.get("TotalJobsCount") or 0):
                break
    return out


# ---------------- Goldman Sachs (site « Higher ») ----------------
GS_QUERY = """query GetRoles($searchQueryInput: RoleSearchQueryInput!) { roleSearch(searchQueryInput: $searchQueryInput) {
 totalCount items { roleId corporateTitle jobTitle jobFunction locations { primary state country city } division
 createdDate descriptionHtml externalSource { sourceId } } } }"""


def goldman(name, etype):
    seen, out = set(), []
    for term in SEARCH_TERMS:
        for page in range(3):
            d = http("https://api-higher.gs.com/gateway/api/v1/graphql", {
                "operationName": "GetRoles", "query": GS_QUERY,
                "variables": {"searchQueryInput": {
                    "page": {"pageSize": 40, "pageNumber": page},
                    "sort": {"sortStrategy": "RELEVANCE", "sortOrder": "DESC"}, "filters": [],
                    "experiences": ["EARLY_CAREER", "PROFESSIONAL"], "searchTerm": term}}})
            items = d["data"]["roleSearch"]["items"]
            for it in items:
                rid = it["roleId"]
                if rid in seen:
                    continue
                seen.add(rid)
                loc = next((l for l in it.get("locations") or [] if l.get("primary")), (it.get("locations") or [{}])[0])
                sid = (it.get("externalSource") or {}).get("sourceId") or rid.split("_")[0]
                title = it.get("jobTitle", "")
                out.append(job(source="Goldman Sachs", employer=name, etype=etype, native_id=rid, title=title,
                               url=f"https://higher.gs.com/roles/{sid}",
                               location=", ".join(x for x in (loc.get("city"), loc.get("country")) if x),
                               country_hint=loc.get("country", ""),
                               posted=(it.get("createdDate") or "")[:10] or None,
                               desc=strip_html(it.get("descriptionHtml")) or " ".join(
                                   x for x in (it.get("division"), it.get("jobFunction"), it.get("corporateTitle")) if x),
                               experience="EARLY_CAREER" if "EARLY" in rid.upper() or "CAMPUS" in rid.upper() else ""))
            if len(items) < 40:
                break
    return out


# ---------------- Greenhouse / Lever / Workable / Recruitee / SmartRecruiters ----------------
def greenhouse(name, etype, board):
    d = http(f"https://boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true")
    return [job(source="Greenhouse", employer=name, etype=etype, native_id=f"gh:{j['id']}", title=j.get("title", ""),
                url=j.get("absolute_url", ""), location=(j.get("location") or {}).get("name", ""),
                posted=(j.get("first_published") or j.get("updated_at") or "")[:10] or None,
                desc=strip_html(j.get("content")))
            for j in d.get("jobs", [])]


def lever(name, etype, company):
    d = http(f"https://api.lever.co/v0/postings/{company}?mode=json")
    out = []
    for j in d:
        txt = j.get("descriptionPlain", "") + "\n" + "\n".join(
            strip_html(l.get("content", "")) for l in j.get("lists", []))
        ts = j.get("createdAt")
        out.append(job(source="Lever", employer=name, etype=etype, native_id=f"lever:{j['id']}", title=j.get("text", ""),
                       url=j.get("hostedUrl", ""), location=(j.get("categories") or {}).get("location", ""),
                       posted=dt.datetime.utcfromtimestamp(ts / 1000).date().isoformat() if ts else None, desc=txt))
    return out


def workable(name, etype, account):
    try:
        d = http(f"https://apply.workable.com/api/v1/widget/accounts/{account}", tries=2)
    except Exception:   # API « widget » limitée : on passe par l'API publique v3
        r = http(f"https://apply.workable.com/api/v3/accounts/{account}/jobs",
                 {"query": "", "location": [], "department": [], "worktype": [], "remote": []}, tries=2)
        d = {"jobs": [{"title": j.get("title"), "shortcode": j.get("shortcode"), "city": (j.get("location") or {}).get("city"),
                       "country": (j.get("location") or {}).get("country"), "published_on": j.get("published"),
                       "url": f"https://apply.workable.com/{account}/j/{j.get('shortcode')}/"} for j in r.get("results", [])]}
    out = []
    for j in d.get("jobs", []):
        loc = ", ".join(x for x in (j.get("city"), j.get("country")) if x)
        out.append(job(source="Workable", employer=name, etype=etype, native_id=f"wk:{j.get('shortcode')}",
                       title=j.get("title", ""), url=j.get("url") or j.get("shortlink", ""), location=loc,
                       posted=(j.get("published_on") or j.get("created_at") or "")[:10] or None,
                       desc=strip_html(j.get("description", ""))))
    return out


def recruitee(name, etype, company):
    d = http(f"https://{company}.recruitee.com/api/offers/")
    out = []
    for j in d.get("offers", []):
        loc = ", ".join(x for x in (j.get("city"), j.get("country")) if x)
        out.append(job(source="Recruitee", employer=name, etype=etype, native_id=f"rc:{j['id']}", title=j.get("title", ""),
                       url=j.get("careers_url", ""), location=loc, country_hint=j.get("country", ""),
                       posted=(j.get("published_at") or "")[:10] or None,
                       desc=strip_html((j.get("description") or "") + " " + (j.get("requirements") or ""))))
    return out


def smartrecruiters(name, etype, company):
    out, offset = [], 0
    while True:
        d = http(f"https://api.smartrecruiters.com/v1/companies/{company}/postings?limit=100&offset={offset}")
        for j in d.get("content", []):
            loc = j.get("location") or {}
            def desc_fn(ref=j.get("ref")):
                det = http(ref)
                secs = (det.get("jobAd") or {}).get("sections") or {}
                return {"desc": " \n".join(strip_html((v or {}).get("text")) for v in secs.values())}
            out.append(job(source="SmartRecruiters", employer=name, etype=etype, native_id=f"sr:{j['id']}",
                           title=j.get("name", ""), url=f"https://jobs.smartrecruiters.com/{company}/{j['id']}",
                           location=", ".join(x for x in (loc.get("city"), loc.get("country")) if x),
                           posted=(j.get("releasedDate") or "")[:10] or None, desc_fn=desc_fn))
        offset += 100
        if offset >= d.get("totalFound", 0):
            break
    return out


# ---------------- Adzuna (optionnel, clé gratuite) ----------------
ADZUNA_COUNTRIES = ["gb", "fr", "de", "nl", "it", "es", "ch", "at", "be", "pl", "us", "ca", "br", "mx",
                    "sg", "au", "nz", "in", "za"]
ADZUNA_TERMS = ["mergers acquisitions analyst", "investment banking analyst", "private equity analyst",
                "infrastructure investment", "project finance", "leveraged finance", "M&A intern",
                "investment banking intern", "private equity intern"]


def adzuna():
    app_id, key = os.environ.get("ADZUNA_APP_ID"), os.environ.get("ADZUNA_APP_KEY")
    if not app_id or not key:
        return []
    out = []
    for cc in ADZUNA_COUNTRIES:
        for term in ADZUNA_TERMS:
            url = (f"https://api.adzuna.com/v1/api/jobs/{cc}/search/1?" + urllib.parse.urlencode(
                {"app_id": app_id, "app_key": key, "results_per_page": 50, "what": term, "max_days_old": 45,
                 "content-type": "application/json"}))
            try:
                d = http(url)
            except Exception:
                continue
            for j in d.get("results", []):
                sal = None
                if j.get("salary_min") and not str(j.get("salary_is_predicted")) == "1":
                    sal = (j.get("salary_min"), j.get("salary_max"))
                out.append(job(source="Adzuna · " + ((j.get("category") or {}).get("label") or "web"), employer=(j.get("company") or {}).get("display_name", "?"),
                               etype="bank", native_id=f"az:{j['id']}", title=j.get("title", ""),
                               url=j.get("redirect_url", ""), location=(j.get("location") or {}).get("display_name", ""),
                               country_hint=cc.upper(), posted=(j.get("created") or "")[:10] or None,
                               desc=strip_html(j.get("description", "")), salary_raw=sal,
                               latlon=(j.get("latitude"), j.get("longitude")) if j.get("latitude") else None))
    return out


# ---------------- Personio / BambooHR / Ashby ----------------
def http_text(url, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (finance-jobs-radar)"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode("utf-8", "ignore")
        except Exception:
            if attempt == 2:
                raise
            time.sleep(3 * (attempt + 1))


def personio(name, etype, slug, dom="de"):
    import xml.etree.ElementTree as ET
    root = ET.fromstring(http_text(f"https://{slug}.jobs.personio.{dom}/xml"))
    out = []
    for p in root.findall("position"):
        pid = p.findtext("id")
        desc = " \n".join(strip_html(d.findtext("value")) for d in p.findall("jobDescriptions/jobDescription"))
        out.append(job(source="Personio", employer=name, etype=etype, native_id=f"ps:{slug}:{pid}",
                       title=p.findtext("name") or "", url=f"https://{slug}.jobs.personio.{dom}/job/{pid}",
                       location=p.findtext("office") or "", posted=(p.findtext("createdAt") or "")[:10] or None,
                       desc=desc, experience="EARLY_CAREER" if (p.findtext("seniority") or "") in ("entry-level", "student") else ""))
    return out


def bamboohr(name, etype, slug):
    d = http(f"https://{slug}.bamboohr.com/careers/list")
    out = []
    for j in d.get("result", []):
        jid = j.get("id")
        loc = j.get("location") or {}
        def desc_fn(jid=jid):
            det = (http(f"https://{slug}.bamboohr.com/careers/{jid}/detail").get("result") or {}).get("jobOpening") or {}
            return {"desc": strip_html(det.get("description")), "posted": (det.get("datePosted") or "")[:10] or None}
        out.append(job(source="BambooHR", employer=name, etype=etype, native_id=f"bh:{slug}:{jid}",
                       title=j.get("jobOpeningName", ""), url=f"https://{slug}.bamboohr.com/careers/{jid}",
                       location=", ".join(x for x in (loc.get("city"), loc.get("state")) if x), desc_fn=desc_fn))
    return out


def ashby(name, etype, slug):
    d = http(f"https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true")
    out = []
    for j in d.get("jobs", []):
        comp = (j.get("compensation") or {}).get("compensationTierSummary") or ""
        out.append(job(source="Ashby", employer=name, etype=etype, native_id=f"ab:{j['id']}", title=j.get("title", ""),
                       url=j.get("jobUrl", ""), location=j.get("location", ""), posted=(j.get("publishedAt") or "")[:10] or None,
                       desc=(f"Salary: {comp}\n" if comp else "") + (j.get("descriptionPlain") or "")))
    return out


# ---------------- Eightfold (HSBC) ----------------
def eightfold(name, etype, host, domain):
    seen, out = set(), []
    for term in SEARCH_TERMS:
        for start in range(0, 100, 10):
            d = http(f"https://{host}/api/apply/v2/jobs?" + urllib.parse.urlencode(
                {"domain": domain, "query": term, "start": start, "num": 10, "sort_by": "relevance"}))
            ps = d.get("positions") or []
            for p in ps:
                pid = p["id"]
                if pid in seen:
                    continue
                seen.add(pid)
                def desc_fn(pid=pid):
                    det = http(f"https://{host}/api/apply/v2/jobs/{pid}?domain={domain}")
                    return {"desc": strip_html(det.get("job_description"))}
                ts = p.get("t_create")
                out.append(job(source="Eightfold", employer=name, etype=etype, native_id=f"ef:{pid}",
                               title=p.get("name", ""), url=p.get("canonicalPositionUrl", ""),
                               location=p.get("location", ""),
                               posted=dt.datetime.fromtimestamp(ts, dt.timezone.utc).date().isoformat() if ts else None,
                               latlon=tuple(map(float, p["latlongs"].split(",")[:2])) if p.get("latlongs") else None,
                               desc_fn=desc_fn))
            if len(ps) < 10:
                break
    return out


# ---------------- Crédit Agricole CIB (site carrière HTML) ----------------
def cacib(name, etype):
    base = "https://jobs.ca-cib.com"
    out, seen = [], set()
    for page in range(1, 15):
        s = http_text(f"{base}/job/list-of-jobs.aspx?page={page}&LCID=2057")
        cards = re.findall(r'<div class="ts-offer-card Layer".*?(?=<div class="ts-offer-card Layer"|<div class="ts-pagination|$)', s, re.S)
        new = 0
        for c in cards:
            m = re.search(r'href="(/job/[^"]+_(\d+)\.aspx)"[^>]*>\s*([^<]+?)\s*</a>', c)
            if not m or m.group(2) in seen:
                continue
            seen.add(m.group(2)); new += 1
            bits = [b.strip() for b in re.sub(r"<[^>]+>", "|", re.sub(r"<script.*?</script>", "", c, flags=re.S)).split("|")
                    if b.strip() and not b.strip().startswith("Add this")]
            title = html.unescape(m.group(3))
            rest = [html.unescape(b) for b in bits if html.unescape(b) != title]
            contract = next((b for b in rest if re.search(r"contract|internship|apprentice|graduate|V\.?I\.?E|temporary", b, re.I)), "")
            geo = [b for b in rest if b != contract][-2:]
            url = base + m.group(1)
            def desc_fn(url=url):
                t = http_text(url)
                i, k = t.find('class="JobDescription"'), t.find("Ces offres pourraient")
                k = k if k > i else t.find("These offers might")
                txt = strip_html(t[i:k] if i > 0 and k > i else "")
                return {"desc": re.sub(r"^.*?Description du poste|^.*?Job description", "", txt, flags=re.S).strip()[:6000]}
            out.append(job(source="CA-CIB", employer=name, etype=etype, native_id=f"cacib:{m.group(2)}",
                           title=f"{title} ({contract})" if re.search(r"internship|V\.?I\.?E|graduate|apprentice", contract, re.I) else title,
                           url=url, location=", ".join(reversed(geo)) if geo else "", desc_fn=desc_fn))
        if not new:
            break
    return out


# ---------------- Teamtailor (flux RSS public) ----------------
def teamtailor(name, etype, host):
    import xml.etree.ElementTree as ET
    root = ET.fromstring(http_text(f"https://{host}/jobs.rss"))
    ns = {"tt": "https://teamtailor.com/locations"}
    out = []
    for it in root.iter("item"):
        link = it.findtext("link") or ""
        loc = ", ".join(x for x in (it.findtext("tt:locations/tt:location/tt:city", namespaces=ns),
                                    it.findtext("tt:locations/tt:location/tt:country", namespaces=ns)) if x)
        pub = it.findtext("pubDate") or ""
        try:
            posted = dt.datetime.strptime(pub[:25].strip(), "%a, %d %b %Y %H:%M:%S").date().isoformat()
        except ValueError:
            posted = None
        out.append(job(source="Teamtailor", employer=name, etype=etype, native_id=f"tt:{link.rsplit('/', 1)[-1].split('-')[0]}",
                       title=it.findtext("title") or "", url=link, location=loc, posted=posted,
                       desc=strip_html(it.findtext("description"))))
    return out


# ---------------- Jooble (agrégateur, clé gratuite : reprend Indeed, eFinancialCareers, etc.) ----------------
# La clé Jooble actuelle couvre les États-Unis (jooble.org) et a un quota limité (500 requêtes) :
# ~16 requêtes ciblées par jour. Pour d'autres pays, il faut une clé par pays (fr.jooble.org, uk.jooble.org…).
JOOBLE_QUERIES = [
    ("investment banking analyst", "New York"), ("investment banking summer analyst", ""), ("M&A analyst", "New York"),
    ("M&A analyst", ""), ("private equity analyst", "New York"), ("private equity analyst", ""),
    ("private equity intern", ""), ("investment banking intern", ""), ("infrastructure investment analyst", ""),
    ("project finance analyst", ""), ("leveraged finance analyst", ""), ("investment banking analyst", "Chicago"),
    ("investment banking analyst", "San Francisco"), ("investment banking analyst", "Houston"),
    ("M&A summer analyst 2027", ""), ("restructuring investment banking analyst", ""),
]


# Une clé Jooble par pays : JOOBLE_API_KEY (États-Unis), JOOBLE_API_KEY_FR, _UK, _DE, _CH, _NL, _ES, _IT, _AE, _SG, _BR…
JOOBLE_LOCAL = {
    "FR": [("analyste M&A", ""), ("stage fusions acquisitions", ""), ("stage M&A", "Paris"), ("stage private equity", ""),
           ("analyste private equity", ""), ("stage financement de projets", ""), ("VIE M&A", ""), ("stage corporate finance", "Paris"),
           ("stage leveraged finance", ""), ("stage infrastructure investissement", "")],
    "DEFAULT": [("M&A analyst", ""), ("M&A intern", ""), ("investment banking analyst", ""), ("investment banking intern", ""),
                ("private equity analyst", ""), ("private equity intern", ""), ("project finance analyst", ""),
                ("infrastructure investment analyst", ""), ("corporate finance intern", ""), ("leveraged finance analyst", "")],
}


def _jooble_run(host, key, queries, cc):
    out = []
    for term, loc in queries:
        try:
            d = http(f"https://{host}/api/{key}", {"keywords": term, "location": loc, "page": 1}, tries=1)
        except Exception:
            continue
        for j in d.get("jobs", []):
            out.append(job(source=f"Jooble · {j.get('source') or 'web'}", employer=(j.get("company") or "?").strip(),
                           etype="bank", native_id=f"jb:{j.get('id')}", title=strip_html(j.get("title", "")),
                           url=j.get("link", ""), location=j.get("location") or loc, country_hint=cc if cc != "US" else "",
                           posted=(j.get("updated") or "")[:10] or None,
                           desc=strip_html(j.get("snippet", "")) + ("\nSalary: " + j["salary"] if j.get("salary") else "")))
        time.sleep(0.3)
    return out


def jooble():
    out = []
    if os.environ.get("JOOBLE_API_KEY"):
        out += _jooble_run("jooble.org", os.environ["JOOBLE_API_KEY"], JOOBLE_QUERIES, "US")
    for var, key in os.environ.items():
        m = re.match(r"JOOBLE_API_KEY_([A-Z]{2})$", var)
        if m and key:
            cc = m.group(1)
            host = f"{cc.lower()}.jooble.org"
            out += _jooble_run(host, key, JOOBLE_LOCAL.get(cc, JOOBLE_LOCAL["DEFAULT"]), {"UK": "GB"}.get(cc, cc))
    return out
