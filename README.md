# Finance Jobs Radar

Site gratuit qui recense chaque jour les **postes juniors** (stage, VIE, alternance, graduate, analyst 1re année)
en **M&A, investment banking, leveraged finance, ECM/DCM, private equity, infrastructure et project finance**,
dans le monde entier : banques, boutiques de conseil, fonds small/mid-cap et grands fonds.

Site : https://nazero-source.github.io/Finance-jobs/

- **Offres** : filtres par type de poste, métier, région, pays, type d'employeur, employeur, date ; fiche détaillée avec contacts.
- **Carte** : carte interactive (pays colorés selon le nombre d'offres, bulles par ville) ; clic sur un pays ou une ville
  pour voir la répartition par métier, type de poste, employeurs et la liste des offres.
- **Candidature** : CV et lettre en anglais adaptés à l'offre (aperçu A4, export PDF / Word), score de correspondance
  des mots-clés, consigne prête à coller dans Claude. Tout reste dans le navigateur.
- **Suivi** : tableau de candidatures (glisser-déposer), export CSV.

## Fonctionnement

`scraper/run.py` (Python, aucune dépendance) interroge les API publiques des plateformes de recrutement
(Workday, Oracle, Greenhouse, Lever, Workable, Recruitee, SmartRecruiters, Personio, BambooHR, Ashby, Eightfold,
Goldman Sachs Higher, site carrière de Crédit Agricole CIB),
ne garde que les postes juniors et les classe par règles (`scraper/classify.py`), extrait le salaire ou l'estime
(offres comparables du site, puis grille de marché en devise locale, `scraper/salary.py`),
géolocalise (OpenStreetMap, `scraper/geo.py`) et écrit `docs/data/jobs.json`.

Le workflow `.github/workflows/update.yml` le lance chaque nuit et publie `docs/` sur GitHub Pages.

### Ajouter un employeur
Ajouter une ligne dans `scraper/employers.py`.

### Source optionnelle : Adzuna
Clé gratuite sur https://developer.adzuna.com, puis dans GitHub : Settings → Secrets and variables → Actions →
`ADZUNA_APP_ID` et `ADZUNA_APP_KEY`.

### Lancer en local
```bash
python scraper/run.py
python -m http.server -d docs 8000
```

## Données personnelles
Ce dépôt est public : il ne contient **aucun** CV, lettre ou profil (voir `.gitignore`).
Le profil s'importe dans le site depuis un fichier privé et reste dans le navigateur.
