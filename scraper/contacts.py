"""Contacts clés : équipes publiées sur les sites des boutiques et fonds ciblés + format d'e-mail déduit.

Les données sont CHIFFRÉES (AES-GCM, clé dérivée de la phrase secrète CONTACTS_KEY) avant d'être publiées :
le dépôt est public, la liste de personnes ne doit pas l'être. Sans CONTACTS_KEY, rien n'est écrit.
"""
import base64, html, json, os, re, sys, urllib.parse, urllib.request, concurrent.futures as cf

UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml", "Accept-Language": "en,fr;q=0.8"}
TEAM_LINK = re.compile(r"(?i)(our-?team|the-?team|/team\b|/teams?/|equipe|équipe|nos-equipes|our-people|/people\b|/people/|who-we-are|leadership|"
                       r"management|partners/?$|about-us/team|qui-sommes-nous|notre-equipe|meet-the-team)")
NAME = re.compile(r"^(?:[A-ZÀ-Ý][a-zà-ÿ'’\-]+|[A-ZÀ-Ý]\.)(?:\s+(?:de|da|di|del|van|von|du|le|la|der|den|ben|el|al)?\s*[A-ZÀ-Ý][A-Za-zà-ÿ'’\-]+){1,3}$")
TITLE = re.compile(r"(?i)\b(managing director|managing partner|partner|associ[ée]e?|director|directeur|directrice|vice[- ]president|vp|"
                   r"principal|associate|analyst|analyste|investment (?:manager|director|professional|officer)|head of|chief|ceo|cfo|coo|"
                   r"founder|fondateur|fondatrice|président|chargée? d'affaires|senior|manager|counsel|advisor|conseiller)\b")
JUNK_NAME = re.compile(r"(?i)\b(team|our|about|contact|news|careers?|privacy|cookies?|investment|infrastructure|energy|capital|partners|"
                       r"limited|group|fund|portfolio|london|paris|dubai|read more|learn more|view|follow|linkedin|back|menu|home|"
                       r"policy|terms|legal|sustainability|insights|transactions|services|expertise|sectors?|offices?|united|kingdom|"
                       r"relations|committee|select|all|show|filters?|board|members?|chief|officer|operating|human|resources|full|time|"
                       r"who|we|are|advisers?|advisors?|managing|director|executive|financial|global|head|investors?|senior|the|"
                       r"management|leadership|people|meet|join|apply|search|clear|reset|load|more|less|close|open|next|previous|"
                       r"office|region|europe|americas|asia|africa|middle|east|north|south|west|central|partner|associate|analyst|"
                       r"chairman|chairwoman|founding|founder|vice|president|tel|aviv|new|york|hong|kong|san|francisco|los|angeles|"
                       r"paulo|city|island|street|road|avenue|floor|house|square|tower|board|directors?)\b")
HR_TITLE = re.compile(r"(?i)\b(hr|human resources|talent|recruit\w*|people (?:partner|lead|director)|ressources humaines|rh|campus)\b")


def get(u):
    try:
        with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=20) as r:
            return r.geturl(), r.read(1_500_000).decode("utf-8", "ignore")
    except Exception:
        return None, ""


def lines_of(s):
    s = re.sub(r"<(script|style|noscript|svg)\b.*?</\1>", " ", s, flags=re.S | re.I)
    s = re.sub(r"<(br|/p|/div|/li|/h\d|/a|/span|/td|/figcaption|/strong|/b)\b[^>]*>", "\n", s, flags=re.I)
    t = html.unescape(re.sub(r"<[^>]+>", " ", s))
    return [re.sub(r"\s+", " ", l).strip() for l in t.split("\n") if l.strip()]


def extract_people(s):
    L = lines_of(s)
    out = []
    for i, l in enumerate(L):
        if 4 <= len(l) <= 40 and NAME.match(l) and not JUNK_NAME.search(l):
            for k in range(1, 4):
                if i + k < len(L) and len(L[i + k]) < 90 and TITLE.search(L[i + k]) and not NAME.match(L[i + k]):
                    out.append((l, L[i + k]))
                    break
    seen, res = set(), []
    for n, t in out:
        if n.lower() not in seen:
            seen.add(n.lower()); res.append({"name": n, "title": t})
    return res


def team_pages(home_url, home):
    urls = []
    for m in re.finditer(r'href="([^"#]+)"', home):
        u = urllib.parse.urljoin(home_url, html.unescape(m.group(1)))
        if urllib.parse.urlparse(u).netloc.replace("www.", "") == urllib.parse.urlparse(home_url).netloc.replace("www.", "") and TEAM_LINK.search(u):
            urls.append(u.split("?")[0])
    for p in ["/team", "/our-team", "/en/team", "/fr/equipe", "/people", "/about-us/team", "/who-we-are/team"]:
        urls.append(urllib.parse.urljoin(home_url, p))
    return list(dict.fromkeys(urls))[:8]


PATTERNS = {
    "prenom.nom": lambda f, l: f"{f}.{l}", "pnom": lambda f, l: f"{f[0]}{l}", "prenom": lambda f, l: f,
    "prenomnom": lambda f, l: f"{f}{l}", "p.nom": lambda f, l: f"{f[0]}.{l}", "nom": lambda f, l: l,
    "prenom_nom": lambda f, l: f"{f}_{l}", "prenom-nom": lambda f, l: f"{f}-{l}", "nom.prenom": lambda f, l: f"{l}.{f}",
}


def ascii_(s):
    import unicodedata
    return re.sub(r"[^a-z]", "", unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode())


def split_name(n):
    parts = [w for w in n.replace("’", "'").split() if w.lower().rstrip(".") not in ("sir", "dr", "mr", "mrs", "ms", "dame", "prof")]
    return ascii_(parts[0]), ascii_("".join(parts[1:]))


def infer_pattern(people, emails, domain):
    votes = {}
    for e in emails:
        local, dom = e.lower().split("@", 1)
        if domain not in dom:
            continue
        for p in people:
            f, l = split_name(p["name"])
            if not f or not l:
                continue
            for k, fn in PATTERNS.items():
                if fn(f, l) == local:
                    votes[k] = votes.get(k, 0) + 1
    if votes:
        k = max(votes, key=votes.get)
        return k, "déduit d'adresses publiées sur le site"
    return "prenom.nom", "hypothèse : format le plus courant, à vérifier"


def crawl(target):
    name, url = target["name"], target["url"]
    dom = target.get("domain") or urllib.parse.urlparse(url).netloc.replace("www.", "")
    root = f"https://{dom}"
    home_url, home = get(root)
    if not home:
        home_url, home = get(url)
    if not home:
        return {"firm": name, "domain": dom, "people": [], "pattern": None, "note": "site inaccessible au robot"}
    people, emails, pages = [], set(re.findall(r"[\w.+-]+@[\w-]+\.[\w.-]+", home)), []
    for u in team_pages(home_url, home):
        fu, s = get(u)
        if not s:
            continue
        found = extract_people(s)
        emails |= set(re.findall(r"[\w.+-]+@[\w-]+\.[\w.-]+", s))
        if found:
            pages.append(fu)
            people += found
    for p in people:
        t = p["title"]
        p["level"] = "rh" if HR_TITLE.search(t) else "junior" if re.search(r"(?i)\b(analyst|analyste|associate|associé(?!e? (?:gérant|fondateur))|chargée? d'affaires|investment manager)\b", t) and not re.search(r"(?i)senior associate|associate director|partner|director|directeur", t) else "senior"
        p["name"] = " ".join(w.capitalize() if w.isupper() and len(w) > 2 else w for w in p["name"].split())
    uniq = {p["name"].lower(): p for p in people}
    people = sorted(uniq.values(), key=lambda p: {"junior": 0, "rh": 1, "senior": 2}[p["level"]])[:150]
    mail_dom = dom
    tgt_email = target.get("email") or ""
    if "@" in tgt_email:
        mail_dom = tgt_email.split("@", 1)[1]
    pat, why = infer_pattern(people, emails, mail_dom.split(".")[0])
    for p in people:
        f, l = split_name(p["name"])
        p["email"] = f"{PATTERNS[pat](f, l)}@{mail_dom}" if f and l else ""
    return {"firm": name, "domain": mail_dom, "pattern": pat, "pattern_why": why, "people": people,
            "source": pages[:2], "generic": sorted(e for e in emails if re.match(r"(?i)(careers?|recrut|recruit|talent|jobs|hr|rh|info|contact)@", e))[:3]}


def encrypt(obj, passphrase):
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    from cryptography.hazmat.primitives import hashes
    salt, iv = os.urandom(16), os.urandom(12)
    key = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=250_000).derive(passphrase.encode())
    ct = AESGCM(key).encrypt(iv, json.dumps(obj, ensure_ascii=False).encode(), None)
    b = lambda x: base64.b64encode(x).decode()
    return {"v": 1, "kdf": "PBKDF2-SHA256", "iter": 250_000, "salt": b(salt), "iv": b(iv), "data": b(ct)}


def main():
    sys.path.insert(0, os.path.dirname(__file__))
    import employers as E
    def dom_of(n, u):
        d = E.DOMAINS.get(n) or E.DOMAINS.get(n.split(" (")[0]) or urllib.parse.urlparse(u).netloc.replace("www.", "")
        return re.sub(r"^(jobs|careers?|recruitment|[a-z0-9-]+\.(?:applytojob|pinpointhq|recruitee|teamtailor|bamboohr|hibob))\.", "", d) if not re.search(r"applytojob|pinpointhq|recruitee|bamboohr|hibob|teamtailor", d) else d.split(".")[0] + ".com"
    targets = [{"name": n, "url": u, "email": e, "domain": dom_of(n, u)} for n, t, z, u, e, note in E.TARGETS]
    # boutiques et fonds déjà suivis pour leurs offres (Green Giraffe, Clipperton, Lincoln…)
    seen = {t["name"] for t in targets}
    for n, d in E.DOMAINS.items():
        if n not in seen and any(n == x[0] and x[1] in ("boutique", "pe", "infra") for lst in (E.GREENHOUSE, E.LEVER, E.WORKABLE, E.RECRUITEE, E.PERSONIO, E.ASHBY, E.TEAMTAILOR, E.BAMBOOHR, E.SMARTRECRUITERS) for x in lst):
            targets.append({"name": n, "url": f"https://www.{d}", "email": "", "domain": d})
    with cf.ThreadPoolExecutor(10) as ex:
        res = list(ex.map(crawl, targets))
    res = [r for r in res if r["people"] or r.get("generic")]
    print(f"Contacts : {sum(len(r['people']) for r in res)} personnes dans {sum(1 for r in res if r['people'])} entreprises")
    key = os.environ.get("CONTACTS_KEY")
    out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs", "data", "contacts.enc.json")
    if not key:
        print("CONTACTS_KEY absent : rien n'est publié (les contacts ne doivent jamais être en clair dans le dépôt).")
        return res
    import datetime as dt
    json.dump(encrypt({"generated": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "firms": res}, key), open(out, "w"))
    print("contacts.enc.json écrit (chiffré)")
    return res


if __name__ == "__main__":
    main()
