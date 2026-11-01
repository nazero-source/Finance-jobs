"""Salaire : extraction depuis l'annonce, sinon estimation à partir d'une grille.

Les grilles sont des ordres de grandeur (salaire fixe, hors bonus), à affiner.
"""
import re

CUR = {"$": "USD", "US$": "USD", "USD": "USD", "£": "GBP", "GBP": "GBP", "€": "EUR", "EUR": "EUR",
       "CHF": "CHF", "C$": "CAD", "CAD": "CAD", "A$": "AUD", "AUD": "AUD", "S$": "SGD", "SGD": "SGD",
       "HK$": "HKD", "HKD": "HKD", "R$": "BRL", "BRL": "BRL", "¥": "JPY", "JPY": "JPY", "AED": "AED",
       "INR": "INR", "₹": "INR"}
SYM = {"USD": "$", "GBP": "£", "EUR": "€", "CHF": "CHF ", "CAD": "C$", "AUD": "A$", "SGD": "S$",
       "HKD": "HK$", "BRL": "R$", "JPY": "¥", "AED": "AED ", "INR": "₹"}

CUR_RX = r"(US\$|C\$|A\$|S\$|HK\$|R\$|\$|£|€|¥|₹|USD|GBP|EUR|CHF|CAD|AUD|SGD|HKD|BRL|JPY|AED|INR)"
NUM_RX = r"(\d{1,3}(?:[,.\s]\d{3})+|\d+(?:\.\d+)?)\s*([kK])?"
RANGE = re.compile(CUR_RX + r"\s?" + NUM_RX + r"(?:\s*(?:USD|GBP|EUR))?\s*(?:-|–|—|to|and|à)\s*" + CUR_RX + r"?\s?" + NUM_RX)
SINGLE = re.compile(CUR_RX + r"\s?" + NUM_RX)
POST = re.compile(r"(\d{1,3}(?:[,.\s\u202f]\d{3})+|\d+)\s*([kK])?\s*(€|EUR|£|GBP|CHF)")
CONTEXT = re.compile(r"salary|compensation|pay range|base pay|pay rate|hourly rate|rémunération|salaire|"
                     r"remuneration|stipend|gross|annual base|wage", re.I)


def _num(s, k):
    s = re.sub(r"[,\s\u202f]", "", s)
    if s.count(".") >= 1 and len(s.split(".")[-1]) == 3:
        s = s.replace(".", "")
    try:
        v = float(s)
    except ValueError:
        return None
    return v * 1000 if k else v


def extract(text):
    """Cherche une fourchette de salaire écrite dans l'annonce."""
    if not text:
        return None
    for m in CONTEXT.finditer(text):
        window = text[max(0, m.start() - 150): m.end() + 350]
        r = RANGE.search(window)
        if r:
            cur = CUR.get(r.group(1))
            lo, hi = _num(r.group(2), r.group(3)), _num(r.group(5), r.group(6))
            if lo and hi and hi >= lo:
                return _fmt(cur, lo, hi, window[r.end(): r.end() + 40])
        s = SINGLE.search(window)
        p = POST.search(window)
        if s:
            cur = CUR.get(s.group(1))
            v = _num(s.group(2), s.group(3))
        elif p:
            cur = CUR.get(p.group(3))
            v = _num(p.group(1), p.group(2))
            s = p
        if s:
            if v and v >= 10:
                return _fmt(cur, v, v, window[s.end(): s.end() + 40])
    return None


def _fmt(cur, lo, hi, after):
    if re.match(r"\s*(?:billion|million|trillion|bn|mn|m\b|\+? ?(?:employees|clients|offices))", after, re.I):
        return None
    unit = "an"
    if re.search(r"hour|/hr|per hr|heure", after, re.I) or hi < 300:
        unit = "heure"
    elif re.search(r"month|mois|/mo", after, re.I) or hi < 15000:
        unit = "mois"
    if unit == "an" and hi < 15000:
        return None
    sym = SYM.get(cur, "")
    def f(v):
        return f"{v/1000:.0f}k" if v >= 10000 else (f"{v:,.0f}" if v >= 100 else f"{v:.2f}")
    txt = f"{sym}{f(lo)}" + (f" – {sym}{f(hi)}" if hi != lo else "") + f" / {unit}"
    return {"text": txt, "estimated": False}


# --- Estimation ---------------------------------------------------------
# Salaire fixe annuel, en k€, niveau Londres (facteur 1.0)
BASE = {"Analyst": (70, 90), "Associate": (110, 150), "Vice President": (160, 220),
        "Director": (220, 320), "Managing Director": (350, 600)}
FACTOR = {"US": 1.35, "CH": 1.25, "GB": 1.0, "IE": 0.85, "FR": 0.8, "DE": 0.85, "NL": 0.8, "LU": 0.85,
          "BE": 0.75, "IT": 0.6, "ES": 0.6, "PT": 0.5, "SE": 0.8, "NO": 0.8, "DK": 0.8, "FI": 0.7, "AT": 0.75,
          "PL": 0.4, "AE": 1.0, "SA": 0.95, "QA": 0.95, "SG": 0.95, "HK": 1.0, "JP": 0.8, "CN": 0.6,
          "KR": 0.6, "IN": 0.25, "AU": 0.85, "NZ": 0.7, "CA": 0.9, "BR": 0.4, "MX": 0.35, "CL": 0.4,
          "CO": 0.3, "ZA": 0.35, "IL": 0.8, "TR": 0.3}
# Stage : k€ brut par mois (min, max)
INTERN = {"US": (8, 10), "GB": (4, 5.5), "CH": (4, 5.5), "FR": (2, 3.5), "DE": (2, 3), "NL": (1.5, 2.5),
          "LU": (1.8, 2.5), "BE": (1.2, 2), "IE": (2.5, 3.5), "IT": (1, 1.8), "ES": (1, 1.8), "AE": (3, 5),
          "SG": (3, 4.5), "HK": (3.5, 5), "JP": (3, 4.5), "AU": (4, 5), "CA": (5, 7), "BR": (0.8, 1.8),
          "IN": (0.4, 1), "SE": (2, 3), "PL": (0.8, 1.5)}
# Indemnité VIE : k€ net par mois, ordre de grandeur selon le pays
VIE = {"US": (3.8, 4.6), "GB": (2.9, 3.5), "CH": (3.2, 3.8), "SG": (2.8, 3.4), "HK": (3.0, 3.6),
       "JP": (2.9, 3.5), "AE": (3.0, 3.6), "BR": (2.3, 2.9), "DE": (2.4, 2.9), "ES": (2.1, 2.6),
       "IT": (2.3, 2.8), "NL": (2.4, 2.9), "BE": (2.3, 2.8), "LU": (2.6, 3.1), "CA": (2.8, 3.4), "AU": (2.9, 3.5),
       "MX": (2.0, 2.5), "CN": (2.5, 3.1), "IN": (1.8, 2.3)}
CAT_FACTOR = {"pe": 1.05, "infra": 1.0, "pf": 0.9, "ma": 1.0, "ib": 1.0, "levfin": 1.0, "ecmdcm": 0.95}


def estimate(seniority, contract, country, category):
    cc = country or ""
    if contract == "VIE":
        lo, hi = VIE.get(cc, (2.2, 3.2))
        return {"text": f"≈ {lo:.1f}–{hi:.1f} k€ / mois (indemnité VIE, estimation)", "estimated": True}
    if contract in ("Stage", "Alternance"):
        lo, hi = INTERN.get(cc, (1.5, 3))
        if contract == "Alternance":
            lo, hi = lo * 0.6, hi * 0.6
        return {"text": f"≈ {lo:.1f}–{hi:.1f} k€ brut / mois (estimation)", "estimated": True}
    if seniority not in BASE:
        if contract == "Graduate":
            seniority = "Analyst"
        else:
            return None
    f = FACTOR.get(cc, 0.6) * CAT_FACTOR.get(category, 1.0)
    lo, hi = BASE[seniority]
    return {"text": f"≈ {round(lo*f/5)*5:.0f}–{round(hi*f/5)*5:.0f} k€ fixe / an (estimation, hors bonus)",
            "estimated": True}
