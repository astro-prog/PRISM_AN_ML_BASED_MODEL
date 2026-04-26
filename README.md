# PRISM — Permission Risk Intelligence System for Agentic Models

> *"Every action an AI takes. Scored. Explained. Controlled."*

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.103-green.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.2-61DAFB.svg)](https://reactjs.org)
[![XGBoost](https://img.shields.io/badge/XGBoost-1.7.6-orange.svg)](https://xgboost.readthedocs.io)

---

## Overview

PRISM is a human-centered, explainable machine learning framework for **risk-aware permission control in agentic LLM systems**. As AI agents become increasingly autonomous — executing code, writing to databases, sending emails, and calling external APIs — the question of *"should this agent be allowed to do this right now?"* becomes critically important.

PRISM sits between an AI agent and the resources it wants to access. It evaluates every action request in real time, assigns a risk score, makes an **Allow / Escalate / Deny** decision, and explains exactly why using SHAP. When the model is uncertain, it escalates to a human reviewer rather than defaulting to either extreme.

---

## The Problem

Existing agentic LLM frameworks (LangChain, AutoGen, CrewAI) lack intelligent, context-aware permission systems. Current approaches are either all-or-nothing, rigid hardcoded rule sets, or nonexistent. PRISM addresses all three gaps with a dynamic, ML-driven, explainable, and human-supervised access control layer.

---

## Key Features

- **ML-driven risk scoring** — XGBoost classifier trained on 5,000 realistic permission request scenarios
- **SHAP explainability** — every decision includes a per-feature explanation showing exactly what drove the risk score
- **Human-in-the-loop** — ambiguous cases (risk 0.35–0.65) escalate to human review rather than being auto-blocked
- **Anomaly detection** — IsolationForest catches burst patterns and unusual behavior beyond the main classifier
- **Full audit trail** — every decision, override, and escalation logged to SQLite with timestamps
- **Live React dashboard** — 6-page interactive frontend with real-time charts, decision feed, and override controls
- **REST API** — FastAPI backend with 5 endpoints and auto-generated Swagger documentation

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AI AGENT LAYER                            │
│      Attempts: file_read, code_exec, db_write, api_call...  │
└─────────────────────┬───────────────────────────────────────┘
                      │  Permission Request
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  PRISM BACKEND  (FastAPI)                    │
│  Feature Engineering → XGBoost → SHAP Explainer             │
│  IsolationForest (Anomaly) → Risk Score → Decision          │
│  SQLite Audit Log                                           │
└─────────────────────┬───────────────────────────────────────┘
                      │  JSON Response
                      ▼
┌─────────────────────────────────────────────────────────────┐
│               PRISM FRONTEND  (React)                        │
│  Dashboard · Predict · History · Analytics · API Reference  │
│  Human Review → Override → Logged back                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
PRISM/
├── backend/
│   ├── main.py                  # FastAPI backend — all endpoints
│   ├── model.pkl                # Trained XGBoost model
│   ├── scaler.pkl               # Feature normalizer
│   ├── explainer.pkl            # SHAP TreeExplainer
│   ├── label_encoder.pkl        # Decision label mapper
│   ├── action_encoder.pkl       # Action type encoder
│   ├── role_encoder.pkl         # User role encoder
│   └── anomaly_detector.pkl     # IsolationForest model
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx              # Full React application
│       └── main.jsx
├── data/
│   ├── generate_dataset.py      # Synthetic dataset generator
│   └── prism_dataset.csv        # Generated dataset (5,000 rows)
├── notebooks/
│   └── PRISM_Training.ipynb     # Full ML training pipeline
├── prism_plots/                 # Auto-generated paper figures
├── requirements.txt
└── README.md
```

---

## Quickstart

### Prerequisites
- Python 3.10+
- Node.js 18+
- Google Colab account (for training)

### Step 1 — Train the Model (Google Colab)

1. Open [colab.research.google.com](https://colab.research.google.com)
2. Upload `notebooks/PRISM_Training.ipynb`
3. Click **Runtime → Run All**
4. Download all `*.pkl` files and the `prism_plots/` folder
5. Place the `*.pkl` files inside `backend/`

### Step 2 — Start the Backend

```bash
cd PRISM/backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

Verify at `http://localhost:8000/health`

### Step 3 — Start the Frontend

```bash
cd PRISM/frontend
npm install
npm run dev
```

Open `http://localhost:3000`

---

## ML Models — Performance Comparison

| Model | Accuracy | F1 (Macro) | Precision | Recall |
|---|---|---|---|---|
| Logistic Regression | ~83% | ~0.82 | ~0.81 | ~0.83 |
| Random Forest | ~91% | ~0.90 | ~0.91 | ~0.90 |
| **XGBoost (PRISM)** | **~94%** | **~0.93** | **~0.94** | **~0.93** |

All models evaluated with 5-fold cross-validation on an 80/20 train-test split.

---

## Dataset

PRISM uses a domain-informed synthetic dataset of 5,000 permission request instances. Labels are assigned using expert-derived rules grounded in RBAC/ABAC access control theory, with 8% stochastic noise injection to simulate real-world labeling uncertainty.

### Features

| Feature | Type | Description |
|---|---|---|
| `action_type` | Categorical | Type of action (file_read, code_exec, db_write, api_call, web_search, email_send, file_write, db_read) |
| `user_role` | Categorical | Role of the agent (guest, user, developer, admin) |
| `data_sensitivity` | Integer 0–3 | Sensitivity of data (0=public, 1=internal, 2=confidential, 3=PII/medical) |
| `task_alignment` | Float 0–1 | How aligned the action is with the agent's declared task goal |
| `request_frequency` | Integer | Number of similar requests in the last hour |
| `time_of_day` | Integer 0–23 | Hour at which the request was made |
| `is_anomalous` | Boolean | Burst/anomaly flag |
| `privilege_level` | Integer 0–3 | Privilege level derived from user role |

### Decision Thresholds

| Risk Score | Decision |
|---|---|
| < 0.35 | Allow |
| 0.35 – 0.65 | Escalate to human |
| > 0.65 | Deny |

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/predict` | Submit a permission request — returns risk score, decision, and SHAP explanation |
| `GET` | `/history` | Retrieve past decisions (`?limit=N`) |
| `POST` | `/feedback` | Submit a human override for a specific decision |
| `GET` | `/stats` | Aggregate statistics — totals, override rate, risk trend |
| `GET` | `/health` | Health check |

Interactive docs at `http://localhost:8000/docs`

### Example Request

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "action_type": "code_exec",
    "user_role": "guest",
    "data_sensitivity": 3,
    "task_alignment": 0.05,
    "request_frequency": 52,
    "time_of_day": 2
  }'
```

---

## Dashboard Pages

| Page | Description |
|---|---|
| **Dashboard** | Live decision feed, stat cards, auto-refresh, modal detail view |
| **Predict** | Manual form with sliders — returns full ML result with SHAP bars and gauges |
| **LLM Interface** | Describe an agent action in plain English and get a risk assessment |
| **History** | Full audit log with filters (All / Allow / Escalate / Deny / Anomaly / Overridden) |
| **Analytics** | 4 live charts — decision distribution, risk trend, action type breakdown, risk histogram |
| **API Reference** | Live endpoint docs fetched from `/openapi.json` with built-in tester |

---

## Research Contribution

1. **ML-driven dynamic risk scoring** — replaces hardcoded rules with a model that learns risky behavior patterns
2. **SHAP explainability on every decision** — every allow/deny/escalate is fully auditable
3. **Calibrated human escalation** — uncertain cases go to humans rather than defaulting to either extreme
4. **IsolationForest anomaly layer** — catches burst patterns the classifier alone would miss
5. **Complete audit trail** — every action, decision, confidence score, and override is logged

---

## Future Work

- Real LLM integration with LangChain and AutoGen
- Online learning from human override feedback
- Multi-agent trust modeling for delegated permissions
- Natural language policy engine
- GDPR / HIPAA / SOC2 compliance mapping

---

## Citation

```bibtex
@misc{prism2025,
  title  = {PRISM: A Human-Centered, Explainable ML Framework for
            Risk-Aware Permission Control in Agentic LLM Systems},
  author = {[Author Name]},
  year   = {2025},
  url    = {https://github.com/astro-prog/PRISM-Permission_and_Risk_Intelligent_System_Model}
}
```

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

*PRISM v1.0.0 — A research prototype for ML-driven, explainable, human-supervised access control in agentic AI systems.*
