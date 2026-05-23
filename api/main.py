from __future__ import annotations

import warnings
from pathlib import Path
from typing import Any

import joblib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

try:
    from .preprocessing import (
        ARTIFACT_DIR,
        category_options,
        load_preprocessing_artifacts,
        preprocess_lead,
    )
except ImportError:
    from preprocessing import (
        ARTIFACT_DIR,
        category_options,
        load_preprocessing_artifacts,
        preprocess_lead,
    )


APP_DIR = Path(__file__).resolve().parent
STATIC_DIR = APP_DIR / "static"
LGB_THRESHOLD = 0.59
LOGISTIC_THRESHOLD = 0.50


class LeadData(BaseModel):
    leadOrigin: str
    lastActivity: str
    occupation: str
    leadProfile: str
    totalVisits: float = Field(ge=0)
    totalTimeOnSite: float = Field(ge=0)
    pageViewsPerVisit: float = Field(ge=0)


def _load_model(path: Path) -> tuple[Any | None, str | None]:
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            return joblib.load(path), None
    except Exception as exc:
        return None, f"{type(exc).__name__}: {exc}"


artifacts = load_preprocessing_artifacts()
lightgbm_model, lightgbm_error = _load_model(ARTIFACT_DIR / "lgb_best_model.pkl")
logistic_model, logistic_error = _load_model(
    ARTIFACT_DIR / "best_optuna_logistic_regression_model.pkl"
)

app = FastAPI(title="Lead Navigator Pro Demo")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


def _payload_dict(data: LeadData) -> dict[str, Any]:
    if hasattr(data, "model_dump"):
        return data.model_dump()
    return data.dict()


def _predict_probability(model: Any, frame) -> float:
    try:
        proba = model.predict_proba(frame)[:, 1][0]
    except Exception:
        proba = model.predict_proba(frame.to_numpy())[:, 1][0]
    return float(proba)


def _validate_categories(payload: dict[str, Any], options: dict[str, list[str]]) -> None:
    errors: dict[str, Any] = {}
    for field, allowed_list in options.items():
        allowed = set(allowed_list)
        allowed.add("")
        allowed.add("Unknown")
        value = str(payload.get(field, ""))
        if value in allowed:
            continue
        errors[field] = {
            "value": value,
            "allowed": sorted(allowed),
        }

    if errors:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Invalid category value.",
                "errors": errors,
            },
        )


def _model_result(
    model: Any | None,
    model_error: str | None,
    frame,
    *,
    name: str,
    role: str,
    threshold: float,
) -> dict[str, Any]:
    if model is None:
        return {
            "name": name,
            "role": role,
            "available": False,
            "error": model_error,
        }

    probability = _predict_probability(model, frame)
    return {
        "name": name,
        "role": role,
        "available": True,
        "probability": probability,
        "score": round(probability * 100, 2),
        "threshold": threshold,
        "converted": bool(probability >= threshold),
    }


@app.get("/")
def index():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "models": {
            "bestClassifier": lightgbm_error is None,
            "highProbability": logistic_error is None,
        },
        "errors": {
            "bestClassifier": lightgbm_error,
            "highProbability": logistic_error,
        },
    }


@app.get("/metadata")
def metadata():
    return {
        "categoryOptions": category_options(artifacts),
        "featureOrder": artifacts.model_features,
        "scalerColumns": artifacts.scaler_columns,
        "thresholds": {
            "bestClassifier": LGB_THRESHOLD,
            "highProbability": LOGISTIC_THRESHOLD,
        },
    }


@app.post("/predict")
def predict(data: LeadData):
    payload = _payload_dict(data)
    _validate_categories(payload, category_options(artifacts))
    frame, processing = preprocess_lead(payload, artifacts)

    best_classifier = _model_result(
        lightgbm_model,
        lightgbm_error,
        frame,
        name="LightGBM",
        role="best_classifier",
        threshold=LGB_THRESHOLD,
    )
    high_probability = _model_result(
        logistic_model,
        logistic_error,
        frame,
        name="Optuna Logistic Regression",
        role="high_probability",
        threshold=LOGISTIC_THRESHOLD,
    )

    primary = best_classifier if best_classifier.get("available") else high_probability
    if not primary.get("available"):
        raise HTTPException(
            status_code=503,
            detail={
                "message": "No model could be loaded.",
                "bestClassifierError": lightgbm_error,
                "highProbabilityError": logistic_error,
            },
        )

    return {
        "converted": int(primary["converted"]),
        "score": primary["score"],
        "primaryModel": primary["role"],
        "models": {
            "bestClassifier": best_classifier,
            "highProbability": high_probability,
        },
        "processing": processing,
        "reasons": _build_reasons(processing, high_probability, best_classifier),
    }


def _build_reasons(
    processing: dict[str, Any],
    high_probability: dict[str, Any],
    best_classifier: dict[str, Any],
) -> list[str]:
    reasons: list[str] = []
    categories = processing["categories"]
    numeric = processing["numericRaw"]

    occupation = categories["What is your current occupation"]["mapped"]
    last_activity = categories["Last Activity"]["mapped"]
    lead_profile = categories["Lead Profile"]["mapped"]

    if occupation == "Working Professional":
        reasons.append("Working professional segment")
    if last_activity == "SMS Sent":
        reasons.append("Recent SMS engagement")
    if lead_profile == "Potential Lead":
        reasons.append("Potential Lead profile")
    if numeric["Total Time Spent on Website"] > 349:
        reasons.append("Above-median website time")
    if numeric["TotalVisits"] > 3:
        reasons.append("Above-median visit count")

    available_scores = [
        result["score"]
        for result in (high_probability, best_classifier)
        if result.get("available")
    ]
    if available_scores and max(available_scores) >= 70:
        reasons.append("High model confidence")

    return reasons[:4] or ["Baseline model signal"]
