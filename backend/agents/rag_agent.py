from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from backend.database.store import db

class RAGOutput(BaseModel):
    rca: str
    recommendation: str
    remediation_action: str
    matched_kb_id: Optional[str] = None
    confidence: int

class RAGAgent:
    def execute(self, category: str, title: str, description: str) -> RAGOutput:
        """
        Performs vector search over ChromaDB with Metadata Pre-filtering and safety thresholds.
        """
        query_text = f"{title} {description}"
        # Pre-filter by category for higher accuracy
        results = db.vector_db.query(query_text, top_k=1, category_filter=category)
        
        if results:
            doc_id, distance, doc = results[0]
            
            # Distance thresholding (guardrails against hallucinations)
            # L2 distance: closer to 0 is better. Reject if distance > 1.2
            if distance < 1.2:
                # Convert distance to a rough confidence percentage for the UI
                confidence = max(10, min(99, int((1.5 - distance) / 1.5 * 100)))
                
                # Formulate output
                return RAGOutput(
                    rca=doc.get("rca", ""),
                    recommendation=doc.get("remediation", ""),
                    remediation_action=f"Apply {doc_id.upper()} fix",
                    matched_kb_id=doc_id,
                    confidence=confidence
                )
        
        # Fallback if similarity is too low or no results
        return RAGOutput(
            rca="No matching historical runbooks found. System metrics variance.",
            recommendation="Perform system pod diagnostics, ping gateway connectivity logs, and trigger rolling restart.",
            remediation_action="Restart Container Node",
            matched_kb_id=None,
            confidence=30
        )

    def index_resolution(self, ticket_id: str, title: str, description: str, category: str, remediation: str, rca: str):
        """
        Indexes a resolved solution back into the Vector Database to support future RAG lookups.
        """
        db.vector_db.upsert(
            doc_id=f"kb-{ticket_id}",
            title=title,
            content=description,
            category=category,
            remediation=remediation,
            rca=rca
        )
