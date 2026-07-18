# PulseOps AI - Codebase Explanation (Refactored)

This guide documents the implementation details of each codebase component.

---

## 1. Python Backend Codebase

### `backend/database/store.py`
- **`ChromaVectorDB`**: Implements ChromaDB persistent client.
  - `upsert(doc_id, title, content, category, remediation, rca)`: Inserts document values and metadata, overwriting if doc_id exists.
  - `query(query_text, top_k, category_filter)`: Queries embeddings with optional where clauses for category filtering.
- **`MemoryDatabase`**: Integrates in-memory lists representing active incidents, active engineers, and the `ChromaVectorDB` instance.

### `backend/agents/`
- **`email_agent.py`**: Contains `EmailReceiverAgent`. Tokenizes raw mail bodies to extract subjects, summaries, and category flags.
- **`triage_agent.py`**: Contains `TriageAgent`. Evaluates risk markers and returns priority scores and target SLA limits.
- **`rag_agent.py`**: Contains `RAGAgent`. Connects the coordinator to the `ChromaVectorDB` instance. Handles queries and inserts resolved incidents.
- **`allocation_agent.py`**: Contains `AllocationAgent`. Computes matches comparing workloads, capabilities, and reliability ratings.
- **`orchestrator.py`**: Contains `AgenticOrchestrator`. Supervisor pipeline execution: Email parse $\to$ Triage $\to$ Vector RAG match $\to$ Assigner. Saves the parsed alert structure to the index.

### `backend/main.py`
- Exposes API endpoints:
  - `POST /api/email-simulation`: Trigger pipeline for raw emails.
  - `POST /api/resolve`: Handles resolution notes and updates vector documents.
  - `GET /api/state`: Returns incidents, engineers, KB, and stats.
  - `POST /api/metrics/tick`: Ticks telemetry values.

---

## 2. Javascript Frontend Codebase

### `js/app.js`
- **`switchView(target)`**: Snappy tab toggler swapping active DOM sections.
- **Email simulator**: Binds click listeners to run simulation step highlights (`Parser` $\to$ `Triage` $\to$ `RAG Match` $\to$ `Assigner`) before submitting payloads.
- **Resolution submission**: Binds form submits to POST solution notes to the backend. Logs step-by-step pipeline trace statements directly to the UI logs terminal.
- **Vector DB Visualizer**: Renders the current contents of the `ChromaVectorDB` index onto cards dynamically.
