# PRISM Backend — Setup Guide

## Prerequisites
- Python 3.9+
- *.pkl files from PRISM_Training.ipynb (place in this folder)

## Setup

```bash
# Install dependencies
pip install fastapi uvicorn pydantic joblib numpy scikit-learn xgboost shap

# Place these files in backend/ folder (from Colab after training):
# model.pkl, scaler.pkl, explainer.pkl,
# label_encoder.pkl, action_encoder.pkl,
# role_encoder.pkl, anomaly_detector.pkl

# Start the server
uvicorn main:app --reload --port 8000
```

## Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | / | API info |
| GET | /health | Health check |
| POST | /predict | Get risk decision |
| GET | /history | Past decisions |
| POST | /feedback | Human override |
| GET | /stats | Dashboard stats |

## Interactive Docs
Visit http://localhost:8000/docs after starting the server.

## Test
```bash
python test_api.py
```
