import datetime
from typing import Dict, Any, Optional
from backend.database.store import db, Incident, LogEntry
from backend.agents.email_agent import EmailReceiverAgent
from backend.agents.triage_agent import TriageAgent
from backend.agents.rag_agent import RAGAgent
from backend.agents.allocation_agent import AllocationAgent

class AgenticOrchestrator:
    def __init__(self):
        self.email_agent = EmailReceiverAgent()
        self.triage_agent = TriageAgent()
        self.rag_agent = RAGAgent()
        self.allocation_agent = AllocationAgent()
        
    def ingest_raw_alert(self, email_raw_text: str, sender: str = "monitor@pulseops.ai") -> Incident:
        """
        Executes the recruiter-grade Multi-Agent flow:
        1. EmailReceiverAgent: Parses raw email headings and extracts category.
        2. TriageAgent: Analyzes priority level, severity parameters, and computes SLA metrics.
        3. RAGAgent: Searches Vector DB (Cosine Similarity) for matching runbooks and confidence.
        4. AllocationAgent: Evaluates workloads, reliability, and assigns engineers.
        5. Saves to Vector DB (RAG index) and memory database.
        """
        # Step 1: Parse Email
        email_parsed = self.email_agent.execute(email_raw_text, sender)
        
        # Step 2: Triage & Analyze
        triage = self.triage_agent.execute(email_parsed.title, email_parsed.description)
        category = email_parsed.extracted_category
        
        # Calculate predicted duration
        active_count = len([i for i in db.incidents if i.status == "Active"])
        base_mttrs = {"Database": 3.0, "Security": 2.0, "Network": 3.5, "Application": 2.5, "Infrastructure": 3.2}
        base_mttr = base_mttrs.get(category, 2.5)
        predicted_time = round(base_mttr * (1.0 + (active_count * 0.12)), 1)
        
        sla_limit = triage.sla_limit
        raw_risk = (predicted_time / sla_limit) * 100
        sla_risk = min(round(raw_risk), 99)
        
        # Step 3: Vector RAG Query
        rag = self.rag_agent.execute(category, email_parsed.title, email_parsed.description)
        
        # Step 4: Resource Allocation
        alloc = self.allocation_agent.execute(category)
        
        # Create Incident record
        new_id = 100 + len(db.incidents) + 1
        
        logs = [
            LogEntry(time=datetime.datetime.now().strftime("%I:%M %p"), text="[Email Receiver Agent] Extracted subject alerts logs."),
            LogEntry(time=datetime.datetime.now().strftime("%I:%M %p"), text=f"[Analysis Agent] Computed Score: Urgency={triage.urgency}, Priority={triage.priority}."),
            LogEntry(time=datetime.datetime.now().strftime("%I:%M %p"), text=f"[RAG Agent] Queried Vector DB index. Cosine Match: {rag.confidence}% (ID: {rag.matched_kb_id or 'none'})."),
            LogEntry(time=datetime.datetime.now().strftime("%I:%M %p"), text=f"[Assignment Agent] Scheduled to {alloc.assigned_engineer or 'none'} (Workload: {alloc.match_score} Match)."),
            LogEntry(time=datetime.datetime.now().strftime("%I:%M %p"), text="[RAG Ingestor] Inserted new incident logs to similarity store.")
        ]
        
        new_incident = Incident(
            id=new_id,
            title=email_parsed.title,
            category=category,
            priority=triage.priority,
            impact=triage.severity,
            urgency=triage.urgency,
            status="Active",
            createdAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            slaLimit=sla_limit,
            predictedTime=predicted_time,
            slaRisk=sla_risk,
            assignee=alloc.assigned_engineer,
            description=email_parsed.description,
            rca=rag.rca,
            recommendation=rag.recommendation,
            remediationAction=rag.remediation_action,
            logs=logs
        )
        
        # Write to Vector Database (Index the initial ticket state)
        self.rag_agent.index_resolution(
            ticket_id=str(new_id),
            title=new_incident.title,
            description=new_incident.description,
            category=new_incident.category,
            remediation=new_incident.recommendation,
            rca=new_incident.rca
        )
        
        # Append state
        db.incidents.insert(0, new_incident)
        db.metrics.incidentsToday += 1
        
        if alloc.assigned_engineer:
            eng = next((e for e in db.engineers if e.name == alloc.assigned_engineer), None)
            if eng:
                eng.activeTickets += 1
                
        return new_incident

# Instantiate master orchestrator
orchestrator = AgenticOrchestrator()
