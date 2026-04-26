"""
PRISM — Permission Risk Intelligence System for agentic Models
================================================================
Block 2: FastAPI Backend
================================================================
Endpoints:
  POST /predict    → risk score + decision + SHAP explanation
  GET  /history    → last 50 decisions from SQLite
  POST /feedback   → human override (human-in-the-loop)
  GET  /stats      → model performance + decision summary
  GET  /health     → server health check
================================================================
Run with:
  uvicorn main:app --reload --port 8000
================================================================
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import Optional, Literal
import joblib, sqlite3, json, os, time, math

def safe_json(obj):
    """JSON serializer that converts NaN/Infinity to 0 safely."""
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return 0.0
        return obj
    raise TypeError(f"Not serializable: {type(obj)}")

def safe_dumps(data):
    """json.dumps that handles NaN/Infinity."""
    try:
        return json.dumps(data, default=safe_json)
    except Exception:
        return "[]"

def safe_loads(s):
    """json.loads that never crashes."""
    try:
        return json.loads(s or "[]")
    except Exception:
        return []

def to_python(val):
    """Convert numpy/special types to plain Python for SQLite safety."""
    if val is None:
        return None
    try:
        import numpy as np
        if isinstance(val, (np.integer,)):
            return int(val)
        if isinstance(val, (np.floating,)):
            v = float(val)
            if math.isnan(v) or math.isinf(v):
                return 0.0
            return v
        if isinstance(val, (np.bool_,)):
            return bool(val)
        if isinstance(val, (np.ndarray,)):
            return val.tolist()
    except Exception:
        pass
    if isinstance(val, float):
        if math.isnan(val) or math.isinf(val):
            return 0.0
        return val
    return val
import numpy as np
from datetime import datetime

# ── App Initialization ────────────────────────────────────────
app = FastAPI(
    title="PRISM API",
    description="Permission Risk Intelligence System for agentic Models",
    version="1.0.0"
)

# Allow frontend (any origin) to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load ML Artifacts ─────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def load_artifact(filename):
    path = os.path.join(BASE_DIR, filename)
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"❌ {filename} not found. "
            f"Please run the PRISM_Training.ipynb notebook first "
            f"and place *.pkl files in the backend/ folder."
        )
    return joblib.load(path)

try:
    model            = load_artifact("model.pkl")
    scaler           = load_artifact("scaler.pkl")
    explainer        = load_artifact("explainer.pkl")
    le_decision      = load_artifact("label_encoder.pkl")
    le_action        = load_artifact("action_encoder.pkl")
    le_role          = load_artifact("role_encoder.pkl")
    anomaly_detector = load_artifact("anomaly_detector.pkl")
    MODELS_LOADED    = True
    print("✅ All PRISM model artifacts loaded successfully.")
except FileNotFoundError as e:
    print(str(e))
    MODELS_LOADED = False

# ── SQLite Database Setup ─────────────────────────────────────
DB_PATH = os.path.join(BASE_DIR, "prism.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c    = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS decisions (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp         TEXT,
            action_type       TEXT,
            user_role         TEXT,
            data_sensitivity  INTEGER,
            task_alignment    REAL,
            request_frequency INTEGER,
            time_of_day       INTEGER,
            is_anomalous      INTEGER,
            privilege_level   INTEGER,
            risk_score        REAL,
            decision          TEXT,
            confidence        REAL,
            shap_explanation  TEXT,
            is_override       INTEGER DEFAULT 0,
            override_decision TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

# ── Feature Constants ─────────────────────────────────────────
ACTION_TYPES = ["file_read","file_write","api_call","code_exec",
                "db_read","db_write","web_search","email_send"]
USER_ROLES   = ["guest","user","developer","admin"]
FEATURE_NAMES = ["Action Type","User Role","Data Sensitivity",
                 "Task Alignment","Request Frequency","Time of Day",
                 "Is Anomalous","Privilege Level"]

ROLE_PRIVILEGE = {"guest": 0, "user": 1, "developer": 2, "admin": 3}

DECISION_COLORS = {
    "allow":    "#2ecc71",
    "escalate": "#f39c12",
    "deny":     "#e74c3c"
}

# ── Pydantic Schemas ──────────────────────────────────────────

class PermissionRequest(BaseModel):
    action_type:       Literal["file_read","file_write","api_call","code_exec",
                               "db_read","db_write","web_search","email_send"]
    user_role:         Literal["guest","user","developer","admin"]
    data_sensitivity:  int   = Field(..., ge=0, le=3,
                                     description="0=public, 1=internal, 2=confidential, 3=PII/medical")
    task_alignment:    float = Field(..., ge=0.0, le=1.0,
                                     description="How aligned is this action with the declared goal")
    request_frequency: int   = Field(..., ge=1, le=200,
                                     description="Number of similar requests in last hour")
    time_of_day:       int   = Field(..., ge=0, le=23,
                                     description="Hour of request (0-23)")

class FeedbackRequest(BaseModel):
    decision_id:       int
    override_decision: Literal["allow","escalate","deny"]
    reason:            Optional[str] = None

class PredictionResponse(BaseModel):
    decision_id:      int
    decision:         str
    risk_score:       float
    confidence:       float
    is_anomalous:     bool
    color:            str
    explanation:      list
    timestamp:        str
    features_used:    dict

# ── Helper: Build Feature Vector ──────────────────────────────

def build_feature_vector(req: PermissionRequest):
    """Encode and scale a PermissionRequest into model-ready numpy array."""
    action_enc    = le_action.transform([req.action_type])[0]
    role_enc      = le_role.transform([req.user_role])[0]
    privilege     = ROLE_PRIVILEGE[req.user_role]
    is_anomalous  = 1 if req.request_frequency > 45 else 0

    raw = np.array([[
        action_enc,
        role_enc,
        req.data_sensitivity,
        req.task_alignment,
        req.request_frequency,
        req.time_of_day,
        is_anomalous,
        privilege
    ]])
    scaled = scaler.transform(raw)
    return scaled, is_anomalous, raw[0]

# ── Helper: SHAP Explanation ──────────────────────────────────

def get_shap_explanation(scaled_features, decision_class_idx):
    """Return top feature contributions for the predicted class."""
    try:
        sv = explainer(scaled_features)
        shap_vals = sv[0, :, decision_class_idx].values
        explanation = []
        for i, (name, val) in enumerate(zip(FEATURE_NAMES, shap_vals)):
            explanation.append({
                "feature":       name,
                "shap_value":    round(float(val), 4),
                "direction":     "increases risk" if val > 0 else "decreases risk",
                "magnitude":     round(abs(float(val)), 4)
            })
        # Sort by absolute importance
        explanation.sort(key=lambda x: x["magnitude"], reverse=True)
        return explanation
    except Exception:
        # Fallback if SHAP fails
        return [{"feature": n, "shap_value": 0.0,
                 "direction": "unknown", "magnitude": 0.0}
                for n in FEATURE_NAMES]

# ── Helper: Save Decision to DB ───────────────────────────────

def save_decision(req, risk_score, decision, confidence,
                  shap_exp, is_anomalous):
    conn = sqlite3.connect(DB_PATH)
    c    = conn.cursor()
    c.execute("""
        INSERT INTO decisions
        (timestamp, action_type, user_role, data_sensitivity,
         task_alignment, request_frequency, time_of_day,
         is_anomalous, privilege_level, risk_score, decision,
         confidence, shap_explanation)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (
        datetime.now().isoformat(),
        str(req.action_type), str(req.user_role),
        int(req.data_sensitivity),
        float(req.task_alignment), int(req.request_frequency),
        int(req.time_of_day),
        int(is_anomalous), int(ROLE_PRIVILEGE[req.user_role]),
        round(float(to_python(risk_score)), 4), str(decision),
        round(float(to_python(confidence)), 4), safe_dumps(shap_exp)
    ))
    conn.commit()
    row_id = c.lastrowid
    conn.close()
    return row_id

# ══════════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════════

# ── POST /predict ─────────────────────────────────────────────
@app.post("/predict", response_model=PredictionResponse, tags=["Core"])
def predict(req: PermissionRequest):
    """
    Main prediction endpoint.
    Takes a permission request → returns risk score, decision, and SHAP explanation.
    """
    if not MODELS_LOADED:
        raise HTTPException(status_code=503,
            detail="Models not loaded. Run PRISM_Training.ipynb first.")

    # Build features
    scaled, is_anomalous, raw = build_feature_vector(req)

    # Anomaly check (IsolationForest)
    anomaly_flag = anomaly_detector.predict(scaled)[0] == -1
    # Override: if IsolationForest flags it AND frequency is very high → force escalate
    force_escalate = anomaly_flag and req.request_frequency > 50

    # Predict
    proba     = model.predict_proba(scaled)[0]
    class_idx = int(np.argmax(proba))
    confidence = float(proba[class_idx])
    decision   = le_decision.inverse_transform([class_idx])[0]

    # Compute risk score as weighted probability
    class_order = list(le_decision.classes_)   # e.g. ['allow','deny','escalate']
    risk_weights = {"allow": 0.0, "escalate": 0.5, "deny": 1.0}
    risk_score = sum(proba[i] * risk_weights.get(cls, 0.5)
                     for i, cls in enumerate(class_order))

    # Override decision if anomaly forces escalation
    if force_escalate and decision == "allow":
        decision   = "escalate"
        risk_score = max(risk_score, 0.50)

    # SHAP explanation
    shap_exp = get_shap_explanation(scaled, class_idx)

    # Save to DB
    row_id = save_decision(req, risk_score, decision,
                           confidence, shap_exp, int(is_anomalous))

    return PredictionResponse(
        decision_id   = row_id,
        decision      = decision,
        risk_score    = round(risk_score, 4),
        confidence    = round(confidence, 4),
        is_anomalous  = bool(anomaly_flag),
        color         = DECISION_COLORS.get(decision, "#95a5a6"),
        explanation   = shap_exp,
        timestamp     = datetime.now().isoformat(),
        features_used = {
            "action_type":       req.action_type,
            "user_role":         req.user_role,
            "data_sensitivity":  req.data_sensitivity,
            "task_alignment":    req.task_alignment,
            "request_frequency": req.request_frequency,
            "time_of_day":       req.time_of_day,
            "is_anomalous":      bool(is_anomalous),
            "privilege_level":   ROLE_PRIVILEGE[req.user_role]
        }
    )


# ── GET /history ──────────────────────────────────────────────
@app.get("/history", tags=["Data"])
def get_history(limit: int = 50):
    """Returns the last N decisions logged in the database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("""
        SELECT id, timestamp, action_type, user_role,
               data_sensitivity, task_alignment, request_frequency,
               risk_score, decision, confidence,
               is_anomalous, is_override, override_decision,
               shap_explanation
        FROM decisions
        ORDER BY id DESC
        LIMIT ?
    """, (limit,))
    rows = c.fetchall()
    conn.close()

    history = []
    for row in rows:
        try:
            r = dict(row)
            r["shap_explanation"] = safe_loads(r.get("shap_explanation","[]"))
            r["color"] = DECISION_COLORS.get(r.get("decision","allow"), "#95a5a6")
            # Ensure all numeric fields are proper Python types
            r["risk_score"]  = float(r.get("risk_score") or 0)
            r["confidence"]  = float(r.get("confidence") or 0)
            r["data_sensitivity"] = int(r.get("data_sensitivity") or 0)
            r["request_frequency"] = int(r.get("request_frequency") or 0)
            r["time_of_day"] = int(r.get("time_of_day") or 0)
            history.append(r)
        except Exception as e:
            print(f"Skipping row due to error: {e}")
            continue
    return {"count": len(history), "decisions": history}


# ── POST /feedback ────────────────────────────────────────────
@app.post("/feedback", tags=["Human-in-the-Loop"])
def submit_feedback(fb: FeedbackRequest):
    """
    Human override endpoint — the core of human-in-the-loop.
    Logs when a human disagrees with the model and overrides the decision.
    """
    conn = sqlite3.connect(DB_PATH)
    c    = conn.cursor()

    # Check the decision exists
    c.execute("SELECT id, decision FROM decisions WHERE id = ?", (fb.decision_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404,
            detail=f"Decision ID {fb.decision_id} not found.")

    original_decision = row[1]

    # Update with override
    c.execute("""
        UPDATE decisions
        SET is_override=1, override_decision=?
        WHERE id=?
    """, (fb.override_decision, fb.decision_id))
    conn.commit()
    conn.close()

    return {
        "status":            "success",
        "message":           f"Human override recorded for decision #{fb.decision_id}",
        "decision_id":       fb.decision_id,
        "original_decision": original_decision,
        "override_decision": fb.override_decision,
        "reason":            fb.reason,
        "timestamp":         datetime.now().isoformat()
    }


# ── GET /stats ────────────────────────────────────────────────
@app.get("/stats", tags=["Analytics"])
def get_stats():
    """
    Returns aggregate stats for the dashboard:
    total decisions, decision breakdown, override rate,
    avg risk score, anomaly count.
    """
    conn = sqlite3.connect(DB_PATH)
    c    = conn.cursor()

    c.execute("SELECT COUNT(*) FROM decisions")
    total = c.fetchone()[0]

    c.execute("""
        SELECT decision, COUNT(*) as cnt
        FROM decisions GROUP BY decision
    """)
    decision_counts = {row[0]: row[1] for row in c.fetchall()}

    c.execute("SELECT COUNT(*) FROM decisions WHERE is_override=1")
    override_count = c.fetchone()[0]

    c.execute("SELECT AVG(risk_score) FROM decisions")
    avg_risk = float(c.fetchone()[0] or 0.0)

    c.execute("SELECT COUNT(*) FROM decisions WHERE is_anomalous=1")
    anomaly_count = c.fetchone()[0]

    c.execute("""
        SELECT AVG(CASE WHEN is_override=1
                        AND override_decision != decision THEN 1.0
                   ELSE 0.0 END)
        FROM decisions
    """)
    disagreement_rate = c.fetchone()[0] or 0.0

    # Risk trend — last 20 decisions
    c.execute("""
        SELECT risk_score, decision, timestamp
        FROM decisions ORDER BY id DESC LIMIT 20
    """)
    trend = [{"risk_score": float(r[0] or 0), "decision": r[1],
              "timestamp": r[2]} for r in c.fetchall()]
    trend.reverse()

    conn.close()

    override_rate = round(override_count / total, 4) if total > 0 else 0.0

    return {
        "total_decisions":   int(total),
        "decision_breakdown": {
            "allow":    int(decision_counts.get("allow", 0)),
            "escalate": int(decision_counts.get("escalate", 0)),
            "deny":     int(decision_counts.get("deny", 0)),
        },
        "override_count":     int(override_count),
        "override_rate":      float(override_rate),
        "human_disagreement_rate": float(round(disagreement_rate, 4)),
        "avg_risk_score":     float(round(avg_risk, 4)),
        "anomaly_count":      int(anomaly_count),
        "risk_trend":         trend,
        "model_info": {
            "name":      "XGBoost (PRISM)",
            "version":   "1.0.0",
            "features":  len(FEATURE_NAMES),
            "classes":   ["allow", "escalate", "deny"]
        }
    }


# ── GET /health ───────────────────────────────────────────────
@app.get("/health", tags=["System"])
def health_check():
    """Quick health check — confirm server and models are running."""
    return {
        "status":        "healthy",
        "models_loaded": MODELS_LOADED,
        "timestamp":     datetime.now().isoformat(),
        "api_version":   "1.0.0",
        "system":        "PRISM — Permission Risk Intelligence System"
    }


# ── GET /debug ────────────────────────────────────────────────
@app.get("/debug", tags=["System"])
def debug():
    """Debug endpoint - shows DB path, record count, and latest record."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM decisions")
        count = c.fetchone()[0]
        c.execute("SELECT id, action_type, decision, risk_score, timestamp FROM decisions ORDER BY id DESC LIMIT 3")
        rows = [dict(r) for r in c.fetchall()]
        conn.close()
        return {
            "db_path": DB_PATH,
            "db_exists": os.path.exists(DB_PATH),
            "total_records": count,
            "latest_records": rows
        }
    except Exception as e:
        return {"error": str(e), "db_path": DB_PATH}

# ── GET / (root) ──────────────────────────────────────────────
@app.get("/", tags=["System"])
def root():
    return {
        "name":        "PRISM API",
        "description": "Permission Risk Intelligence System for agentic Models",
        "version":     "1.0.0",
        "docs":        "/docs",
        "endpoints": {
            "predict":  "POST /predict",
            "history":  "GET  /history",
            "feedback": "POST /feedback",
            "stats":    "GET  /stats",
            "health":   "GET  /health"
        }
    }
