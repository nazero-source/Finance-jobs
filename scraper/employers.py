"""Liste des employeurs suivis et de leur plateforme de recrutement.

type : bank (grande banque), boutique (banque d'affaires / conseil),
       pe (private equity), infra (infrastructure), am (gestion d'actifs)
mode : "search" = on interroge la plateforme avec des mots-clés (gros employeurs)
       "all"    = on récupère toutes les offres puis on filtre (petits employeurs)

Pour ajouter un employeur, il suffit d'ajouter une ligne ici.
"""

WORKDAY = [
    # name, type, host, tenant, site, mode
    ("Morgan Stanley", "bank", "ms.wd5.myworkdayjobs.com", "ms", "External", "search"),
    ("Bank of America", "bank", "ghr.wd1.myworkdayjobs.com", "ghr", "Lateral-US", "search"),
    ("Citi", "bank", "citi.wd5.myworkdayjobs.com", "citi", "2", "search"),
    ("Barclays", "bank", "barclays.wd3.myworkdayjobs.com", "barclays", "External_Career_Site_Barclays", "search"),
    ("Deutsche Bank", "bank", "db.wd3.myworkdayjobs.com", "db", "DBWebsite", "search"),
    ("Wells Fargo", "bank", "wf.wd1.myworkdayjobs.com", "wf", "WellsFargoJobs", "search"),
    ("RBC Capital Markets", "bank", "rbc.wd3.myworkdayjobs.com", "rbc", "RBCGLOBAL1", "search"),
    ("TD Securities", "bank", "td.wd3.myworkdayjobs.com", "td", "TD_Bank_Careers", "search"),
    ("BMO Capital Markets", "bank", "bmo.wd3.myworkdayjobs.com", "bmo", "External", "search"),
    ("CIBC Capital Markets", "bank", "cibc.wd3.myworkdayjobs.com", "cibc", "search", "search"),
    ("Mizuho", "bank", "mizuho.wd1.myworkdayjobs.com", "mizuho", "MizuhoAmericas", "search"),
    ("MUFG", "bank", "mufgub.wd3.myworkdayjobs.com", "mufgub", "MUFG-Careers", "search"),
    ("Santander", "bank", "santander.wd3.myworkdayjobs.com", "santander", "SantanderCareers", "search"),
    ("ING", "bank", "ing.wd3.myworkdayjobs.com", "ing", "ICSGBLCOR", "search"),
    ("Lloyds Banking Group", "bank", "lbg.wd3.myworkdayjobs.com", "lbg", "LBG_Careers", "search"),
    ("Raymond James", "bank", "raymondjames.wd1.myworkdayjobs.com", "raymondjames", "RaymondJamesCareers", "search"),
    ("BlackRock", "am", "blackrock.wd1.myworkdayjobs.com", "blackrock", "BlackRock_Professional", "search"),
    ("Houlihan Lokey", "boutique", "hl.wd1.myworkdayjobs.com", "hl", "Campus", "all"),
    ("Houlihan Lokey", "boutique", "hl.wd1.myworkdayjobs.com", "hl", "External", "all"),
    ("PJT Partners", "boutique", "pjtpartners.wd1.myworkdayjobs.com", "pjtpartners", "Careers", "all"),
    ("Perella Weinberg", "boutique", "wd1.myworkdaysite.com", "pwp", "PWP_Experienced_Opportunities", "all"),
    ("Harris Williams", "boutique", "pnc.wd5.myworkdayjobs.com", "pnc", "HarrisWilliams", "all"),
    ("Guggenheim Partners", "boutique", "guggenheim.wd1.myworkdayjobs.com", "guggenheim", "Guggenheim_Partners", "all"),
    ("Blackstone", "pe", "blackstone.wd1.myworkdayjobs.com", "blackstone", "Blackstone_Careers", "all"),
    ("Blackstone", "pe", "blackstone.wd1.myworkdayjobs.com", "blackstone", "Blackstone_Campus_Careers", "all"),
    ("Carlyle", "pe", "carlyle.wd1.myworkdayjobs.com", "carlyle", "Carlyle", "all"),
    ("Brookfield", "infra", "brookfield.wd5.myworkdayjobs.com", "brookfield", "brookfield", "all"),
    ("Apollo", "pe", "athene.wd5.myworkdayjobs.com", "athene", "Apollo_Careers", "all"),
    ("Bain Capital", "pe", "baincapital.wd1.myworkdayjobs.com", "baincapital", "External_Public", "all"),
    ("Ardian", "pe", "ardian.wd103.myworkdayjobs.com", "ardian", "ArdianCareers", "all"),
]

ORACLE = [
    # name, type, host, siteNumber, mode
    ("J.P. Morgan", "bank", "jpmc.fa.oraclecloud.com", "CX_1001", "search"),
    ("Lazard", "boutique", "icbpjb.fa.ocs.oraclecloud.com", "CX_1001", "all"),
    ("Lazard", "boutique", "icbpjb.fa.ocs.oraclecloud.com", "CX_1", "all"),
    ("Lazard", "boutique", "icbpjb.fa.ocs.oraclecloud.com", "CX_2", "all"),
    ("IFM Investors", "infra", "enlc.fa.ap1.oraclecloud.com", "CX", "all"),
]

GREENHOUSE = [
    ("TPG", "pe", "tpgcareers"),
    ("General Atlantic", "pe", "generalatlantic"),
    ("StepStone Group", "pe", "stepstone"),
    ("William Blair", "boutique", "williamblair"),
    ("Lincoln International", "boutique", "lincolninternational"),
    ("Solomon Partners", "boutique", "solomonpartnersstudentsgraduates"),
]

LEVER = [
    ("Seaport Global", "boutique", "seaportglobal"),
]

WORKABLE = [
    ("DC Advisory", "boutique", "dcadvisory"),
]

RECRUITEE = [
    ("Meridiam", "infra", "meridiam"),
]

SMARTRECRUITERS = [
    ("Tikehau Capital", "pe", "tikehaucapital"),
]

GOLDMAN = ("Goldman Sachs", "bank")

# Mots-clés envoyés aux plateformes en mode "search"
SEARCH_TERMS = [
    "mergers acquisitions", "M&A", "investment banking", "private equity",
    "infrastructure", "project finance", "leveraged finance", "acquisition finance",
    "corporate finance", "summer analyst", "banking intern", "banking graduate",
    "capital markets origination", "energy finance", "advisory analyst",
]
