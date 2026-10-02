"""Eval runner stub.

Point `answer()` at the project's real pipeline, then `pytest evals/`.
"""
from pathlib import Path

import pytest
import yaml

CASES = sorted((Path(__file__).parent / "cases").glob("*.yaml"))


def answer(question: str) -> str:
    """Replace this with a call into the project's RAG/agent pipeline."""
    raise NotImplementedError("wire answer() to the pipeline before running evals")


@pytest.mark.parametrize("case_path", CASES, ids=lambda p: p.stem)
def test_case(case_path):
    case = yaml.safe_load(case_path.read_text())
    got = answer(case["question"])

    if "expected" in case:
        assert got.strip() == case["expected"].strip()

    for fact in case.get("must_contain", []):
        assert fact.lower() in got.lower(), f"missing {fact!r} in: {got[:200]}"

    for banned in case.get("must_not_contain", []):
        assert banned.lower() not in got.lower(), f"found banned {banned!r}"
