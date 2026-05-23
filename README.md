# Lead Navigator Pro Demo

This demo exposes one FastAPI endpoint and a static UI for lead scoring.

## Artifacts

The demo intentionally loads only these two model files:

- `api/models/lgb_best_model.pkl`: best classifier output.
- `api/models/best_optuna_logistic_regression_model.pkl`: high-probability output.

The preprocessing artifacts are still required:

- `api/models/lead_scaler.pkl`
- `api/models/columns.pkl`
- `api/models/label_encoders.pkl`
- `api/models/model_features.pkl`

## Run

```bash
cd lead-navigator-pro
python3 -m pip install -r requirements.txt
cd api
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000`.

## API

`POST /predict`

```json
{
  "leadOrigin": "API",
  "lastActivity": "Email Opened",
  "occupation": "Unemployed",
  "leadProfile": "Not Specified",
  "totalVisits": 5,
  "totalTimeOnSite": 674,
  "pageViewsPerVisit": 2.5
}
```
