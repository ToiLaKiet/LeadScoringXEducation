from __future__ import annotations

import warnings
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import pandas as pd


ARTIFACT_DIR = Path(__file__).resolve().parent / "models"

MODEL_FEATURES = [
    "Lead Origin",
    "Last Activity",
    "What is your current occupation",
    "Lead Profile",
    "pvps_totalvisits",
    "Engagement_Score",
]

CATEGORY_FIELDS = {
    "leadOrigin": "Lead Origin",
    "lastActivity": "Last Activity",
    "occupation": "What is your current occupation",
    "leadProfile": "Lead Profile",
}

RAW_CATEGORY_MAPPINGS = {
    "Lead Origin": {
        "Quick Add Form": "Other",
        "Lead Import": "Other",
    },
    "Last Activity": {
        "Unsubscribed": "Other",
        "Had a Phone Conversation": "Other",
        "Approached upfront": "Other",
        "View in browser link Clicked": "Other",
        "Email Received": "Other",
        "Email Marked Spam": "Other",
        "Visited Booth in Tradeshow": "Other",
        "Resubscribed to emails": "Other",
    },
    "What is your current occupation": {
        "Unknown": "Not Specified",
        "Housewife": "Other",
        "Businessman": "Other",
    },
    "Lead Profile": {
        "Select": "Not Specified",
        "Unknown": "Not Specified",
        "Lateral Student": "Other Students",
        "Dual Specialization Student": "Other Students",
    },
}

CATEGORY_FALLBACKS = {
    "Lead Origin": "Other",
    "Last Activity": "Unknown",
    "What is your current occupation": "Not Specified",
    "Lead Profile": "Not Specified",
}

NUMERIC_BOUNDS = {
    "TotalVisits": (0.0, 9.5),
    "Page Views Per Visit": (0.0, 7.0),
    "Total Time Spent on Website": (0.0, 2462.5),
}

ENGAGEMENT_MEDIANS = {
    "TotalVisits": 3.0,
    "Page Views Per Visit": 2.33,
    "Total Time Spent on Website": 349.0,
}


@dataclass(frozen=True)
class PreprocessingArtifacts:
    scaler: Any
    scaler_columns: list[str]
    label_encoders: dict[str, Any]
    model_features: list[str]


def load_preprocessing_artifacts(artifact_dir: Path = ARTIFACT_DIR) -> PreprocessingArtifacts:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        scaler = joblib.load(artifact_dir / "lead_scaler.pkl")
        scaler_columns = joblib.load(artifact_dir / "columns.pkl")
        label_encoders = joblib.load(artifact_dir / "label_encoders.pkl")
        model_features = joblib.load(artifact_dir / "model_features.pkl")

    return PreprocessingArtifacts(
        scaler=scaler,
        scaler_columns=list(scaler_columns),
        label_encoders=label_encoders,
        model_features=list(model_features) if model_features else MODEL_FEATURES,
    )


def _clean_text(value: Any) -> str:
    if value is None:
        return "Unknown"
    text = str(value).strip()
    if not text:
        return "Unknown"
    return text


def _normalize_category(column: str, value: Any, encoder: Any) -> tuple[str, str]:
    raw_value = _clean_text(value)
    mapped_value = RAW_CATEGORY_MAPPINGS.get(column, {}).get(raw_value, raw_value)

    if mapped_value not in set(encoder.classes_):
        mapped_value = CATEGORY_FALLBACKS[column]

    return raw_value, mapped_value


def _encode_category(column: str, value: str, encoder: Any) -> int:
    return int(encoder.transform([value])[0])


def _bounded_float(value: Any, column: str) -> float:
    number = float(value)
    lower, upper = NUMERIC_BOUNDS[column]
    return min(max(number, lower), upper)


def _build_numeric_features(payload: dict[str, Any]) -> dict[str, float]:
    total_time = _bounded_float(payload["totalTimeOnSite"], "Total Time Spent on Website")
    page_views = _bounded_float(payload["pageViewsPerVisit"], "Page Views Per Visit")
    total_visits = _bounded_float(payload["totalVisits"], "TotalVisits")

    features = {
        "Total Time Spent on Website": total_time,
        "Page Views Per Visit": page_views,
        "TotalVisits": total_visits,
        "Time_Per_Page": total_time / (page_views + 1.0),
        "Time_Per_Visit": total_time / (total_visits + 1.0),
        "Engagement_Score": total_visits * 0.25 + page_views * 0.25 + total_time * 0.5,
        "Engagement_Level": float(
            (total_visits > ENGAGEMENT_MEDIANS["TotalVisits"])
            + (total_time > ENGAGEMENT_MEDIANS["Total Time Spent on Website"])
            + (page_views > ENGAGEMENT_MEDIANS["Page Views Per Visit"])
        ),
        "ttspow_pvps": total_time * page_views,
        "tttspow_totalvisits": total_time * total_visits,
        "pvps_totalvisits": page_views * total_visits,
    }
    return features


def preprocess_lead(
    payload: dict[str, Any],
    artifacts: PreprocessingArtifacts,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    encoded_features: dict[str, int] = {}
    categories: dict[str, dict[str, Any]] = {}

    for api_field, column in CATEGORY_FIELDS.items():
        encoder = artifacts.label_encoders[column]
        raw_value, mapped_value = _normalize_category(column, payload[api_field], encoder)
        encoded_value = _encode_category(column, mapped_value, encoder)
        encoded_features[column] = encoded_value
        categories[column] = {
            "raw": raw_value,
            "mapped": mapped_value,
            "encoded": encoded_value,
        }

    numeric_features = _build_numeric_features(payload)
    scale_frame = pd.DataFrame([{col: numeric_features[col] for col in artifacts.scaler_columns}])
    scaled_values = artifacts.scaler.transform(scale_frame)[0]
    scaled_features = dict(zip(artifacts.scaler_columns, map(float, scaled_values)))

    model_row = {
        **encoded_features,
        "pvps_totalvisits": scaled_features["pvps_totalvisits"],
        "Engagement_Score": scaled_features["Engagement_Score"],
    }
    model_frame = pd.DataFrame([{col: model_row[col] for col in artifacts.model_features}])

    details = {
        "categories": categories,
        "numericRaw": numeric_features,
        "numericScaled": scaled_features,
        "modelFeatures": model_row,
        "featureOrder": artifacts.model_features,
    }
    return model_frame, details


def category_options(artifacts: PreprocessingArtifacts) -> dict[str, list[str]]:
    options: dict[str, list[str]] = {}
    for api_field, column in CATEGORY_FIELDS.items():
        encoder_values = list(map(str, artifacts.label_encoders[column].classes_))
        raw_values = list(RAW_CATEGORY_MAPPINGS.get(column, {}).keys())
        options[api_field] = sorted(set(encoder_values + raw_values))
    return options
