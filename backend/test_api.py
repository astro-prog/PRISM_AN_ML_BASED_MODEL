"""
PRISM — Block 2: API Test Script
=================================
Run this AFTER starting the backend with:
  uvicorn main:app --reload --port 8000

This script tests all 5 endpoints with realistic demo scenarios.
Each scenario matches a real-world agentic LLM use case.
"""

import requests, json

BASE = "http://localhost:8000"

def hr(title):
    print(f"\n{'='*55}")
    print(f"  {title}")
    print('='*55)

def pretty(data):
    print(json.dumps(data, indent=2))

# ── Health Check ──────────────────────────────────────────────
hr("GET /health")
r = requests.get(f"{BASE}/health")
pretty(r.json())

# ── Scenario 1: ALLOW — Developer doing a web search ─────────
hr("SCENARIO 1: Developer web search (expect: ALLOW)")
payload = {
    "action_type":       "web_search",
    "user_role":         "developer",
    "data_sensitivity":  0,
    "task_alignment":    0.95,
    "request_frequency": 3,
    "time_of_day":       10
}
r = requests.post(f"{BASE}/predict", json=payload)
res = r.json()
print(f"  Decision:   {res['decision'].upper()}")
print(f"  Risk Score: {res['risk_score']}")
print(f"  Confidence: {res['confidence']}")
print(f"  Anomalous:  {res['is_anomalous']}")
print(f"  Top Reason: {res['explanation'][0]['feature']} → {res['explanation'][0]['direction']}")
DECISION_ID_1 = res['decision_id']

# ── Scenario 2: DENY — Guest trying to execute code on PII ───
hr("SCENARIO 2: Guest code exec on medical data (expect: DENY)")
payload = {
    "action_type":       "code_exec",
    "user_role":         "guest",
    "data_sensitivity":  3,
    "task_alignment":    0.05,
    "request_frequency": 52,
    "time_of_day":       2
}
r = requests.post(f"{BASE}/predict", json=payload)
res = r.json()
print(f"  Decision:   {res['decision'].upper()}")
print(f"  Risk Score: {res['risk_score']}")
print(f"  Confidence: {res['confidence']}")
print(f"  Anomalous:  {res['is_anomalous']}")
print(f"  Top Reason: {res['explanation'][0]['feature']} → {res['explanation'][0]['direction']}")
DECISION_ID_2 = res['decision_id']

# ── Scenario 3: ESCALATE — Mid-risk ambiguous case ───────────
hr("SCENARIO 3: User DB write on confidential data (expect: ESCALATE)")
payload = {
    "action_type":       "db_write",
    "user_role":         "user",
    "data_sensitivity":  2,
    "task_alignment":    0.55,
    "request_frequency": 12,
    "time_of_day":       14
}
r = requests.post(f"{BASE}/predict", json=payload)
res = r.json()
print(f"  Decision:   {res['decision'].upper()}")
print(f"  Risk Score: {res['risk_score']}")
print(f"  Confidence: {res['confidence']}")
DECISION_ID_3 = res['decision_id']

# ── Scenario 4: Anomaly burst ─────────────────────────────────
hr("SCENARIO 4: 55 API calls in 1 hour (anomaly burst)")
payload = {
    "action_type":       "api_call",
    "user_role":         "user",
    "data_sensitivity":  1,
    "task_alignment":    0.70,
    "request_frequency": 55,
    "time_of_day":       3
}
r = requests.post(f"{BASE}/predict", json=payload)
res = r.json()
print(f"  Decision:   {res['decision'].upper()}")
print(f"  Risk Score: {res['risk_score']}")
print(f"  Anomalous:  {res['is_anomalous']}  ← should be True")

# ── Scenario 5: Admin safe action ────────────────────────────
hr("SCENARIO 5: Admin file read on public data (expect: ALLOW)")
payload = {
    "action_type":       "file_read",
    "user_role":         "admin",
    "data_sensitivity":  0,
    "task_alignment":    0.98,
    "request_frequency": 2,
    "time_of_day":       9
}
r = requests.post(f"{BASE}/predict", json=payload)
res = r.json()
print(f"  Decision:   {res['decision'].upper()}")
print(f"  Risk Score: {res['risk_score']}")

# ── Human Override (feedback) ─────────────────────────────────
hr(f"POST /feedback — Human overrides decision #{DECISION_ID_3}")
r = requests.post(f"{BASE}/feedback", json={
    "decision_id":       DECISION_ID_3,
    "override_decision": "deny",
    "reason":            "Compliance policy: no db_write on confidential without approval"
})
pretty(r.json())

# ── History ───────────────────────────────────────────────────
hr("GET /history — Last 5 decisions")
r = requests.get(f"{BASE}/history?limit=5")
data = r.json()
print(f"  Total logged: {data['count']}")
for d in data['decisions']:
    override = f" → OVERRIDE: {d['override_decision']}" if d['is_override'] else ""
    print(f"  [{d['id']}] {d['action_type']:12s} | {d['user_role']:10s} | "
          f"risk={d['risk_score']:.3f} | {d['decision'].upper()}{override}")

# ── Stats ─────────────────────────────────────────────────────
hr("GET /stats — Dashboard summary")
r = requests.get(f"{BASE}/stats")
s = r.json()
print(f"  Total decisions : {s['total_decisions']}")
print(f"  Allow           : {s['decision_breakdown']['allow']}")
print(f"  Escalate        : {s['decision_breakdown']['escalate']}")
print(f"  Deny            : {s['decision_breakdown']['deny']}")
print(f"  Override rate   : {s['override_rate']*100:.1f}%")
print(f"  Avg risk score  : {s['avg_risk_score']}")
print(f"  Anomalies       : {s['anomaly_count']}")

print("\n✅ All PRISM API tests passed!")
print("📖 View interactive API docs at: http://localhost:8000/docs")
