# PulseOps AI - Implementation Guide (Refactored)

## Technical Stack & Constraints
- **Core Engine**: Semantic HTML5 and Vanilla ES6 JavaScript modules.
- **Styling**: Vanilla CSS3 based on native variables (CRED premium dark mode theme).
- **Backend Service**: FastAPI server with uvicorn router running on Python 3.9+.
- **RAG & Vector DB**: ChromaDB persistent client with metadata pre-filtering and dynamic upserts.

---

## Folders & Modules layout

```text
OpsPilot/
├── index.html            # Main UI shell (CRED Styled)
├── planning.md           # Roadmap and planning
├── implementation.md     # This guide
├── design.md             # CRED Brand Kit specification
├── architecture.md       # Multi-agent coordination schemas
├── workflow.md           # Email ingestion & RAG pipelines
├── explanation.md        # Code functions explanation
├── thinking.md           # Engineering thought process logs
├── css/
│   ├── variables.css     # CRED Color palettes & tokens
│   ├── layout.css        # Dashboard Grids, Sidebars, drawers
│   ├── components.css    # Cards, pills, tables, simulation indicators
│   └── animations.css    # Transitions & pulses
├── js/
│   ├── data.js           # Frontend mock state fallback
│   ├── charts.js         # Custom SVG charts
│   ├── copilot.js        # NL command logic
│   ├── scheduler.js      # Simulation alarm intervals
│   └── app.js            # Controller connecting FastAPI backend
└── backend/
    ├── main.py           # FastAPI Web Router endpoints
    ├── database/
    │   └── store.py      # SimpleVectorDB & Memory state database
    └── agents/
        ├── email_agent.py      # Ingests & tokenizes raw alerts
        ├── triage_agent.py     # Priority and category assessor
        ├── allocation_agent.py # Operator scorer allocator
        ├── rag_agent.py        # Vector search & RAG indexer
        ├── copilot_agent.py    # Chat assistant evaluator
        └── orchestrator.py     # Master agent supervisor pipeline
```

---

## Startup Instructions
To run the full stack:

1. **Start FastAPI Backend (Port 8000)**:
   ```bash
   pip install -r backend/requirements.txt
   python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
   ```

2. **Start Static HTTP Frontend (Port 8080)**:
   ```bash
   python -m http.server 8080
   ```
   Open `http://localhost:8080` in your web browser.
