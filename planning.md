# PulseOps AI - Planning Document (Refactored)

## Project Vision
PulseOps AI focuses on streamlining incident response workflows. By automating ingestion through email analyzers, triaging severity via priority engines, and performing cosine similarity lookups over a RAG database, it establishes a recruiter-grade demonstration of full-stack AIOps.

---

## Roadmap Phases

### Phase 1: Interactive Foundation (CRED Theme)
- **CRED Luxury UI**: Black styling sheets, gilded accents, and responsive columns.
- **Auto-Assign Email Pipeline**: A step-by-step progress trace showing raw email parsed by EmailReceiverAgent -> analyzed by TriageAgent -> searched via RAGAgent -> assigned by AllocationAgent.
- **Working Vector DB**: A fully functioning Cosine Similarity text matcher in Python.
- **Resolution Center**: Panel for operators to select active tickets, submit fixes, and upsert them to the RAG database.

### Phase 2: Orchestrated Remediation
- **Auto-remendation checks**: Interfacing with mock webhooks to auto-reboot servers or database connections based on confidence ratings.
- **Index Editing UI**: Dashboard views allowing users to directly inspect, delete, or re-run TF-IDF calculations on the vector database contents.

---

## Core Milestone Metrics
1. **RAG Search Quality**: Retrieve correct historical solutions for matching categories with cosine score > 0.6.
2. **Ingestion Speed**: Completes the multi-agent receiver loop and adds synced items to the queue in under 2 seconds.
3. **Responsive Stack**: 100% viewport flexibility down to mobile width (420px).
