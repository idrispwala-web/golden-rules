# Docker parity checklist

Staging must equal production. Both machines run Linux; the only thing that
differs between local and production is `.env`.

- [ ] One `Dockerfile`, used locally and in production. No `Dockerfile.dev`.
- [ ] Base image pinned to a version, never `:latest`.
- [ ] Python: `uv` with a committed `uv.lock`; the image builds with `uv sync --frozen`.
- [ ] All configuration arrives through environment variables. No config baked into the image.
- [ ] `.gitattributes` contains `* text=auto eol=lf` so line endings cannot differ.
- [ ] CI builds the image and tags it. The VM pulls that tag — it never builds.
- [ ] Tests (and evals, for RAG or agent projects) pass in CI before deploy.
- [ ] A deploy is a tag change plus a pull. If it needs a manual step, write that step down here.
