"""Classement des offres par règles (sans IA) : métier, contrat, niveau."""
import re

def rx(*words):
    return re.compile(r"(?<![a-z0-9])(?:" + "|".join(words) + r")(?![a-z0-9])", re.I)

CATEGORIES = {
    "ma": "M&A / Conseil",
    "ib": "Investment Banking",
    "levfin": "Leveraged & Acquisition Finance",
    "ecmdcm": "ECM / DCM",
    "pe": "Private Equity",
    "infra": "Infrastructure",
    "pf": "Project Finance",
}

# Mots-clés dans le TITRE (fort signal), par ordre de priorité
TITLE_RULES = [
    ("pf", rx(r"project financ\w*", r"financement de projets?", r"infrastructure financ\w*",
              r"energy (?:& |and )?infrastructure financ\w*", r"export financ\w*",
              r"power (?:& |and )?(?:renewables?|utilities) financ\w*", r"renewables? financ\w*",
              r"structured financ\w* .{0,20}(?:energy|infra)", r"project & export")),
    ("infra", rx(r"infrastructure", r"infra", r"energy transition", r"renewables? invest\w*",
                 r"digital infrastructure", r"transition investing", r"real assets")),
    ("pe", rx(r"private equity", r"buy-?outs?", r"growth equity", r"growth investing", r"lbo",
              r"secondaries", r"co-?invest\w*", r"capital investissement", r"private capital",
              r"investment professional", r"expansion", r"mid-?cap", r"large-?cap", r"tactical opportunities",
              r"portfolio operations")),
    ("levfin", rx(r"debt advisory", r"capital solutions", r"leveraged financ\w*", r"acquisition financ\w*", r"lev ?fin", r"sponsor finance",
                  r"financial sponsors?")),
    ("ecmdcm", rx(r"ecm", r"dcm", r"equity capital markets", r"debt capital markets", r"capital markets origination")),
    ("ma", rx(r"m ?& ?a", r"mergers?", r"acquisitions?", r"m&amp;a", r"fusions?", r"corporate financ\w*",
              r"financial advisory", r"strategic advisory", r"shareholder advisory", r"restructuring",
              r"sell[- ]side", r"transaction services", r"advisory analyst", r"advisory associate",
              r"corporate advisory", r"fairness opinion", r"conseil en fusions")),
    ("ib", rx(r"investment bank\w*", r"ibd", r"global banking", r"corporate (?:&|and) investment bank\w*",
              r"banking analyst", r"banking associate", r"banking summer", r"coverage", r"industry group",
              r"cib", r"o&a", r"origination (?:&|and) advisory", r"banque d'affaires", r"banque de financement")),
]

# Mots-clés dans la DESCRIPTION (signal plus faible, pour les titres génériques)
DESC_RULES = [
    ("pf", rx(r"project finance", r"debt sizing", r"dscr", r"financement de projets")),
    ("infra", rx(r"infrastructure (?:fund|investment|equity|investing|assets)", r"greenfield", r"brownfield")),
    ("pe", rx(r"private equity", r"buyouts?", r"portfolio compan(?:y|ies)", r"lbo model\w*")),
    ("levfin", rx(r"leveraged finance", r"acquisition finance")),
    ("ma", rx(r"m&a", r"mergers? (?:and|&) acquisitions", r"sell-side", r"buy-side")),
    ("ib", rx(r"investment banking")),
]

# Titres à exclure : fonctions support / hors sujet
EXCLUDE_TITLE = rx(
    r"technolog\w*", r"engineer\w*", r"developer", r"software", r"data", r"it", r"cyber\w*",
    r"operations?", r"ops", r"compliance", r"audit\w*", r"legal", r"counsel", r"paralegal", r"lawyer",
    r"tax", r"accountant", r"accounting", r"controllers?", r"product control", r"financial control\w*",
    r"payroll", r"hr", r"human resources", r"talent", r"recruit\w*", r"marketing", r"communications?",
    r"executive assistant", r"administrative", r"assistant", r"receptionist", r"facilities", r"kyc", r"aml",
    r"onboarding", r"client service\w*", r"customer", r"teller", r"branch", r"mortgage", r"wealth",
    r"private bank\w*", r"financial advisor", r"relationship banker", r"loan officer", r"risk",
    r"model validation", r"quant\w*", r"trading", r"trader", r"sales", r"research analyst", r"equity research",
    r"fund accounting", r"fund admin\w*", r"investor relations", r"fundraising", r"valuations?", r"procurement",
    r"real estate", r"property", r"credit analyst", r"credit risk", r"underwrit\w*", r"insurance",
    r"cash management", r"treasury services", r"payments?", r"custody", r"architect", r"designer",
    r"product manager", r"project manager", r"program manager", r"analytics", r"reporting", r"fp&a",
    r"chauffeur", r"driver", r"security", r"workplace", r"event\w*", r"office manager", r"secretary",
    r"middle office", r"back office", r"settlements?", r"collateral", r"lending services", r"business analyst",
    r"consumer", r"retail", r"card", r"contact cent(?:er|re)", r"call cent(?:er|re)", r"nurse", r"medical",
    r"construction manager", r"site manager", r"electrician", r"technician", r"maintenance", r"leasing",
    r"corporate banking", r"commercial banking", r"treasury", r"financial analyst", r"compensation", r"benefits",
    r"sustainability", r"esg", r"isr", r"appels? d'offres", r"gestion", r"fund finance", r"capital formation",
    r"product\w*", r"family investors?", r"investor (?:relations|services|solutions)", r"devops", r"platform", r"cloud", r"network (?:infrastructure|engineer\w*|admin\w*)", r"billing", r"business development",
    r"relationship partner", r"re debt", r"enablement", r"deal services", r"conflicts", r"documentation", r"credit officer", r"portfolio manager", r"agency services", r"structurer",
    r"rates", r"commodities", r"trade finance", r"working capital", r"trade (?:&|and) working capital",
    r"fp&a", r"finance manager", r"finance & strategy", r"finance (?:and|&) strategy", r"middle market banking",
    r"loan", r"loans", r"syndicate", r"portfolio management", r"asset management", r"investment management",
)
# Dans les fonds, on accepte un titre générique (Analyst, Associate…) sauf ces mots
EXCLUDE_DEFAULT = rx(r"credit", r"lending", r"real estate", r"hedge", r"liquid", r"multi-asset", r"bxma",
                     r"insurance", r"retirement", r"wealth", r"capital formation", r"product strategy",
                     r"investor", r"client", r"distribution")
GENERIC_ROLE = rx(r"analyst", r"associate", r"vice president", r"vp", r"principal", r"investment",
                  r"intern", r"internship", r"summer", r"stagiaire", r"stage", r"graduate", r"off-cycle",
                  r"investment manager", r"investment director")

CONTRACT_RULES = [
    ("VIE", rx(r"v\.?i\.?e", r"volontariat international")),
    ("Alternance", rx(r"alternance", r"alternant\w*", r"apprenti\w*", r"apprentice\w*", r"work-study",
                      r"werkstudent\w*", r"dual stud\w*")),
    ("Stage", rx(r"intern", r"interns", r"internship", r"stage", r"stagiaire", r"summer analyst",
                 r"summer associate", r"summer", r"off[- ]cycle", r"placement", r"praktikum", r"praktikant\w*",
                 r"tirocinio", r"pr[aá]cticas", r"est[aá]gio", r"spring week", r"insight (?:week|program\w*)",
                 r"trainee", r"working student")),
    ("Graduate", rx(r"graduate", r"graduates", r"new analyst", r"analyst program\w*", r"analyst class",
                    r"full[- ]time analyst", r"campus", r"entry[- ]level", r"new grad\w*", r"early careers?",
                    r"class of 20\d\d", r"jeune dipl[oô]m[ée]e?", r"junior analyst")),
]

SENIORITY_RULES = [
    ("Managing Director", rx(r"managing director", r"md", r"partner", r"head of")),
    ("Director", rx(r"director", r"executive director", r"senior vice president", r"svp", r"principal")),
    ("Vice President", rx(r"vice president", r"vp", r"avp")),
    ("Associate", rx(r"associate", r"senior associate", r"associate director")),
    ("Analyst", rx(r"analyst", r"analyste", r"junior")),
]


def classify(title, desc="", employer_type="bank", experience_hint=""):
    """Retourne dict(category, contract, seniority) ou None si hors sujet."""
    t = " " + title.replace("&amp;", "&") + " "
    if EXCLUDE_TITLE.search(t):
        return None
    cat = None
    for key, r in TITLE_RULES:
        if r.search(t):
            cat = key
            break
    if cat is None:
        # Titre générique (ex. « Analyst – Paris ») : on regarde l'employeur et la description
        if not GENERIC_ROLE.search(t) or EXCLUDE_DEFAULT.search(t):
            return None
        d = desc[:6000]
        scores = {k: len(r.findall(d)) for k, r in DESC_RULES}
        best = max(scores, key=scores.get)
        if scores[best] >= 2:
            cat = best
        elif employer_type == "pe":
            cat = "pe"
        elif employer_type == "infra":
            cat = "infra"
        elif employer_type == "boutique":
            cat = "ma"
        else:
            return None
    # Une offre « infrastructure » dans une grande banque est presque toujours du conseil / financement
    if cat == "infra" and employer_type in ("bank", "boutique") and not re.search(r"invest|equity|fund", t, re.I):
        cat = "pf" if re.search(r"financ", t, re.I) else "ma"

    contract = None
    for c, r in CONTRACT_RULES:
        if r.search(t):
            contract = c
            break
    if contract is None:
        contract = "Graduate" if experience_hint == "EARLY_CAREER" else "CDI / Expérimenté"

    seniority = None
    for s, r in SENIORITY_RULES:
        if r.search(t):
            seniority = s
            break
    if contract in ("Stage", "VIE", "Alternance"):
        seniority = "Stagiaire / VIE"
    elif seniority is None:
        seniority = "Analyst" if contract == "Graduate" else "Non précisé"
    return {"category": cat, "contract": contract, "seniority": seniority}


def title_prefilter(title, employer_type):
    """Filtre rapide sur le titre seul, avant de télécharger la description."""
    t = " " + title.replace("&amp;", "&") + " "
    if EXCLUDE_TITLE.search(t):
        return False
    if any(r.search(t) for _, r in TITLE_RULES):
        return True
    if employer_type in ("pe", "infra", "boutique"):
        return bool(GENERIC_ROLE.search(t)) and not EXCLUDE_DEFAULT.search(t)
    return False
