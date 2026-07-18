from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import random

from backend.database.store import db, Incident, Engineer, LogEntry
from backend.agents.orchestrator import orchestrator
from backend.agents.copilot_agent import CopilotAgent
from backend.agents.rag_agent import RAGAgent

app = FastAPI(title="PulseOps AI Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class HealthResponse(BaseModel):
    status: str

class IncidentCreate(BaseModel):
    title: str
    description: str
    category: Optional[str] = None

class EmailSimPayload(BaseModel):
    email_text: str
    sender: Optional[str] = "alerts@pulseops.ai"

class ReassignPayload(BaseModel):
    ticket_id: int
    assignee: str

class ResolvePayload(BaseModel):
    ticket_id: int
    notes: str
    rca: Optional[str] = None

class CopilotQuery(BaseModel):
    query: str

@app.get("/api/health", response_model=HealthResponse)
def health_check():
    return {"status": "healthy"}

@app.get("/api/state")
def get_state():
    return {
        "incidents": db.get_incidents(),
        "engineers": db.get_engineers(),
        "kb": db.get_kb(),
        "metrics": db.get_metrics()
    }

@app.post("/api/incidents")
def create_incident(payload: IncidentCreate):
    """
    Direct incident creation (fallback).
    """
    try:
        raw_email = f"Subject: {payload.title}\n{payload.description}"
        incident = orchestrator.ingest_raw_alert(raw_email)
        return {"status": "success", "incident": incident}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/email-simulation")
def trigger_email_simulation(payload: EmailSimPayload):
    """
    Ingests simulated raw emails through the multi-agent pipeline.
    """
    try:
        incident = orchestrator.ingest_raw_alert(payload.email_text, payload.sender)
        return {"status": "success", "incident": incident}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/reassign")
def reassign_incident(payload: ReassignPayload):
    incident = next((i for i in db.incidents if i.id == payload.ticket_id), None)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    engineer = next((e for e in db.engineers if e.name == payload.assignee), None)
    if not engineer:
        raise HTTPException(status_code=404, detail="Engineer not found")
        
    old_assignee = incident.assignee
    if old_assignee:
        old_eng = next((e for e in db.engineers if e.name == old_assignee), None)
        if old_eng and old_eng.activeTickets > 0:
            old_eng.activeTickets -= 1
            
    incident.assignee = engineer.name
    engineer.activeTickets += 1
    
    incident.logs.append(LogEntry(
        time="Just Now",
        text=f"Reassigned from {old_assignee or 'Unassigned'} to {engineer.name} via Controller."
    ))
    
    return {"status": "success", "incident": incident}

@app.post("/api/resolve")
def resolve_incident(payload: ResolvePayload):
    """
    Resolves an active incident and upserts/edits the resolution vector in the RAG store.
    """
    incident = next((i for i in db.incidents if i.id == payload.ticket_id), None)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    # Update state variables
    incident.status = "Resolved"
    incident.recommendation = payload.notes
    if payload.rca:
        incident.rca = payload.rca
        
    # Clear workload
    if incident.assignee:
        eng = next((e for e in db.engineers if e.name == incident.assignee), None)
        if eng and eng.activeTickets > 0:
            eng.activeTickets -= 1
            
    # Index/Upsert vector record into Vector DB
    rag = RAGAgent()
    rag.index_resolution(
        ticket_id=str(incident.id),
        title=incident.title,
        description=incident.description,
        category=incident.category,
        remediation=payload.notes,
        rca=incident.rca
    )
    
    incident.logs.append(LogEntry(
        time="Just Now",
        text=f"Resolution logged by operator. Vector store upsert completed for doc ID kb-{incident.id}."
    ))
    
    db.metrics.resolvedToday += 1
    resolved_count = len([i for i in db.incidents if i.status == "Resolved"])
    db.metrics.slaCompliance = min(100.0, round(90.0 + (resolved_count * 1.2), 1))
    
    return {"status": "success", "incident": incident}

@app.post("/api/copilot")
def query_copilot(payload: CopilotQuery):
    agent = CopilotAgent()
    response = agent.execute(payload.query)
    return response

@app.post("/api/metrics/tick")
def tick_metrics():
    metrics = db.metrics
    
    cpu_drift = random.randint(-4, 4)
    metrics.cpu = max(10, min(98, metrics.cpu + cpu_drift))
    metrics.cpuHistory.append(metrics.cpu)
    metrics.cpuHistory.pop(0)
    
    lat_drift = random.randint(-6, 6)
    metrics.dbLatency = max(15, min(220, metrics.dbLatency + lat_drift))
    metrics.latencyHistory.append(metrics.dbLatency)
    metrics.latencyHistory.pop(0)
    
    metrics.errorRate = round(max(0.1, (metrics.cpu / 50.0) + (random.random() * 0.4)), 1)
    
    return metrics
