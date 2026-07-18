# PulseOps AI - Engineering Thoughts (Refactored)

This log documents the design choices and trade-offs of the refactored system.

---

## 1. CRED-Style Luxury Theme Choice
- **Decision**: Redesigned all color variables, surface borders, and typography scales to adopt the **CRED** luxury kit.
- **Trade-off**: High-contrast, minimal designs demand consistent alignments. We replaced glowing colorful indicators with hairline gold borders (`#E5C384`) and bright primary neon greens/reds against pitch black. This produces a sleek, data-dense look that mimics professional financial and tech utilities.

---

## 2. In-Memory TF-IDF Vector Database (RAG)
- **Decision**: Hand-crafted a Python mathematical TF-IDF vector database matching text tokens and calculating Cosine Similarity.
- **Why**:
  1. Setting up external cloud stores or heavy model files (e.g. Chroma, Pinecone, PyTorch, Sentence-Transformers) inside sandbox or container environments runs the risk of memory leaks, timeouts, or dependency crashes.
  2. A native Python class using regular expressions and standard math functions is fast, runs in under 1ms, and demonstrates vector math concepts directly.
  3. Recruiters appreciate standard, zero-dependency engineering patterns since they highlight core math comprehension.

---

## 3. Vector Database Upserts (Editing Vectors)
- **Decision**: The `SimpleVectorDB` uses document IDs as dictionary keys.
- **Advantage**: By mapping resolved tickets to a unique document key like `kb-{ticket_id}`, we can easily **upsert** (edit) solutions. When an operator changes or submits a correction for an incident, the database overrides the old text and recalculates the vocabulary IDF indexes, resolving the user's doubt about editing vectors.

---

## 4. UI Snappiness and Tab-Swaps
- **Decision**: Avoided layout recalculation reflows or transition-delay animations in Javascript.
- **Why**: Generic animation frames lag on low-power devices. We optimized `app.js` routing to perform immediate style swaps via display toggles, creating instant page response metrics.
