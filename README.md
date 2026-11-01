# Finance Jobs Radar

Site gratuit qui recense chaque jour les offres de **stage, VIE, graduate et CDI** en **M&A, investment banking,
leveraged finance, ECM/DCM, private equity, infrastructure et project finance**, dans le monde entier.

- **Offres** : filtres par métier, contrat, région, pays, employeur, niveau, date ; filtre « Mon profil ».
- **Carte** : carte du monde des offres en cours.
- **Ma candidature** : analyse des mots-clés de l'offre vs ton CV, lettre de motivation générée à partir de tes modèles,
  consigne prête à coller dans Claude. Tout reste dans ton navigateur.
- **Suivi** : statut de chaque candidature, export CSV.

## Fonctionnement

`scraper/run.py` (Python, aucune dépendance) interroge les API publiques des plateformes de recrutement
(Workday, Oracle, Greenhouse, Lever, Workable, Recruitee, SmartRecruiters, Goldman Sachs Higher),
classe les offres par règles (`scraper/classify.py`), extrait ou estime le salaire (`scraper/salary.py`),
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
