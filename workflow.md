# PulseOps AI - System Workflows (Refactored)

This document outlines active user and system workflows.

---

## 1. Simulated Email Ingestion Flow

The live alarm simulation runs in a step-by-step progress trace (triggered from the Dashboard):

```text
[Click "Trigger Alert Email"]
             │
             ▼
1. Parser Step: Highlighting Receiver Agent parsing email text.
             │
             ▼
2. Triage Step: Highlighting TriageAgent assessing priority weights.
             │
             ▼
3. RAG Match Step: Highlighting RAGAgent querying Cosine Similarity database.
             │
             ▼
4. Assigner Step: Highlighting AllocationAgent assigning engineer.
             │
             ▼
[State Synced: Ticket appended to worklist, Copilot announces ingestion]
```

---

## 2. Employee Solution Submission & RAG Indexing Flow

When an SRE submits a resolution to update the knowledge base:

1. **Access Center**: Navigate to **Submit Resolution** tab.
2. **Select Issue**: Choose an active ticket from the dropdown (loaded dynamically).
3. **Form Entry**: Provide Root Cause Analysis (RCA) and the Remediation solution notes.
4. **Ingestion Trigger**: Click **Submit Solution**.
5. **Ingestion Pipeline Execution**:
   - Call FastAPI `/api/resolve`.
   - The endpoint transitions ticket state to `Resolved`.
   - The handler invokes the `RAGAgent` to index the solution text.
   - The Vector DB upserts the document.
   - The terminal console logs the step-by-step execution metrics in green:
     `> [TRIGGER] Resolving ticket #101...`
     `> [RAG INDEXER] Tokenizing content...`
     `> [SimpleVectorDB] Upserting document ID "kb-101"...`
     `> [SUCCESS] Synced. Vector DB rebuilt vocabulary.`
6. **State Refresh**: The front-end fetches the updated database content and updates the active RAG list under the **RAG Vector Index** tab.
