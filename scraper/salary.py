"""Salaire des postes juniors : extraction depuis l'annonce, sinon estimation.

Ordre de priorité :
1. salaire écrit dans l'annonce ("annoncé") ;
2. fourchette observée sur les offres comparables du site qui affichent un salaire
   (même pays, même type de poste) — calibrage automatique, recalculé chaque jour ;
3. grille de marché par pays × type d'employeur × type de contrat (salaire fixe, hors bonus).

Toutes les grilles sont en devise locale ; l'équivalent en euros est indicatif.
"""
import re, statistics

CUR = {"$": "USD", "US$": "USD", "USD": "USD", "£": "GBP", "GBP": "GBP", "€": "EUR", "EUR": "EUR",
       "CHF": "CHF", "C$": "CAD", "CAD": "CAD", "A$": "AUD", "AUD": "AUD", "S$": "SGD", "SGD": "SGD",
       "HK$": "HKD", "HKD": "HKD", "R$": "BRL", "BRL": "BRL", "¥": "JPY", "JPY": "JPY", "AED": "AED",
       "INR": "INR", "₹": "INR", "SAR": "SAR", "SEK": "SEK", "NOK": "NOK", "DKK": "DKK", "PLN": "PLN", "MXN": "MXN"}
SYM = {"USD": "$", "GBP": "£", "EUR": "€", "CHF": "CHF ", "CAD": "C$", "AUD": "A$", "SGD": "S$", "HKD": "HK$",
       "BRL": "R$", "JPY": "¥", "AED": "AED ", "INR": "₹", "SAR": "SAR ", "SEK": "SEK ", "NOK": "NOK ", "DKK": "DKK ",
       "PLN": "PLN ", "MXN": "MXN ", "CNY": "CNY ", "KRW": "₩"}
# Taux indicatifs vers l'euro (ordre de grandeur, pour l'équivalent affiché)
TO_EUR = {"EUR": 1, "USD": 0.92, "GBP": 1.17, "CHF": 1.05, "CAD": 0.67, "AUD": 0.60, "SGD": 0.69, "HKD": 0.118,
          "BRL": 0.17, "JPY": 0.0062, "AED": 0.25, "INR": 0.011, "SAR": 0.245, "SEK": 0.087, "NOK": 0.085,
          "DKK": 0.134, "PLN": 0.23, "MXN": 0.05, "CNY": 0.128, "KRW": 0.00067}

CUR_RX = r"(US\$|C\$|A\$|S\$|HK\$|R\$|\$|£|€|¥|₹|USD|GBP|EUR|CHF|CAD|AUD|SGD|HKD|BRL|JPY|AED|INR|SAR|SEK|NOK|DKK|PLN|MXN)"
NUM_RX = r"(\d{1,3}(?:[,.\s]\d{3})+|\d+(?:\.\d+)?)\s*([kK])?"
RANGE = re.compile(CUR_RX + r"\s?" + NUM_RX + r"(?:\s*(?:USD|GBP|EUR))?\s*(?:-|–|—|to|and|à)\s*" + CUR_RX + r"?\s?" + NUM_RX)
SINGLE = re.compile(CUR_RX + r"\s?" + NUM_RX)
POST = re.compile(r"(\d{1,3}(?:[,.\s ]\d{3})+|\d+)\s*([kK])?\s*(€|EUR|£|GBP|CHF)")
CONTEXT = re.compile(r"salary|compensation|pay range|base pay|pay rate|hourly rate|rémunération|salaire|"
                     r"remuneration|stipend|gross|annual base|wage|gratification", re.I)


def _num(s, k):
    s = re.sub(r"[,\s ]", "", s)
    if s.count(".") >= 1 and len(s.split(".")[-1]) == 3:
        s = s.replace(".", "")
    try:
        v = float(s)
    except ValueError:
        return None
    return v * 1000 if k else v


def extract(text):
    """Fourchette écrite dans l'annonce -> dict(lo, hi, cur, unit, text, estimated=False)."""
    if not text:
        return None
    for m in CONTEXT.finditer(text):
        window = text[max(0, m.start() - 150): m.end() + 350]
        r = RANGE.search(window)
        if r:
            cur = CUR.get(r.group(1))
            lo, hi = _num(r.group(2), r.group(3)), _num(r.group(5), r.group(6))
            if lo and hi and hi >= lo:
                res = _mk(cur, lo, hi, window[r.end(): r.end() + 40])
                if res:
                    return res
        s = SINGLE.search(window)
        p = POST.search(window)
        if s:
            cur, v = CUR.get(s.group(1)), _num(s.group(2), s.group(3))
        elif p:
            cur, v, s = CUR.get(p.group(3)), _num(p.group(1), p.group(2)), p
        if s and v and v >= 10:
            res = _mk(cur, v, v, window[s.end(): s.end() + 40])
            if res:
                return res
    return None


def _mk(cur, lo, hi, after):
    if re.match(r"\s*(?:billion|million|trillion|bn|mn|m\b|\+? ?(?:employees|clients|offices))", after, re.I):
        return None
    unit = "an"
    if re.search(r"hour|/hr|per hr|heure", after, re.I) or hi < 300:
        unit = "heure"
    elif re.search(r"month|mois|/mo", after, re.I) or hi < 15000:
        unit = "mois"
    if unit == "an" and hi < 15000:
        return None
    if unit == "heure":   # converti en mois (40 h × 52 / 12)
        lo, hi, unit = round(lo * 173, -2), round(hi * 173, -2), "mois"
    return {"lo": lo, "hi": hi, "cur": cur or "", "unit": unit, "estimated": False, "basis": "annonce"}


# --- Grilles de marché, postes juniors, devise locale -------------------------------------
# Employeurs « tier 1 » : bulge brackets, elite boutiques, grands fonds
TIER1 = {"Goldman Sachs", "Morgan Stanley", "J.P. Morgan", "Bank of America", "Citi", "Barclays", "Deutsche Bank",
         "UBS", "Lazard", "Evercore", "PJT Partners", "Moelis & Company", "Perella Weinberg", "Centerview",
         "Rothschild & Co", "Blackstone", "KKR", "Apollo", "Carlyle", "TPG", "Bain Capital", "General Atlantic", "EQT",
         "LionTree", "The Raine Group", "Ducera Partners", "Jefferies", "Houlihan Lokey", "Guggenheim Partners",
         "Solomon Partners", "Stone Point Capital", "Platinum Equity", "TA Associates", "Brookfield", "BlackRock",
         "Ardian", "PAI Partners", "BC Partners", "Apax Partners", "ICG", "Hamilton Lane"}
FR_BANKS = {"Crédit Agricole CIB", "BNP Paribas", "Société Générale", "Natixis"}

# Analyst 1 / graduate : salaire fixe annuel (tier1, autres)
FT = {
    "US": ("USD", (110e3, 125e3), (90e3, 110e3)), "GB": ("GBP", (65e3, 75e3), (48e3, 60e3)),
    "FR": ("EUR", (62e3, 75e3), (48e3, 60e3)), "DE": ("EUR", (68e3, 80e3), (55e3, 65e3)),
    "CH": ("CHF", (100e3, 120e3), (85e3, 100e3)), "NL": ("EUR", (55e3, 65e3), (45e3, 55e3)),
    "BE": ("EUR", (50e3, 60e3), (42e3, 50e3)), "LU": ("EUR", (55e3, 65e3), (48e3, 56e3)),
    "IT": ("EUR", (42e3, 52e3), (32e3, 40e3)), "ES": ("EUR", (42e3, 52e3), (32e3, 40e3)),
    "IE": ("EUR", (55e3, 65e3), (42e3, 52e3)), "SE": ("SEK", (550e3, 650e3), (450e3, 540e3)),
    "NO": ("NOK", (650e3, 750e3), (520e3, 620e3)), "DK": ("DKK", (480e3, 560e3), (400e3, 470e3)),
    "PL": ("PLN", (150e3, 200e3), (100e3, 140e3)), "AE": ("AED", (300e3, 380e3), (220e3, 300e3)),
    "SA": ("SAR", (300e3, 400e3), (220e3, 300e3)), "SG": ("SGD", (100e3, 120e3), (72e3, 92e3)),
    "HK": ("HKD", (600e3, 720e3), (420e3, 540e3)), "JP": ("JPY", (9e6, 12e6), (6e6, 8e6)),
    "AU": ("AUD", (100e3, 120e3), (80e3, 95e3)), "CA": ("CAD", (90e3, 110e3), (75e3, 90e3)),
    "IN": ("INR", (2.0e6, 3.0e6), (1.2e6, 1.8e6)), "CN": ("CNY", (300e3, 450e3), (200e3, 300e3)),
    "KR": ("KRW", (60e6, 80e6), (45e6, 60e6)), "BR": ("BRL", (130e3, 180e3), (80e3, 120e3)),
    "MX": ("MXN", (550e3, 800e3), (350e3, 550e3)),
}
# Stage : brut mensuel (tier1, autres)
INTERN = {
    "US": ("USD", (9.2e3, 10.5e3), (6.0e3, 8.5e3)), "GB": ("GBP", (5.0e3, 5.8e3), (2.5e3, 3.5e3)),
    "FR": ("EUR", (2.8e3, 3.6e3), (1.5e3, 2.5e3)), "DE": ("EUR", (2.5e3, 3.2e3), (1.5e3, 2.2e3)),
    "CH": ("CHF", (4.0e3, 5.5e3), (2.5e3, 3.5e3)), "NL": ("EUR", (2.0e3, 2.8e3), (1.0e3, 1.8e3)),
    "BE": ("EUR", (1.5e3, 2.2e3), (0.9e3, 1.5e3)), "LU": ("EUR", (1.8e3, 2.5e3), (1.2e3, 1.8e3)),
    "IT": ("EUR", (1.2e3, 1.8e3), (0.8e3, 1.2e3)), "ES": ("EUR", (1.2e3, 1.8e3), (0.8e3, 1.2e3)),
    "IE": ("EUR", (2.5e3, 3.5e3), (1.8e3, 2.5e3)), "AE": ("AED", (12e3, 18e3), (6e3, 10e3)),
    "SG": ("SGD", (4.5e3, 6.0e3), (2.0e3, 3.5e3)), "HK": ("HKD", (25e3, 35e3), (12e3, 18e3)),
    "JP": ("JPY", (400e3, 600e3), (250e3, 350e3)), "AU": ("AUD", (7e3, 9e3), (4e3, 6e3)),
    "CA": ("CAD", (6e3, 8e3), (4e3, 5.5e3)), "IN": ("INR", (100e3, 200e3), (30e3, 60e3)),
    "BR": ("BRL", (3e3, 5e3), (2e3, 3e3)), "KR": ("KRW", (2.5e6, 4e6), (1.8e6, 2.5e6)),
    "SE": ("SEK", (25e3, 35e3), (15e3, 22e3)), "PL": ("PLN", (5e3, 8e3), (3e3, 5e3)),
}
# Banques françaises (grilles internes plus basses)
FR_BANK_FT = (50e3, 58e3)
FR_BANK_INTERN = (1.6e3, 2.2e3)
# Indemnité VIE mensuelle (barème Business France, ordre de grandeur, en euros)
VIE = {"US": 4500, "GB": 3300, "CH": 3900, "SG": 3200, "HK": 3400, "JP": 3500, "AE": 3400, "BR": 2700,
       "DE": 2650, "ES": 2350, "IT": 2550, "NL": 2700, "BE": 2600, "LU": 2750, "CA": 2850, "AU": 3250,
       "MX": 2300, "CN": 2900, "IN": 2050, "KR": 3000, "SA": 3300, "QA": 3300, "MA": 1900, "PL": 2100, "IE": 2900}


def fmt(sal):
    """Texte affiché : '£65k – £75k / an (≈ 76–88 k€)'."""
    lo, hi, cur, unit = sal["lo"], sal["hi"], sal["cur"], sal["unit"]
    sym = SYM.get(cur, cur + " ")
    def f(v):
        if v >= 1e6:
            return f"{v/1e6:.1f}M".replace(".0M", "M")
        if v >= 10000:
            return f"{v/1000:.0f}k"
        if v >= 1000:
            v = round(v, -2)
        return f"{v:,.0f}".replace(",", " ")
    txt = f"{sym}{f(lo)}" + (f" – {sym}{f(hi)}" if round(hi) != round(lo) else "") + f" / {unit}"
    if cur and cur != "EUR" and cur in TO_EUR:
        e_lo, e_hi = lo * TO_EUR[cur], hi * TO_EUR[cur]
        if unit == "an":
            txt += f" (≈ {e_lo/1000:.0f}–{e_hi/1000:.0f} k€)" if round(e_hi / 1000) != round(e_lo / 1000) else f" (≈ {e_lo/1000:.0f} k€)"
        else:
            r = lambda v: round(v, -2) if v >= 1000 else round(v)
            txt += (f" (≈ {r(e_lo):,.0f}–{r(e_hi):,.0f} €)" if r(e_hi) != r(e_lo) else f" (≈ {r(e_lo):,.0f} €)").replace(",", " ")
    return txt


def grid(employer, contract, cc):
    if contract == "VIE":
        v = VIE.get(cc, 2500)
        return {"lo": v * 0.95, "hi": v * 1.05, "cur": "EUR", "unit": "mois", "estimated": True,
                "basis": "indemnité VIE (barème Business France)"}
    intern = contract in ("Stage", "Alternance")
    tier1 = employer in TIER1
    if cc == "FR" and employer in FR_BANKS:
        lo, hi = FR_BANK_INTERN if intern else FR_BANK_FT
        cur = "EUR"
    else:
        table = INTERN if intern else FT
        if cc not in table:
            return None
        cur, t1, t2 = table[cc]
        lo, hi = t1 if tier1 else t2
    if contract == "Alternance":
        lo, hi = lo * 0.6, hi * 0.6
    return {"lo": lo, "hi": hi, "cur": cur, "unit": "mois" if intern else "an", "estimated": True,
            "basis": "grille de marché " + ("tier 1" if tier1 else "autres employeurs")}


def calibrate(jobs):
    """Fourchettes observées sur les salaires annoncés : clé (pays, stage?, tier1?) -> (lo, hi, cur, unit, n)."""
    buckets = {}
    for j in jobs:
        s = j.get("_sal")
        if not s or s.get("estimated") or not j.get("cc"):
            continue
        intern = j["contract"] in ("Stage", "Alternance")
        unit = "mois" if intern else "an"
        if s["unit"] != unit or not s["cur"]:
            continue
        key = (j["cc"], intern, j["employer"] in TIER1)
        buckets.setdefault(key, []).append((s["cur"], (s["lo"] + s["hi"]) / 2))
    out = {}
    for key, vals in buckets.items():
        cur = statistics.mode(c for c, _ in vals)
        xs = sorted(v for c, v in vals if c == cur)
        if len(xs) >= 4:
            q = statistics.quantiles(xs, n=4)
            out[key] = (q[0], q[2], cur, "mois" if key[1] else "an", len(xs))
    return out


def estimate(employer, contract, cc, calib):
    if contract != "VIE":
        c = calib.get((cc, contract in ("Stage", "Alternance"), employer in TIER1))
        if c:
            lo, hi, cur, unit, n = c
            return {"lo": lo, "hi": hi, "cur": cur, "unit": unit, "estimated": True,
                    "basis": f"{n} offres comparables avec salaire affiché"}
    return grid(employer, contract, cc)
