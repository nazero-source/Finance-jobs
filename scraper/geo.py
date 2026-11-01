"""Géolocalisation des lieux (OpenStreetMap / Nominatim, gratuit) avec cache."""
import json, os, re, time, urllib.parse, urllib.request

CACHE_PATH = os.path.join(os.path.dirname(__file__), "geocache.json")
UA = "finance-jobs-radar/1.0 (+https://github.com/nazero-source/finance-jobs)"

REGIONS = {
    "Europe": "GB FR DE NL BE LU CH IT ES PT IE AT SE NO DK FI PL CZ HU RO GR MC IS SK SI HR BG RS EE LV LT CY MT UA",
    "Amérique du Nord": "US CA",
    "Amérique latine": "BR MX CL CO PE AR UY PA CR DO EC GT PY BO VE",
    "Moyen-Orient & Afrique": "AE SA QA KW BH OM IL TR EG MA ZA NG KE GH CI SN TN DZ ET MU RW TZ UG JO LB",
    "Asie-Pacifique": "SG HK CN JP KR IN AU NZ TW TH MY ID PH VN PK BD LK",
}
CC_REGION = {cc: r for r, ccs in REGIONS.items() for cc in ccs.split()}


TOKYO_WARDS = {"Minato", "Chiyoda", "Chuo", "Chūō", "Shibuya", "Shinjuku", "Minato City", "Chiyoda City", "Chuo City", "Marunouchi", "Otemachi"}


def _fix(res):
    if res and res.get("city") in ("Greater London", "City of London", "City of Westminster"):
        res = dict(res, city="London")
    if res and res.get("city") == "City of New York":
        res = dict(res, city="New York")
    if res and res.get("cc") == "JP" and (res["city"] in TOKYO_WARDS or res["city"].lower().endswith(("-ku", " ward"))):
        res = dict(res, city="Tokyo")
    return res


def region_of(cc):
    return CC_REGION.get((cc or "").upper(), "Autre")


def clean(loc):
    if not loc:
        return ""
    loc = loc.split(";")[0].split(" | ")[0]
    m = re.match(r"^([A-Z]{2})\s*-\s*(.+)$", loc.strip())             # "VA - Richmond (23219)" -> "Richmond, VA"
    if m:
        loc = f"{m.group(2)}, {m.group(1)}"
    loc = re.sub(r"\(\d{5}\)", "", loc)
    loc = re.sub(r"\([A-Z]{2}\d+\)", "", loc)                       # codes de bureau type (VA154)
    loc = re.sub(r"^[A-Z]{3}\s*-\s*", "", loc.strip())          # "DEU - Frankfurt - rue" -> "Frankfurt - rue"
    loc = loc.split(" - ")[0]
    loc = re.sub(r"\((?:hybrid|remote|on-?site)[^)]*\)", "", loc, flags=re.I)
    loc = re.sub(r"\b(?:hybrid|remote)\b", "", loc, flags=re.I)
    loc = re.sub(r"\b\d{5}\b", "", loc)                              # codes postaux US
    loc = re.sub(r"^[A-Z]{2}\s*-\s*", "", loc)                       # "CA - San Francisco"
    loc = loc.replace("Korea, Republic of", "South Korea").replace("United States of America", "United States")
    loc = re.sub(r"^(.+?) \1\b", r"\1", loc)                       # "New York New York" -> "New York"
    loc = re.sub(r"(?<=[a-z]) (United States|United Kingdom|Canada|India)$", r", \1", loc)
    return re.sub(r"\s{2,}", " ", loc).strip(" ,-|")


class Geocoder:
    def __init__(self):
        try:
            with open(CACHE_PATH) as f:
                self.cache = json.load(f)
        except Exception:
            self.cache = {}
        self.last = 0.0
        self.calls = 0

    def save(self):
        with open(CACHE_PATH, "w") as f:
            json.dump(self.cache, f, ensure_ascii=False, indent=0, sort_keys=True)

    def lookup(self, query):
        q = clean(query)
        if not q or re.match(r"^\d+ locations?$", q, re.I) or q.lower() in ("multiple locations", "various"):
            return None
        if q in self.cache:
            return _fix(self.cache[q])
        wait = 1.1 - (time.time() - self.last)
        if wait > 0:
            time.sleep(wait)
        self.last = time.time()
        self.calls += 1
        url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(
            {"q": q, "format": "jsonv2", "limit": 1, "addressdetails": 1, "accept-language": "en"})
        res = None
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=20) as r:
                data = json.load(r)
            if data:
                a = data[0].get("address", {})
                res = {
                    "lat": round(float(data[0]["lat"]), 4), "lon": round(float(data[0]["lon"]), 4),
                    "city": a.get("city") or a.get("town") or a.get("village") or a.get("municipality")
                            or a.get("county") or a.get("state") or q.split(",")[0],
                    "country": a.get("country", ""), "cc": (a.get("country_code") or "").upper(),
                }
        except Exception:
            return None   # pas mis en cache : on réessaiera au prochain passage
        self.cache[q] = res
        return _fix(res)
