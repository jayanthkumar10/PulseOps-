import datetime
import math
import re
import urllib.request
import json
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Tuple
import os
import chromadb

class LogEntry(BaseModel):
    time: str
    text: str

class Incident(BaseModel):
    id: int
    title: str
    category: str
    priority: str
    impact: str
    urgency: str
    status: str
    createdAt: str
    slaLimit: int
    predictedTime: float
    slaRisk: int
    assignee: Optional[str] = None
    description: str
    rca: str
    recommendation: str
    remediationAction: str
    logs: List[LogEntry] = []

class Engineer(BaseModel):
    name: str
    skills: List[str]
    activeTickets: int
    capacity: int
    reliability: int
    avatar: str
    status: str

class Runbook(BaseModel):
    id: str
    title: str
    keywords: List[str]
    remediation: str
    rca: str
    category: str

class SystemMetrics(BaseModel):
    cpu: int
    memory: int
    dbLatency: int
    errorRate: float
    incidentsToday: int
    resolvedToday: int
    slaCompliance: float
    cpuHistory: List[int]
    latencyHistory: List[int]

# Persistent Chroma Vector Database
class ChromaVectorDB:
    def __init__(self):
        db_path = os.path.join(os.path.dirname(__file__), "..", "data", "chromadb")
        os.makedirs(db_path, exist_ok=True)
        self.client = chromadb.PersistentClient(path=db_path)
        self.collection = self.client.get_or_create_collection(name="pulseops_runbooks")

    def upsert(self, doc_id: str, title: str, content: str, category: str, remediation: str, rca: str):
        """
        Inserts or updates a document vector natively using ChromaDB.
        Overwrite handling: If doc_id exists, Chroma explicitly overrides the previous vector and metadata.
        """
        full_text = f"{title} {content} {category} {rca}"
        
        self.collection.upsert(
            documents=[full_text],
            metadatas=[{
                "title": title,
                "category": category,
                "remediation": remediation,
                "rca": rca
            }],
            ids=[doc_id]
        )

    def query(self, query_text: str, top_k: int = 3, category_filter: str = None) -> List[Tuple[str, float, dict]]:
        """
        Queries ChromaDB using native embeddings with optional Metadata Pre-filtering.
        Returns List of (doc_id, distance_score, metadata_dict)
        """
        if self.collection.count() == 0:
            return []
            
        where_clause = {"category": category_filter} if category_filter else None
        
        results = self.collection.query(
            query_texts=[query_text],
            n_results=top_k,
            where=where_clause
        )
        
        output = []
        if results["ids"] and len(results["ids"][0]) > 0:
            for i in range(len(results["ids"][0])):
                doc_id = results["ids"][0][i]
                distance = results["distances"][0][i]
                metadata = results["metadatas"][0][i]
                output.append((doc_id, distance, metadata))
                
        return output

# Initial Data Seeds
initial_incidents = [
    Incident(
        id=101,
        title="Database latency affecting customer checkout transactions",
        category="Database",
        priority="Critical",
        impact="High",
        urgency="Immediate",
        status="Active",
        createdAt=(datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=45)).isoformat(),
        slaLimit=4,
        predictedTime=4.8,
        slaRisk=92,
        assignee="Dave Miller",
        description="Database cluster checkout-prod-replica is reporting query queue lengths exceeding 200 items. Transaction commit times have spiked to 5.4 seconds, causing checkout page timeouts.",
        rca="Missing query index on customers search parameter coupled with locking writes on order creation.",
        recommendation="Apply missing database index 'IX_CHECKOUT_SEARCH' on the tables and redirect read queries to secondary replica.",
        remediationAction="Apply IX_CHECKOUT_SEARCH Index",
        logs=[
            LogEntry(time="10:42 AM", text="Email alert ingested by Receiver Agent."),
            LogEntry(time="10:43 AM", text="TriageAgent parsed summary: Priority=Critical, Category=Database."),
            LogEntry(time="10:43 AM", text="RAG Agent searched vector DB and found 94% match (kb-01)."),
            LogEntry(time="10:44 AM", text="AllocationAgent matched Dave Miller (DB Score: 94).")
        ]
    ),
    Incident(
        id=102,
        title="S3 upload failures in asset-delivery bucket - Access Denied",
        category="Security",
        priority="High",
        impact="High",
        urgency="High",
        status="Active",
        createdAt=(datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=90)).isoformat(),
        slaLimit=8,
        predictedTime=2.2,
        slaRisk=15,
        assignee="Sarah Jenkins",
        description="Production asset uploads failing with 403 Access Denied messages. CloudFront serving cached files correctly but backend updates are blocked.",
        rca="IAM policy drift deleted s3:PutObject permission for the service deployment principal.",
        recommendation="Re-apply IAM policy template JSON version v2.1.2 to restore write permission.",
        remediationAction="Restore IAM S3 PutObject Policy",
        logs=[
            LogEntry(time="09:57 AM", text="Email alert ingested by Receiver Agent."),
            LogEntry(time="09:58 AM", text="TriageAgent categorized Security issue."),
            LogEntry(time="09:58 AM", text="Assigned to Sarah Jenkins (IAM policy expert).")
        ]
    ),
    Incident(
        id=103,
        title="API Gateway response slowdown (504 Gateway Timeouts)",
        category="Network",
        priority="High",
        impact="Medium",
        urgency="High",
        status="Active",
        createdAt=(datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=15)).isoformat(),
        slaLimit=8,
        predictedTime=5.5,
        slaRisk=68,
        assignee=None,
        description="Ingress gateways are returning 504 timeouts to clients. Pod metrics indicate auth-service response times have crossed 8 seconds, backing up requests.",
        rca="Authentication connection pool exhausted due to sudden login request spike.",
        recommendation="Scale auth-service pods to 8 replicas and increase connection timeout limits on Nginx configs.",
        remediationAction="Scale Pod Replicas",
        logs=[
            LogEntry(time="11:12 AM", text="Email alert ingested by Receiver Agent."),
            LogEntry(time="11:13 AM", text="TriageAgent parsed Network latency warnings.")
        ]
    )
]

initial_engineers = [
    Engineer(name="Dave Miller", skills=["Database", "Infrastructure", "Network"], activeTickets=1, capacity=3, reliability=96, avatar="DM", status="Active"),
    Engineer(name="Sarah Jenkins", skills=["Security", "Network", "Infrastructure"], activeTickets=1, capacity=2, reliability=95, avatar="SJ", status="Active"),
    Engineer(name="Alice Wong", skills=["Application", "Security"], activeTickets=0, capacity=3, reliability=94, avatar="AW", status="Active"),
    Engineer(name="Bob Evans", skills=["Application", "Database"], activeTickets=0, capacity=3, reliability=88, avatar="BE", status="Active"),
    Engineer(name="Charlie Brown", skills=["Infrastructure", "Network"], activeTickets=0, capacity=4, reliability=82, avatar="CB", status="Idle"),
    Engineer(name="Diana Prince", skills=["Security", "Application"], activeTickets=0, capacity=3, reliability=97, avatar="DP", status="Active"),
    Engineer(name="Ethan Hunt", skills=["Security", "Network"], activeTickets=0, capacity=2, reliability=99, avatar="EH", status="Active"),
    Engineer(name="Fiona Gallagher", skills=["Application", "Infrastructure"], activeTickets=0, capacity=3, reliability=85, avatar="FG", status="Active"),
    Engineer(name="George Clark", skills=["Database", "Application"], activeTickets=0, capacity=4, reliability=90, avatar="GC", status="Active"),
    Engineer(name="Hannah Abbott", skills=["Infrastructure", "Database"], activeTickets=0, capacity=3, reliability=89, avatar="HA", status="Active"),
    Engineer(name="Ian Malcolm", skills=["Database", "Security"], activeTickets=0, capacity=3, reliability=93, avatar="IM", status="Active"),
    Engineer(name="Julia Roberts", skills=["Application", "Network"], activeTickets=0, capacity=4, reliability=91, avatar="JR", status="Active"),
    Engineer(name="Kevin Mitnick", skills=["Security", "Infrastructure"], activeTickets=0, capacity=2, reliability=98, avatar="KM", status="Active"),
    Engineer(name="Laura Croft", skills=["Network", "Database"], activeTickets=0, capacity=3, reliability=95, avatar="LC", status="Active"),
    Engineer(name="Marcus Aurelius", skills=["Infrastructure", "Security"], activeTickets=0, capacity=4, reliability=92, avatar="MA", status="Active"),
    Engineer(name="Nina Simone", skills=["Application", "Database"], activeTickets=0, capacity=3, reliability=87, avatar="NS", status="Active"),
    Engineer(name="Oscar Wilde", skills=["Network", "Application"], activeTickets=0, capacity=3, reliability=86, avatar="OW", status="Active"),
    Engineer(name="Penelope Cruz", skills=["Security", "Network"], activeTickets=0, capacity=3, reliability=94, avatar="PC", status="Active"),
    Engineer(name="Quentin Tarantino", skills=["Infrastructure", "Database"], activeTickets=0, capacity=4, reliability=88, avatar="QT", status="Active"),
    Engineer(name="Rachel Green", skills=["Application", "Infrastructure"], activeTickets=0, capacity=3, reliability=84, avatar="RG", status="Active")
]

# Database state wrapper
class MemoryDatabase:
    def __init__(self):
        self.incidents: List[Incident] = initial_incidents.copy()
        self.engineers: List[Engineer] = initial_engineers.copy()
        self.vector_db = ChromaVectorDB()
        self.metrics = SystemMetrics(
            cpu=64,
            memory=78,
            dbLatency=45,
            errorRate=1.2,
            incidentsToday=24,
            resolvedToday=19,
            slaCompliance=96.2,
            cpuHistory=[60, 62, 58, 65, 63, 61, 64, 60, 59, 62, 63, 65, 60, 61, 64, 62, 60, 58, 64, 66, 62, 60, 61, 64, 63, 62, 60, 61, 65, 64],
            latencyHistory=[40, 42, 38, 45, 43, 41, 44, 40, 39, 42, 43, 45, 40, 41, 44, 42, 40, 38, 44, 46, 42, 40, 41, 44, 43, 42, 40, 41, 45, 45]
        )
        self.audit_logs: List[str] = []
        
        # Prevent costly re-embedding on restarts
        if self.vector_db.collection.count() == 0:
            # Populate initial Vector DB runbooks
            self.vector_db.upsert(
                doc_id="kb-01",
                title="Resolving checkout database latency & locking index errors",
                content="Run CREATE INDEX CONCURRENTLY IX_CHECKOUT_SEARCH ON orders(customer_id, checkout_status); database read replica replication lag.",
                category="Database",
                remediation="Apply missing database index 'IX_CHECKOUT_SEARCH' on the tables and redirect read queries to secondary replica.",
                rca="Missing query index on customers search parameter coupled with locking writes on order creation."
            )
            self.vector_db.upsert(
                doc_id="kb-02",
                title="S3 403 Forbidden Access Denied policies fixes",
                content="Amazon S3 bucket policy permissions denied. IAM policy credentials PutObject uploader templates roles config.",
                category="Security",
                remediation="Re-apply IAM policy template JSON version v2.1.2 to restore write permission.",
                rca="IAM policy drift deleted s3:PutObject permission for the service deployment principal."
            )
            self.vector_db.upsert(
                doc_id="kb-03",
                title="API Gateway 504 Timeout container scaling guide",
                content="Horizontal pod autoscaler scale replicas connection pools gateway ingress timeouts auth-service.",
                category="Network",
                remediation="Scale auth-service pods to 8 replicas and increase connection timeout limits on Nginx configs.",
                rca="Authentication connection pool exhausted due to sudden login request spike."
            )

    def get_incidents(self) -> List[Incident]:
        return self.incidents

    def get_engineers(self) -> List[Engineer]:
        return self.engineers

    def get_kb(self) -> List[Dict[str, Any]]:
        # Map VectorDB items to runbook structures directly from Chroma
        if self.vector_db.collection.count() == 0:
            return []
            
        results = self.vector_db.collection.get()
        output = []
        if results["ids"]:
            for i in range(len(results["ids"])):
                metadata = results["metadatas"][i]
                output.append({
                    "id": results["ids"][i],
                    "title": metadata.get("title", ""),
                    "keywords": metadata.get("title", "").split(),
                    "remediation": metadata.get("remediation", ""),
                    "rca": metadata.get("rca", ""),
                    "category": metadata.get("category", "")
                })
        return output

    def get_metrics(self) -> SystemMetrics:
        return self.metrics

# Instantiate singleton DB
db = MemoryDatabase()
