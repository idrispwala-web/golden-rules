# evals

Each case is one YAML file in `cases/`:

```yaml
question: "What is the cut-off weight for air freight on the Mumbai route?"
# Use either must_contain (facts that have to appear) or expected (exact answer).
must_contain:
  - "45 kg"
  - "Mumbai"
# Optional: strings that must NOT appear.
must_not_contain:
  - "I don't know"
```

Run them with `pytest evals/`.

A case is added **before** the fix whenever a wrong answer is found in
production. The suite only earns its keep if it grows every time something breaks.
