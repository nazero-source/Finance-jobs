"""Liste des employeurs suivis et de leur plateforme de recrutement.

type : bank (grande banque), boutique (banque d'affaires / conseil),
       pe (private equity), infra (infrastructure), am (gestion d'actifs)
mode : "search" = on interroge la plateforme avec des mots-clés (gros employeurs)
       "all"    = on récupère toutes les offres puis on filtre (petits employeurs)

Pour ajouter un employeur, il suffit d'ajouter une ligne ici.
"""

WORKDAY = [
    # name, type, host, tenant, site, mode
    ("Rothschild & Co", "bank", "rothschildandco.wd3.myworkdayjobs.com", "rothschildandco", "RothschildAndCo_Lateral", "all"),
    ("Rand Merchant Bank", "bank", "firstrand.wd3.myworkdayjobs.com", "firstrand", "FRB", "search"),
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
    ("3i Group", "infra", "3i.wd103.myworkdayjobs.com", "3i", "Intern_Career", "all"),
    ("Copenhagen Infrastructure Partners", "infra", "cip.wd103.myworkdayjobs.com", "cip", "CIP_Careers", "all"),
    ("Knight Frank Capital Advisory", "bank", "knightfrank.wd103.myworkdayjobs.com", "knightfrank", "KF", "all"),
    ("M&G Infracapital", "bank", "mgpru.wd3.myworkdayjobs.com", "mgpru", "mandgprudential", "all"),
]

ORACLE = [
    # name, type, host, siteNumber, mode
    ("J.P. Morgan", "bank", "jpmc.fa.oraclecloud.com", "CX_1001", "search"),
    ("Lazard", "boutique", "icbpjb.fa.ocs.oraclecloud.com", "CX_1001", "all"),
    ("Lazard", "boutique", "icbpjb.fa.ocs.oraclecloud.com", "CX_1", "all"),
    ("Lazard", "boutique", "icbpjb.fa.ocs.oraclecloud.com", "CX_2", "all"),
    ("IFM Investors", "infra", "enlc.fa.ap1.oraclecloud.com", "CX", "all"),
    ("Jefferies", "bank", "hdid.fa.us2.oraclecloud.com", "CX_1", "all"),
    ("Edmond de Rothschild", "bank", "evht.fa.ocs.oraclecloud.eu", "CX_7001", "all"),
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
    ("Octopus Energy Generation", "bank", "octoenergy"),
    ("Aeris Partners", "boutique", "aerispartners.com"),
    ("D.A. Davidson", "boutique", "dadavidson"),
    ("HCVT", "boutique", "hcvt"),
    ("Harrison Street", "infra", "harrisonst"),
    ("CIM Group", "infra", "cimgroup"),
]

WORKABLE = [
    ("DC Advisory", "boutique", "dcadvisory"),
    ("Clipperton", "boutique", "clipperton"),
    ("Q-Energy", "infra", "q-energy"),
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
    ("Sienna Investment Managers", "infra", "SiennaInvestmentManagers"),
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
    ("Antin Infrastructure Partners", "infra", "antininfrastructurepartners-1655458195.teamtailor.com"),
    ("CFG Bank", "bank", "carrieres.cfgbank.com"),
    ("BDO France (Advance Capital)", "boutique", "recrutement.bdo.fr"),
]

PINPOINT = [
    ("Marathon Capital", "boutique", "marathoncapital.pinpointhq.com"),
    ("Globeleq", "infra", "globeleq.pinpointhq.com"),
]

JAZZHR = [
    ("CrossBoundary", "boutique", "crossboundary"),
]

SUCCESSFACTORS = [
    ("AIIB", "dfi", "career5.successfactors.eu", "AIIB"),
    ("Africa Finance Corporation", "dfi", "career2.successfactors.eu", "africafina"),
    ("EBRD", "dfi", "career5.successfactors.eu", "C0009154570P"),
]

# Institutions financières de développement (DFI)
CORNERSTONE = [
    ("World Bank Group / IFC", "dfi", "worldbankgroup"),
]

RMK_RSS = [
    ("IDB / IDB Invest", "dfi", "jobs.iadb.org", "en_US"),
    ("FMO", "dfi", "fmo.jobs.hr.cloud.sap", "en_GB"),
]

AVATURE = [
    ("Macquarie", "bank", "https://recruitment.macquarie.com/en_US/careers/SearchJobs/feed/?7959=%5B421070%2C421069%5D&7959_format=14495&listFilterMode=1"),
]

HTML_PAGES = [
    # name, type, page, motif des liens d'offres, lieu par défaut
    ("Africa50", "infra", "https://www.africa50.com/working-with-us/", r"/working-with-us/career/", "Casablanca, Morocco"),
]

BAMBOOHR = [
    ("Panmure Liberum", "bank", "panmure"),
    ("Summa Equity", "pe", "summaequity"),
    ("Stone Point Capital", "pe", "stonepoint"),
    ("Solomon Partners", "boutique", "solomonpartners"),
    ("Climate Fund Managers", "infra", "climatefundmanagers"),
    ("InfraRed Capital Partners", "infra", "ircp"),
    ("Bluefield", "infra", "bluefield"),
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
    # recherches par ville, pour ne pas sur-représenter les États-Unis dans les grandes banques
    "analyst London", "intern London", "analyst Paris", "stage Paris", "analyst Frankfurt", "intern Frankfurt",
    "analyst Madrid", "analyst Milan", "analyst Amsterdam", "analyst Zurich", "analyst Dubai", "intern Dubai",
    "analyst Riyadh", "analyst Singapore", "intern Singapore", "analyst Hong Kong", "intern Hong Kong", "analyst Tokyo",
    "analyst Sydney", "analyst Mumbai", "analyst São Paulo", "analyst Mexico",
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
    "Ridgepeak Partners": "ridgepeak.com", "MACA": "maca.la",
    "3i Group": "3i.com", "Copenhagen Infrastructure Partners": "cip.com", "Knight Frank Capital Advisory": "knightfrank.co.uk",
    "M&G Infracapital": "infracapital.co.uk", "Edmond de Rothschild": "edmond-de-rothschild.com", "Octopus Energy Generation": "octopusenergygeneration.com",
    "Sienna Investment Managers": "sienna-im.com", "Climate Fund Managers": "climatefundmanagers.com", "InfraRed Capital Partners": "ircp.com",
    "Bluefield": "thebluefieldgroup.com", "Antin Infrastructure Partners": "antin-ip.com", "Marathon Capital": "marathoncapital.com",
    "CrossBoundary": "crossboundary.com", "AIIB": "aiib.org", "Africa Finance Corporation": "africafc.org", "Macquarie": "macquarie.com",
    "Africa50": "africa50.com", "EBRD": "ebrd.com", "World Bank Group / IFC": "ifc.org", "IDB / IDB Invest": "idbinvest.org", "FMO": "fmo.nl", "Pemberton": "pembertonam.com", "HSBC": "hsbc.com", "Crédit Agricole CIB": "ca-cib.com",
    'Rothschild & Co': 'rothschildandco.com', 'Clipperton': 'clipperton.com', 'Natixis Partners': 'natixispartners.com', 'ODDO BHF Corporate Finance': 'oddo-bhf.com', 'Degroof Petercam CF': 'degroofpetercam.com', 'Bryan Garnier': 'bryangarnier.com', 'Linkers': 'linkers.fr', 'Aelios Finance': 'aelios-finance.com', 'Financière de Courcelles': 'financiere-de-courcelles.com', 'In Extenso Finance': 'inextenso-finance.fr', 'Transaction R': 'transaction-r.com', 'Largillière Finance': 'largilliere-finance.com', 'Acxior Corporate Finance': 'acxior.com', 'Arjil': 'arjil.com', 'Midcap Partners': 'midcappartners.com', 'Advance Capital': 'advancecapital.fr', 'Accuracy': 'accuracy.com', 'Sorgem Evaluation': 'sorgem.com', 'E-CUBE Strategy Consultants': 'e-cube.com', 'Clean Horizon': 'cleanhorizon.com', 'Robey Warshaw': 'robeywarshaw.com', 'Zaoui & Co': 'zaouico.com', 'Fenchurch Advisory': 'fenchurchadvisory.com', 'Arma Partners': 'armapartners.com', 'GP Bullhound': 'gpbullhound.com', 'Hampleton Partners': 'hampletonpartners.com', 'Livingstone Partners': 'livingstonepartners.com', 'Hannam & Partners': 'hannam.partners', 'Cavendish': 'cavendish.com', 'Peel Hunt': 'peelhunt.com', 'Panmure Liberum': 'panmureliberum.com', 'Investec': 'investec.com', 'Centerview Partners': 'centerviewpartners.com', 'Evercore': 'evercore.com', 'Baringa': 'baringa.com', 'Aurora Energy Research': 'auroraer.com', 'Downing': 'downing.co.uk', 'Pantheon Infrastructure': 'pantheon.com', 'Federated Hermes Infrastructure': 'hermes-investment.com', 'Legal & General Capital': 'lgcapital.com', 'Cubico Sustainable Investments': 'cubicoinvest.com', 'Rasmala': 'rasmala.com', 'EFG Holding': 'efghldg.com', 'SHUAA Capital': 'shuaa.com', 'Arqaam Capital': 'arqaamcapital.com', 'Waha Capital': 'wahacapital.ae', 'Jadwa Investment': 'jadwa.com', 'ACWA Power': 'acwapower.com', 'TAQA': 'taqa.com', 'Alpha Dhabi': 'alphadhabi.com', 'Rand Merchant Bank': 'rmb.co.za', 'Standard Bank CIB': 'standardbank.com', 'Development Partners International': 'dpi-llp.com', 'Adenia Partners': 'adenia.com', 'Amethis': 'amethis.com', 'AfricInvest': 'africinvest.com', 'Ninety One': 'ninetyone.com', 'Globeleq': 'globeleq.com', 'Vantage Capital': 'vantagecapital.co.za', 'CDG Invest': 'cdginvest.ma', 'BMCE Capital': 'bmcecapital.com', 'CFG Bank': 'cfgbank.com', 'Ithmar Capital': 'ithmar.ma', 'Masen': 'masen.ma', 'Mediterrania Capital Partners': 'mcp.ma', 'Attijari Finances Corp': 'attijarifinances.com', 'Banque des Territoires': 'banquedesterritoires.fr', 'Amundi Transition Énergétique': 'amundi.com', 'BNP Paribas AM (Private Debt & Real Assets)': 'bnpparibas-am.com', 'AXA IM Alts': 'axa-im.com', 'La Banque Postale AM': 'labanquepostale-am.fr', 'Idinvest / Eurazeo Mid-cap': 'eurazeo.com', 'F2i': 'f2isgr.it', 'Ambienta': 'ambientasgr.com', 'Aream': 'aream.de', 'Encavis Asset Management': 'encavis-am.com', 'Plenium Partners': 'plenium.es', 'Q-Energy': 'qenergy.eu', 'Mirova Energy Transition': 'mirova.com', 'Arjun Infrastructure Partners': 'arjuninfra.com',
}

# Boutiques et fonds infra / énergie suivis de près (France, Royaume-Uni, Dubaï, Afrique).
# Ceux dont les offres ne sont pas lisibles automatiquement (LinkedIn seulement, site protégé)
# apparaissent quand même sur le site, avec leur page carrière et leur e-mail de recrutement.
# nom, type, zone, page carrière, e-mail, note
TARGETS = [
    ("Finergreen", "Boutique M&A énergie", "France · UK · Dubaï · Afrique", "https://finergreen.com/join-the-team/", "careers@finergreen.com", "Offres publiées uniquement sur LinkedIn"),
    ("Green Giraffe", "Boutique M&A / PF énergie", "France · UK · Europe", "https://green-giraffe.com/careers", "", ""),
    ("Augusta & Co", "Boutique M&A énergie", "UK", "https://augustaco.com/careers/", "careers@augustaco.com", ""),
    ("Apricum", "Conseil transactions énergie", "Allemagne · Dubaï", "https://apricum-group.com/careers/", "", ""),
    ("Gneiss Energy", "Boutique M&A énergie", "UK", "https://gneiss.energy/careers/", "", ""),
    ("Blunomy", "Conseil financier transition énergétique", "France · UK", "https://www.blunomy.com/careers", "", "Offres sur Welcome to the Jungle"),
    ("Capitalmind", "Boutique M&A (équipe énergie)", "France · Europe", "https://www.capitalmind.com/careers", "", ""),
    ("Cambon Partners", "Boutique M&A (énergie, infra)", "France", "https://www.cambonpartners.com/fr/carrieres", "recrutement@cambonpartners.com", "Stages publiés sur Welcome to the Jungle"),
    ("Messier & Associés", "Boutique M&A", "France", "https://www.messierassocies.com/careers", "", ""),
    ("Everoze", "Conseil technique & financier énergie", "UK", "https://everoze.com/jobs/", "recruitment@everoze.com", ""),
    ("Fieldstone", "Conseil financier infra / énergie", "UK · Afrique", "https://www.fieldstone-group.com/careers", "", ""),
    ("CohnReznick Capital", "Banque d'affaires énergie", "États-Unis", "https://crc-ib.com/careers/students-graduates/", "", ""),
    ("Marathon Capital", "Banque d'affaires énergie", "États-Unis", "https://marathoncapital.pinpointhq.com/", "", ""),
    ("CrossBoundary", "Conseil & investissement marchés émergents", "Afrique · Moyen-Orient", "https://crossboundary.applytojob.com/apply", "", ""),
    ("Knight Frank Capital Advisory", "Conseil infra (lead advisory)", "UK", "https://www.knightfrank.co.uk/careers", "", ""),
    ("Africa50", "Fonds infra", "Afrique (Casablanca)", "https://www.africa50.com/working-with-us/", "", ""),
    ("AIIM (African Infrastructure Investment Managers)", "Fonds infra", "Afrique", "https://www.aiimafrica.com/", "", ""),
    ("Actis", "Fonds infra / énergie", "UK · Afrique · Moyen-Orient", "https://www.act.is/people/careers/", "", ""),
    ("Africa Finance Corporation", "DFI · Financement infra", "Afrique (Lagos)", "https://www.africafc.org/careers", "", ""),
    ("Climate Fund Managers", "Fonds infra climat", "Afrique du Sud · Pays-Bas", "https://climatefundmanagers.com/careers-and-internships/", "", ""),
    ("PIDG / InfraCo Africa", "Développeur & fonds infra", "UK · Afrique", "https://pidg.org/about-us/careers/", "", ""),
    ("Harith", "Fonds infra", "Afrique du Sud", "https://harith.africa/careers/", "", ""),
    ("Inspired Evolution", "Fonds énergie", "Afrique du Sud", "https://inspiredevolution.co.za/careers/", "", ""),
    ("Meridiam", "Fonds infra", "France · monde", "https://meridiam.recruitee.com/", "", ""),
    ("Mirova", "Fonds transition énergétique", "France", "https://www.mirova.com/en/join-us", "", ""),
    ("InfraVia Capital Partners", "Fonds infra", "France", "https://www.infraviacapital.com/", "", ""),
    ("Antin Infrastructure Partners", "Fonds infra", "France · UK", "https://www.antin-ip.com/careers", "", ""),
    ("Vauban Infrastructure Partners", "Fonds infra", "France", "https://vauban-ip.com/en/careers", "", ""),
    ("RGreen Invest", "Fonds énergie renouvelable", "France", "https://www.rgreeninvest.com/", "", ""),
    ("Eiffel Investment Group", "Fonds transition énergétique", "France", "https://www.eiffel-ig.com/", "", ""),
    ("Omnes Capital", "Fonds infra / énergie", "France", "https://www.omnescapital.com/culture-and-careers", "", "Offres publiées sur LinkedIn"),
    ("Infranity", "Fonds infra", "France", "https://www.infranity.com/careers", "", ""),
    ("Sienna Investment Managers", "Fonds infra / dette", "France", "https://www.sienna-im.com/join-us/", "", ""),
    ("Swen Capital Partners", "Fonds infra / énergie", "France", "https://www.swen-cp.fr/carrieres/", "", ""),
    ("Eurazeo Infrastructure", "Fonds infra", "France", "https://www.eurazeo.com/en/talents", "", ""),
    ("Edmond de Rothschild (infra)", "Fonds infra / dette infra", "France · Suisse", "https://www.edmond-de-rothschild.com/en/careers", "", "Stages aussi sur JobTeaser"),
    ("Ardian Infrastructure", "Fonds infra", "France · UK · monde", "https://www.ardian.com/talent", "", ""),
    ("Marguerite", "Fonds infra", "Luxembourg · France", "https://www.marguerite.com/", "", ""),
    ("Asterion Industrial Partners", "Fonds infra", "Espagne · UK", "https://asterionindustrial.com/", "", ""),
    ("DIF Capital Partners (CVC DIF)", "Fonds infra", "Pays-Bas · UK · France", "https://www.cvcdif.com/careers", "", ""),
    ("Cube Infrastructure", "Fonds infra", "France · Luxembourg", "https://www.cube-ip.com/", "", ""),
    ("InfraRed Capital Partners", "Fonds infra", "UK", "https://www.ircp.com/talent/early-careers/", "", ""),
    ("Equitix", "Fonds infra", "UK", "https://equitix.com/about/careers/", "recruitment@equitix.com", ""),
    ("Amber Infrastructure", "Fonds infra", "UK", "https://www.amberinfrastructure.com/careers/", "", ""),
    ("Ancala Partners", "Fonds infra", "UK", "https://ancala.com/about/careers/", "careers@ancala.com", ""),
    ("Foresight Group", "Fonds infra / énergie", "UK", "https://foresight.group/other-information/careers/", "careers@foresightgroup.eu", ""),
    ("Gresham House", "Fonds infra / énergie", "UK", "https://greshamhouse.com/careers/", "", ""),
    ("NextEnergy Capital", "Fonds énergie solaire", "UK", "https://www.nextenergycapital.com/careers/", "", ""),
    ("Octopus Energy Generation", "Fonds énergie renouvelable", "UK", "https://www.octopusenergygeneration.com/careers/", "", ""),
    ("Quinbrook", "Fonds infra énergie", "UK · États-Unis · Australie", "https://quinbrook.careers.hibob.com/", "", ""),
    ("John Laing", "Fonds infra", "UK", "https://www.johnlaing.com/careers/", "", ""),
    ("3i Infrastructure", "Fonds infra", "UK", "https://www.3i.com/about-us/careers/", "", ""),
    ("Gravis Capital", "Fonds infra / énergie", "UK", "https://www.graviscapital.com/careers", "careers@graviscapital.com", ""),
    ("Bluefield", "Fonds énergie solaire", "UK", "https://thebluefieldgroup.com/careers/", "", ""),
    ("Triple Point", "Fonds infra / énergie", "UK", "https://www.triplepoint.co.uk/careers/", "", ""),
    ("Schroders Greencoat", "Fonds énergie renouvelable", "UK", "https://www.greencoat-capital.com/", "", ""),
    ("Infracapital (M&G)", "Fonds infra", "UK", "https://www.infracapital.co.uk/careers", "", ""),
    ("Dalmore Capital", "Fonds infra", "UK", "https://www.dalmorecapital.com/", "", ""),
    ("Copenhagen Infrastructure Partners", "Fonds infra énergie", "Danemark · UK", "https://www.cip.com/careers/vacancies/", "", ""),
    ("Igneo Infrastructure Partners", "Fonds infra", "UK · monde", "https://www.igneoip.com/", "", ""),
    ("Masdar", "Investisseur énergie renouvelable", "Abu Dhabi", "https://masdar.ae/en/careers", "", ""),
    ("AMEA Power", "Développeur & investisseur énergie", "Dubaï", "https://www.ameapower.com/careers/", "talent@ameapower.com", ""),
    ("Alcazar Energy Partners", "Fonds énergie renouvelable", "Dubaï", "https://www.alcazarenergy.com/", "", ""),
    ("Investcorp (infrastructure)", "Fonds infra", "Bahreïn · Dubaï · Londres", "https://www.investcorp.com/careers/", "", ""),
    ("Lunate", "Gestionnaire d'actifs (infra)", "Abu Dhabi", "https://www.lunate.com/en/careers/", "", ""),
    ("Mubadala", "Fonds souverain (infra, énergie)", "Abu Dhabi", "https://www.mubadala.com/en/careers", "", ""),
    ("ADQ", "Fonds souverain (infra, énergie)", "Abu Dhabi", "https://www.adq.ae/careers/", "", ""),
    ("World Bank Group / IFC", "DFI · Groupe Banque mondiale", "Washington · Paris · monde", "https://www.ifc.org/en/about/careers", "", "Programmes YPP, JPA et stages"),
    ("EBRD", "DFI · Banque multilatérale", "Londres", "https://jobs.ebrd.com/", "", "Graduate programme et stages"),
    ("EIB / EIF", "DFI · Banque de l'UE", "Luxembourg", "https://www.eib.org/en/about/careers/index", "", "Site non lisible par le robot : stages et Graduate Programme à surveiller"),
    ("IDB / IDB Invest", "DFI · Banque multilatérale", "Washington · Amérique latine", "https://idbinvest.org/en/careers", "", ""),
    ("AfDB", "DFI · Banque multilatérale", "Abidjan", "https://www.afdb.org/en/about-us/careers", "", "Site protégé : Young Professionals Program à surveiller"),
    ("Proparco / AFD", "DFI · France", "Paris · Afrique", "https://www.afd.fr/fr/lafd-recrute", "", "Stages et VIE fréquents ; site non lisible par le robot"),
    ("British International Investment", "DFI · UK", "Londres · Afrique · Asie", "https://www.bii.co.uk/en/careers/", "", "Site protégé : à surveiller"),
    ("FMO", "DFI · Pays-Bas", "La Haye", "https://fmo.jobs.hr.cloud.sap/", "", ""),
    ("DEG / KfW", "DFI · Allemagne", "Cologne · Francfort", "https://www.deginvest.de/", "", ""),
    ("Norfund", "DFI · Norvège", "Oslo · Afrique", "https://www.norfund.no/", "", ""),
    ("Bpifrance", "Banque publique (fonds infra, international)", "France", "https://www.bpifrance.fr/nous-rejoindre", "", "Stages et VIE"),
    ("AIIB", "DFI · Banque multilatérale infra", "Pékin", "https://www.aiib.org/en/work-with-us/join-the-team/young-talent-programs/index.html", "talentacquisition@aiib.org", "Programmes jeunes talents"),
    ("Macquarie Asset Management (infra)", "Fonds infra", "UK · France · monde", "https://recruitment.macquarie.com/en_US/careers/SearchJobs/?7959=%5B421070%2C421069%5D&7959_format=14495&listFilterMode=1", "", ""),
    # --- élargissement V6 : boutiques FR/UK, Golfe, Afrique/Maroc, fonds infra européens ---
    ('Rothschild & Co', "Banque d'affaires", 'France · UK · Monde', 'https://www.rothschildandco.com/en-us/careers/', '', 'Graduate programmes via rothschildandco.tal.net'),
    ('Clipperton', 'Boutique M&A', 'France', 'https://www.clipperton.com/careers', '', 'Offres suivies automatiquement'),
    ('Natixis Partners', 'Boutique M&A', 'France', 'https://www.natixispartners.com/carrieres/', 'careers@np.partners', ''),
    ('ODDO BHF Corporate Finance', 'Boutique M&A', 'France', 'https://www.oddo-bhf.com/careers/', '', ''),
    ('Degroof Petercam CF', 'Boutique M&A', 'France · Belgique', 'https://www.degroofpetercam.com/en-be/jobs-finance', '', ''),
    ('Bryan Garnier', 'Boutique M&A', 'France · UK', 'https://www.bryangarnier.com', '', 'Site protégé : à consulter à la main'),
    ('Linkers', 'Boutique M&A', 'France', 'https://linkers.fr/en/transaction/luisina-is-joining-forces-with-german-shutte-group/', '', ''),
    ('Aelios Finance', 'Boutique M&A', 'France', 'https://www.aelios-finance.com', '', 'Site protégé : à consulter à la main'),
    ('Financière de Courcelles', 'Boutique M&A', 'France', 'https://www.financiere-de-courcelles.com', '', 'Site protégé : à consulter à la main'),
    ('In Extenso Finance', 'Boutique M&A', 'France', 'https://finance.inextenso.fr/nous-rejoindre/', '', ''),
    ('Transaction R', 'Boutique M&A', 'France', 'https://www.transaction-r.com', '', 'Site protégé : à consulter à la main'),
    ('Largillière Finance', 'Boutique M&A', 'France', 'https://largilliere-finance.com/offre-emploi/', '', ''),
    ('Acxior Corporate Finance', 'Boutique M&A', 'France', 'https://www.acxior.com', '', 'Site protégé : à consulter à la main'),
    ('Arjil', 'Boutique M&A', 'France', 'https://www.arjil.com', '', 'Site protégé : à consulter à la main'),
    ('Midcap Partners', 'Boutique M&A', 'France', 'https://www.midcappartners.com', '', 'Site protégé : à consulter à la main'),
    ('BDO France (Advance Capital)', 'Boutique M&A (énergie)', 'France', 'https://recrutement.bdo.fr/', '', 'Intégré à BDO France : offres suivies via recrutement.bdo.fr'),
    ('Accuracy', 'Conseil transactions', 'France', 'https://www.accuracy.com/careers/joining-accuracy/', '', ''),
    ('Sorgem Evaluation', 'Conseil transactions', 'France', 'https://sorgem.com/en/careers/', '', ''),
    ('E-CUBE Strategy Consultants', 'Conseil énergie', 'France', 'https://e-cube.com/en/job-offers/', '', ''),
    ('Clean Horizon', 'Conseil énergie', 'France', 'https://www.cleanhorizon.com/careers/', '', ''),
    ('Robey Warshaw', 'Boutique M&A', 'UK', 'https://www.robeywarshaw.com', '', 'Site protégé : à consulter à la main'),
    ('Zaoui & Co', 'Boutique M&A', 'UK · France', 'https://www.zaouico.com/en/careers', '', ''),
    ('Fenchurch Advisory', 'Boutique M&A', 'UK', 'https://fenchurchadvisory.com/careers/', '', ''),
    ('Arma Partners', 'Boutique M&A', 'UK', 'https://www.armapartners.com/careers/', '', ''),
    ('GP Bullhound', 'Boutique M&A', 'UK', 'https://www.gpbullhound.com/careers/', '', ''),
    ('Hampleton Partners', 'Boutique M&A', 'UK', 'https://www.hampletonpartners.com/careers/', 'careers@hampletonpartners.com', ''),
    ('Livingstone Partners', 'Boutique M&A', 'UK', 'https://livingstonepartners.com/en/about-us/work-at-livingstone/', '', ''),
    ('Hannam & Partners', 'Boutique M&A (énergie, ressources)', 'UK', 'https://hannam.partners/careers/', '', ''),
    ('Cavendish', "Banque d'affaires", 'UK', 'https://www.cavendish.com', '', 'Site protégé : à consulter à la main'),
    ('Peel Hunt', "Banque d'affaires", 'UK', 'https://www.peelhunt.com', '', 'Site protégé : à consulter à la main'),
    ('Panmure Liberum', "Banque d'affaires", 'UK', 'https://www.panmureliberum.com/careers/', '', 'Offres suivies automatiquement'),
    ('Investec', "Banque d'affaires", 'UK · Afrique', 'https://www.investec.com', '', 'Site protégé : à consulter à la main'),
    ('Centerview Partners', 'Boutique M&A', 'UK', 'https://www.centerviewpartners.com/careers', '', ''),
    ('Evercore', 'Boutique M&A', 'UK · US', 'https://www.evercore.com/careers/', '', 'Candidatures via evercore.tal.net (non lisible automatiquement)'),
    ('Baringa', 'Conseil énergie', 'UK', 'https://www.baringa.com/en/careers/', '', ''),
    ('Aurora Energy Research', 'Conseil énergie', 'UK', 'https://auroraer.com/careers/life-at-aurora', 'myrto.polychronopoulou@auroraer.com', ''),
    ('Downing', 'Fonds énergie', 'UK', 'https://www.downing.co.uk/careers', '', ''),
    ('Pantheon Infrastructure', 'Fonds infra', 'UK', 'https://www.pantheon.com', '', 'Site protégé : à consulter à la main'),
    ('Federated Hermes Infrastructure', 'Fonds infra', 'UK', 'https://www.federatedhermes.com:443/careers', 'HRAssist@federatedhermes.com', ''),
    ('Legal & General Capital', 'Fonds infra', 'UK', 'https://www.lgcapital.com/careers', '', ''),
    ('Cubico Sustainable Investments', 'Fonds infra', 'UK · Europe', 'https://www.cubicoinvest.com/careers/', '', 'Offres sur cubicojobs.careers.hibob.com'),
    ('Rasmala', "Banque d'affaires", 'Dubaï', 'https://rasmala.com/', '', ''),
    ('EFG Holding', "Banque d'affaires", 'Dubaï · Égypte', 'https://careers.efghldg.com/', '', ''),
    ('SHUAA Capital', "Banque d'affaires", 'Dubaï', 'https://www.shuaa.com/careers', 'hr@shuaa.com', 'Offres publiées surtout sur LinkedIn'),
    ('Arqaam Capital', "Banque d'affaires", 'Dubaï', 'https://www.arqaamcapital.com/2026/10/13/arqaam-capital-joins-the-confeas-in-muscat-as-a-strategic-partner/', 'hr@arqaamcapital.com', ''),
    ('Waha Capital', 'Fonds infra', 'Abu Dhabi', 'https://www.wahacapital.com/mediacenter/detail/waha-capital-joins-ftse-adx-dividend-stars-index-reinforcing-appeal-to-income-focused-investors', '', ''),
    ('Jadwa Investment', "Banque d'affaires", 'Riyad', 'https://www.jadwa.com/en/careers', 'careers@jadwa.com', ''),
    ('ACWA Power', 'Investisseur énergie', 'Riyad', 'https://careers.acwapower.com', '', ''),
    ('TAQA', 'Investisseur énergie', 'Abu Dhabi', 'https://taqa.com/careers', '', ''),
    ('Alpha Dhabi', 'Fonds infra', 'Abu Dhabi', 'https://alphadhabi.com/careers/', 'talent@alphadhabi.com', ''),
    ('Rand Merchant Bank', "Banque d'affaires", 'Afrique du Sud', 'https://www.rmb.co.za/careers', '', 'Offres suivies automatiquement'),
    ('Standard Bank CIB', "Banque d'affaires", 'Afrique', 'https://www.standardbank.com/sbg/standard-bank-group/careers', '', ''),
    ('Development Partners International', 'Fonds PE', 'UK · Afrique', 'https://www.dpi-llp.com', '', ''),
    ('Adenia Partners', 'Fonds PE', 'Afrique', 'https://www.adenia.com', '', ''),
    ('Amethis', 'Fonds PE', 'France · Afrique', 'https://www.amethis.com', '', ''),
    ('AfricInvest', 'Fonds PE', 'Afrique', 'https://www.africinvest.com/contacts/careers/', '', ''),
    ('Ninety One', "Gestionnaire d'actifs", 'UK · Afrique', 'https://www.ninetyone.com', '', 'Site protégé : à consulter à la main'),
    ('Globeleq', 'Investisseur énergie', 'UK · Afrique', 'https://globeleq.com/careers/', 'hr@globeleq.com.', 'Offres suivies automatiquement'),
    ('Vantage Capital', 'Fonds infra', 'Afrique', 'https://www.vantagecapital.co.za', '', ''),
    ('CDG Invest', 'Fonds infra', 'Maroc', 'https://www.cdginvest.ma', '', 'Site protégé : à consulter à la main'),
    ('BMCE Capital', "Banque d'affaires", 'Maroc', 'https://www.bmcecapital.com/carrieres/culture-valeurs', '', ''),
    ('CFG Bank', "Banque d'affaires", 'Maroc', 'https://carrieres.cfgbank.com/', '', 'Offres suivies automatiquement'),
    ('Ithmar Capital', 'Fonds infra', 'Maroc', 'https://www.ithmar.ma', '', 'Site protégé : à consulter à la main'),
    ('Masen', 'Investisseur énergie', 'Maroc', 'https://masen-career.talent-soft.com/accueil.aspx?LCID=1036', 'recrutement@masen.ma', ''),
    ('Mediterrania Capital Partners', 'Fonds PE', 'Maroc · Afrique', 'https://www.mcp.ma', '', 'Site protégé : à consulter à la main'),
    ('Attijari Finances Corp', "Banque d'affaires", 'Maroc', 'https://www.attijarifinances.com', '', 'Site protégé : à consulter à la main'),
    ('Banque des Territoires', 'Fonds infra', 'France', 'https://www.banquedesterritoires.fr', '', ''),
    ('Amundi Transition Énergétique', 'Fonds infra', 'France', 'https://about.amundi.com/join-us', '', ''),
    ('BNP Paribas AM (Private Debt & Real Assets)', 'Fonds infra', 'France', 'https://www.bnpparibas-am.com/en/why-join-us/', '', ''),
    ('AXA IM Alts', 'Fonds infra', 'France', 'https://www.bnpparibas-am.com/en/why-join-us/', '', ''),
    ('La Banque Postale AM', 'Fonds infra', 'France', 'https://www.lbpam.com/fr/carrieres/un-sens-aigu-du-collectif', '', ''),
    ('Idinvest / Eurazeo Mid-cap', 'Fonds PE', 'France', 'https://www.eurazeo.com/en/talents', '', ''),
    ('F2i', 'Fonds infra', 'Italie', 'https://www.f2isgr.it', '', ''),
    ('Ambienta', 'Fonds environnement', 'Italie', 'https://www.ambientasgr.com/careers', '', ''),
    ('Aream', 'Fonds infra', 'Allemagne', 'https://www.aream.de', '', ''),
    ('Encavis Asset Management', 'Fonds énergie', 'Allemagne', 'https://www.encavis.com/en/careers', 'jobs@encavis.com', ''),
    ('Plenium Partners', 'Fonds énergie', 'Espagne', 'https://www.plenium.es/index.php/contacto', '', ''),
    ('Q-Energy', 'Fonds énergie', 'Espagne', 'https://qenergy.eu/career/', '', 'Offres suivies automatiquement'),
    ('Mirova Energy Transition', 'Fonds infra', 'Europe', 'https://www.mirova.com/en/join-us', '', ''),
    ('Arjun Infrastructure Partners', 'Fonds infra', 'UK · Europe', 'https://www.arjuninfra.com', '', ''),
]
