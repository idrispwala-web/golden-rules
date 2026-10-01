
## Agents and RAG

**No change to prompts, retrieval or chunking is done until `evals/` passes.**
That is the whole rule. A change that improves one question and quietly breaks
four others is a regression, and only the evals will tell you which it was.

- Add an eval case for every bug found in production, before fixing it.
- Record in the brain why a prompt or chunking strategy is the way it is, so the
  next change starts from the reason and not from scratch.
