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
    ("Moelis & Company", "boutique", "moelis.wd1.myworkdayjobs.com", "moelis", "Experienced-Hires", "all"),
    ("ICG", "pe", "icg.wd3.myworkdayjobs.com", "icg", "external_careers", "all"),
    ("BBVA", "bank", "bbva.wd3.myworkdayjobs.com", "bbva", "BBVA", "search"),
    ("DBS", "bank", "dbs.wd3.myworkdayjobs.com", "dbs", "DBS_Careers", "search"),
    ("CDPQ", "am", "cdpq.wd10.myworkdayjobs.com", "cdpq", "CDPQ", "all"),
    ("CDPQ", "infra", "cdpq.wd10.myworkdayjobs.com", "cdpq", "CDPQ-recrutement-universitaire", "all"),
    ("Ontario Teachers'", "am", "otppb.wd3.myworkdayjobs.com", "otppb", "OntarioTeachers_Careers", "all"),
    ("Hamilton Lane", "pe", "hamiltonlane.wd108.myworkdayjobs.com", "hamiltonlane", "search", "all"),
    ("Alantra", "boutique", "alantra.wd3.myworkdayjobs.com", "alantra", "Alantra", "all"),
    ("Guggenheim Partners", "boutique", "guggenheim.wd1.myworkdayjobs.com", "guggenheim", "Guggenheim_Careers_Campus", "all"),
    ("LGT Capital Partners", "pe", "lgtcp.wd502.myworkdayjobs.com", "lgtcp", "lgtcpcurrentvacancies", "all"),
    ("Howden Capital Markets & Advisory", "bank", "hyperiongrp.wd3.myworkdayjobs.com", "hyperiongrp", "Hyperion_External", "search"),
    ("Texas Capital", "bank", "texascapitalbank.wd12.myworkdayjobs.com", "texascapitalbank", "Careers", "search"),
]

ORACLE = [
    # name, type, host, siteNumber, mode
    ("J.P. Morgan", "bank", "jpmc.fa.oraclecloud.com", "CX_1001", "search"),
    ("Lazard", "boutique", "icbpjb.fa.ocs.oraclecloud.com", "CX_1001", "all"),
    ("Lazard", "boutique", "icbpjb.fa.ocs.oraclecloud.com", "CX_1", "all"),
    ("Lazard", "boutique", "icbpjb.fa.ocs.oraclecloud.com", "CX_2", "all"),
    ("IFM Investors", "infra", "enlc.fa.ap1.oraclecloud.com", "CX", "all"),
    ("Jefferies", "bank", "hdid.fa.us2.oraclecloud.com", "CX_1", "all"),
]

GREENHOUSE = [
    ("TPG", "pe", "tpgcareers"),
    ("General Atlantic", "pe", "generalatlantic"),
    ("StepStone Group", "pe", "stepstone"),
    ("William Blair", "boutique", "williamblair"),
    ("Lincoln International", "boutique", "lincolninternational"),
    ("Solomon Partners", "boutique", "solomonpartnersstudentsgraduates"),
    ("LionTree", "boutique", "liontree"),
    ("Ducera Partners", "boutique", "ducerapartners"),
    ("Ducera Partners", "boutique", "ducerapartnerscampus"),
    ("EQT", "pe", "eqtpartners"),
    ("Audax Group", "pe", "audaxgroup"),
    ("Adams Street Partners", "pe", "adamsstreetpartners"),
    ("Lexington Partners", "pe", "lexingtonpartners"),
    ("Platinum Equity", "pe", "platinumequitycareers"),
    ("Forvis Mazars", "bank", "forvismazars"),
    ("FT Partners", "boutique", "financialtechnologypartners"),
    ("AQ Technology Partners", "boutique", "aqtechnologypartners"),
    ("GTCR", "pe", "gtcr"),
    ("Pantheon", "pe", "pantheonpublic"),
    ("LLR Partners", "pe", "llrpartnersjobs"),
    ("Emigrant Capital", "pe", "emigrantcapital"),
    ("GCM Grosvenor", "pe", "gcmgrosvenor"),
]

LEVER = [
    ("Seaport Global", "boutique", "seaportglobal"),
    ("The Raine Group", "boutique", "raine"),
    ("Aeris Partners", "boutique", "aerispartners.com"),
    ("D.A. Davidson", "boutique", "dadavidson"),
    ("HCVT", "boutique", "hcvt"),
    ("Harrison Street", "infra", "harrisonst"),
    ("CIM Group", "infra", "cimgroup"),
]

WORKABLE = [
    ("DC Advisory", "boutique", "dcadvisory"),
    ("Clipperton", "boutique", "clipperton"),
    ("The McLean Group", "boutique", "the-mclean-group"),
    ("Interpath Advisory", "boutique", "interpath-advisory"),
    ("Improved Corporate Finance", "boutique", "improvedcf"),
]

RECRUITEE = [
    ("Meridiam", "infra", "meridiam"),
    ("Green Giraffe", "boutique", "greengiraffe"),
    ("Apax Partners", "pe", "apax"),
    ("IK Partners", "pe", "ikpartners"),
    ("Egeria", "pe", "egeria"),
    ("PAI Partners", "pe", "paipartners"),
    ("BC Partners", "pe", "bcpartners"),
    ("Eight Advisory", "boutique", "8advisory"),
]

SMARTRECRUITERS = [
    ("Tikehau Capital", "pe", "tikehaucapital"),
    ("Capza", "pe", "capza"),
    ("TA Associates", "pe", "taassociates"),
    ("StepStone Group", "pe", "stepstonegroup"),
    ("Accurent", "boutique", "Accurent"),
]

PERSONIO = [
    ("Clearwater International", "boutique", "clearwater", "de"),
    ("Oaklins", "boutique", "oaklins", "de"),
    ("Pava Partners", "boutique", "pava-partners", "de"),
    ("DUBAG", "pe", "dubag", "de"),
    ("Rautenberg & Company", "boutique", "rautenbergco", "de"),
    ("Capital Corporate Finance", "boutique", "ccf", "de"),
    ("Prime Capital", "infra", "primecapital-ag", "de"),
    ("HQ Capital", "pe", "hq-capital-deutschland-gmbh", "de"),
]

TEAMTAILOR = [
    ("Kepler Cheuvreux", "boutique", "keplercheuvreux.teamtailor.com"),
]

BAMBOOHR = [
    ("Summa Equity", "pe", "summaequity"),
    ("Stone Point Capital", "pe", "stonepoint"),
    ("Solomon Partners", "boutique", "solomonpartners"),
]

ASHBY = [
    ("Pemberton", "pe", "pemberton"),
    ("Agentis Capital", "boutique", "Agentis-Capital-Advisors"),
    ("Ridgepeak Partners", "pe", "ridgepeak-partners"),
    ("MACA", "boutique", "maca"),
]

EIGHTFOLD = [
    # name, type, host, domain
    ("HSBC", "bank", "portal.careers.hsbc.com", "hsbc.com"),
]

CACIB = ("Crédit Agricole CIB", "bank")

GOLDMAN = ("Goldman Sachs", "bank")

# Mots-clés envoyés aux plateformes en mode "search"
SEARCH_TERMS = [
    "mergers acquisitions", "M&A", "investment banking", "investment banking analyst",
    "investment banking intern", "summer analyst", "off-cycle", "off cycle internship",
    "graduate programme", "graduate program", "analyst program", "full time analyst",
    "private equity", "private equity intern", "infrastructure", "infrastructure analyst",
    "project finance", "project finance analyst", "leveraged finance", "acquisition finance",
    "corporate finance", "capital markets origination", "energy finance", "advisory analyst",
    "stage", "stagiaire", "VIE", "working student", "placement", "internship banking",
]

# Domaines pour afficher le logo de chaque employeur
DOMAINS = {
    "Morgan Stanley": "morganstanley.com", "Bank of America": "bankofamerica.com", "Citi": "citigroup.com",
    "Barclays": "barclays.com", "Deutsche Bank": "db.com", "Wells Fargo": "wellsfargo.com",
    "RBC Capital Markets": "rbccm.com", "TD Securities": "tdsecurities.com", "BMO Capital Markets": "bmo.com",
    "CIBC Capital Markets": "cibc.com", "Mizuho": "mizuhogroup.com", "MUFG": "mufg.jp", "Santander": "santander.com",
    "ING": "ing.com", "Lloyds Banking Group": "lloydsbankinggroup.com", "Raymond James": "raymondjames.com",
    "BlackRock": "blackrock.com", "Houlihan Lokey": "hl.com", "PJT Partners": "pjtpartners.com",
    "Perella Weinberg": "pwpartners.com", "Harris Williams": "harriswilliams.com", "Guggenheim Partners": "guggenheimpartners.com",
    "Blackstone": "blackstone.com", "Carlyle": "carlyle.com", "Brookfield": "brookfield.com", "Apollo": "apollo.com",
    "Bain Capital": "baincapital.com", "Ardian": "ardian.com", "Moelis & Company": "moelis.com", "ICG": "icgam.com",
    "BBVA": "bbva.com", "DBS": "dbs.com", "CDPQ": "cdpq.com", "Ontario Teachers'": "otpp.com", "Hamilton Lane": "hamiltonlane.com",
    "J.P. Morgan": "jpmorgan.com", "Lazard": "lazard.com", "IFM Investors": "ifminvestors.com", "Jefferies": "jefferies.com",
    "Goldman Sachs": "goldmansachs.com", "TPG": "tpg.com", "General Atlantic": "generalatlantic.com", "StepStone Group": "stepstonegroup.com",
    "William Blair": "williamblair.com", "Lincoln International": "lincolninternational.com", "Solomon Partners": "solomonpartners.com",
    "LionTree": "liontree.com", "Ducera Partners": "ducerapartners.com", "EQT": "eqtgroup.com", "Audax Group": "audaxgroup.com",
    "Adams Street Partners": "adamsstreetpartners.com", "Lexington Partners": "lexingtonpartners.com", "Platinum Equity": "platinumequity.com",
    "Forvis Mazars": "forvismazars.com", "Seaport Global": "seaportglobal.com", "The Raine Group": "raine.com",
    "DC Advisory": "dcadvisory.com", "Clipperton": "clipperton.com", "Meridiam": "meridiam.com", "Green Giraffe": "green-giraffe.com",
    "Apax Partners": "apax.fr", "IK Partners": "ikpartners.com", "Egeria": "egeria.nl", "PAI Partners": "paipartners.com",
    "BC Partners": "bcpartners.com", "Tikehau Capital": "tikehaucapital.com", "Capza": "capza.co", "TA Associates": "ta.com",
    "Clearwater International": "cwicf.com", "Oaklins": "oaklins.com", "Summa Equity": "summaequity.com",
    "Stone Point Capital": "stonepoint.com", "Alantra": "alantra.com", "LGT Capital Partners": "lgtcp.com",
    "Howden Capital Markets & Advisory": "howdengroup.com", "Texas Capital": "texascapitalbank.com", "FT Partners": "ftpartners.com",
    "AQ Technology Partners": "aqtechpartners.com", "GTCR": "gtcr.com", "Pantheon": "pantheon.com", "LLR Partners": "llrpartners.com",
    "Emigrant Capital": "emigrantcapital.com", "GCM Grosvenor": "gcmgrosvenor.com", "Aeris Partners": "aerispartners.com",
    "D.A. Davidson": "dadavidson.com", "HCVT": "hcvt.com", "Harrison Street": "harrisonst.com", "CIM Group": "cimgroup.com",
    "The McLean Group": "mcleanllc.com", "Interpath Advisory": "interpath.com", "Improved Corporate Finance": "improvedcf.com",
    "Eight Advisory": "8advisory.com", "Accurent": "accurent.com", "Pava Partners": "pava-partners.com", "DUBAG": "dubag.de",
    "Rautenberg & Company": "rautenberg.co", "Capital Corporate Finance": "ccf.de", "Prime Capital": "primecapital-ag.com",
    "HQ Capital": "hqcapital.com", "Kepler Cheuvreux": "keplercheuvreux.com", "Agentis Capital": "agentiscapital.com",
    "Ridgepeak Partners": "ridgepeak.com", "MACA": "maca.la", "Pemberton": "pembertonam.com", "HSBC": "hsbc.com", "Crédit Agricole CIB": "ca-cib.com",
}
