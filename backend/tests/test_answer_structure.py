"""Answers keep their markdown structure, cover every requested part, and never claim absence."""
from unittest.mock import MagicMock, patch

import pytest

from app.services.answer_planner import MAX_ANSWER_PARTS, part_is_covered, plan_answer
from app.services.chat_service import ChatService
from app.utils.citation_validator import parse_answer_lines, soften_absence_claims, strip_internal_sections


# ── Question planning ──

@pytest.mark.parametrize("question, expected", [
    ("What is the notice period?", "factual"),
    ("What is an NDA?", "definition"),
    ("What are the steps to apply for leave?", "process"),
    ("What are the advantages and disadvantages of remote work?", "pros_cons"),
    ("Summarize the travel policy", "summary"),
    ("Explain the appraisal policy in detail", "comprehensive"),
    ("What are the terms and conditions of employment?", "factual"),
])
def test_question_types(question, expected):
    assert plan_answer(question).question_type == expected


@pytest.mark.parametrize("question, items", [
    ("Compare casual leave and sick leave", ["casual leave", "sick leave"]),
    ("What is the difference between PF and gratuity?", ["PF", "gratuity"]),
    ("Gold plan vs Silver plan", ["Gold plan", "Silver plan"]),
    ("Compare the Gold, Silver and Bronze plans", ["the Gold", "Silver", "Bronze plans"]),
])
def test_comparison_items(question, items):
    plan = plan_answer(question)
    assert plan.question_type == "comparison"
    assert plan.parts == items


def test_joined_question_is_split_and_pronoun_part_is_anchored():
    plan = plan_answer("What is the leave policy and how is it approved?")
    assert plan.question_type == "multi_part"
    assert plan.parts == ["What is the leave policy", "how is it approved"]
    # "how is it approved" alone is a poor search; it is anchored to the first part
    assert plan.retrieval_queries[1] == "What is the leave policy how is it approved"


def test_comma_separated_asks_are_split_but_lead_in_clauses_are_not():
    plan = plan_answer("How many casual leave days do employees get, how is leave approved, and what is the maternity policy?")
    assert plan.parts == [
        "How many casual leave days do employees get", "how is leave approved", "what is the maternity policy"]
    assert plan_answer("In case of resignation, what is the notice period?").parts == [
        "In case of resignation, what is the notice period?"]


def test_enumerated_and_multiple_questions_are_split():
    # The one-word lead-in "Explain" is not a part of its own
    assert plan_answer("Explain 1) eligibility criteria 2) benefits offered").parts == [
        "eligibility criteria", "benefits offered"]
    assert plan_answer("What is the probation period? What is the notice period?").parts == [
        "What is the probation period", "What is the notice period"]


def test_parts_are_capped():
    question = " ".join(f"What is item number {i}?" for i in range(8))
    assert len(plan_answer(question).parts) == MAX_ANSWER_PARTS


def test_part_coverage():
    assert part_is_covered("how is leave approved", "Leave is approved by the manager [E1].")
    assert not part_is_covered("gratuity eligibility rules", "Leave is approved by the manager [E1].")


# ── Markdown-aware helpers ──

def test_parse_answer_lines_classifies_structure():
    answer = "### Leave\n- Casual leave is 12 days [E1].\n\n| Plan | Cover |\n|---|---|\n| Gold | Family [E2] |\n---"
    kinds = [line.kind for line in parse_answer_lines(answer)]
    assert kinds == ["heading", "list", "blank", "table_header", "table_divider", "table_row", "text"]


def test_absence_claims_become_not_retrieved():
    assert soften_absence_claims("The document does not mention bonuses.") == "The retrieved sections do not mention bonuses."
    assert soften_absence_claims("Gratuity is not mentioned in the provided documents.") == \
        "Gratuity is not mentioned in the retrieved sections."
    assert soften_absence_claims("There is no information about bonuses in the documents.") == \
        "There is no information about bonuses in the retrieved sections."


def test_internal_checklist_is_removed():
    answer = "Leave is 12 days [E1].\n\n### Checklist\n1. Answered? yes\n\n### Notes\nKept section."
    cleaned = strip_internal_sections(answer)
    assert "Checklist" not in cleaned and "Answered?" not in cleaned
    assert "### Notes\nKept section." in cleaned


# ── Citation firewall keeps structure ──

DOCS = [
    {"evidence_id": "[E1]", "document_id": "d1", "content": "Casual leave is 12 days per year."},
    {"evidence_id": "[E2]", "document_id": "d2", "content": "The Gold plan covers the whole family."},
]


def _service(score=0.9):
    reranker = MagicMock()
    reranker.score_pairs.side_effect = lambda pairs: [score for _ in pairs]
    return ChatService(db=MagicMock(), lexical_store=MagicMock(), embedder=MagicMock(), llm=MagicMock(),
                       reranker=reranker, retrieval_top_k=5, reranker_top_k=5)


def test_markdown_structure_survives_validation():
    answer = (
        "### Leave\n"
        "- Casual leave is 12 days per year [E1].\n\n"
        "### Insurance\n"
        "| Plan | Coverage |\n|---|---|\n| Gold | Covers the whole family [E2] |"
    )
    final, citations, unsupported, _ = _service()._validate_and_build_citations(answer, DOCS, "fallback")
    assert final == answer
    assert {c["evidence_id"] for c in citations} == {"[E1]", "[E2]"}
    assert unsupported == []


def test_uncited_table_row_is_flagged_but_header_is_not():
    answer = "| Plan | Coverage |\n|---|---|\n| Gold | Covers the whole family [E2] |\n| Silver | Employee only |"
    _, _, unsupported, _ = _service()._validate_and_build_citations(answer, DOCS, "fallback")
    assert unsupported == ["| Silver | Employee only |"]


@patch("app.core.config.settings")
def test_strict_mode_removes_claims_not_structure(mock_settings):
    mock_settings.CITATION_ENFORCEMENT_MODE = "strict"
    mock_settings.CITATION_SUPPORT_THRESHOLD = 0.3
    answer = (
        "### Leave\n"
        "- Casual leave is 12 days per year [E1].\n"
        "- Employees also get a free car every year.\n\n"
        "### Perks\n"
        "- Staff receive unlimited travel allowances.\n\n"
        "| Plan | Coverage |\n|---|---|\n| Silver | Employee only and dependants |"
    )
    final, *_ = _service()._validate_and_build_citations(answer, DOCS, "fallback")
    assert final == "### Leave\n- Casual leave is 12 days per year [E1]."


def test_disclosure_of_missing_part_needs_no_citation():
    answer = "Casual leave is 12 days per year [E1].\n\nThe retrieved sections do not cover the gratuity rules."
    _, _, unsupported, _ = _service()._validate_and_build_citations(answer, DOCS, "fallback")
    assert unsupported == []


# ── Multi-part retrieval and completeness retry ──

def _wired_service(llm_answers):
    service = _service()
    service.db.get_chat_history.return_value = []
    service.llm.chat_with_messages.side_effect = llm_answers
    service.evidence_engine = MagicMock()
    service.evidence_engine.get_doc_relevance_score.return_value = 0.9
    service.evidence_engine.filter_and_expand.side_effect = lambda docs: docs
    service.evidence_engine.assign_evidence_ids.side_effect = (
        lambda docs: [{**d, "evidence_id": f"[E{i}]"} for i, d in enumerate(docs, 1)])
    service.evidence_engine.build_context_text.return_value = "context"
    service.retrieval_engine = MagicMock()
    return service


def test_each_requested_part_gets_its_own_evidence():
    service = _wired_service(["The leave policy gives 12 days [E1]. Leave is approved by managers [E2]."])
    by_query = {
        "What is the leave policy and how is it approved?": [{"document_id": "a", "chunk_index": i} for i in range(5)],
        "What is the leave policy": [{"document_id": "a", "chunk_index": 0}, {"document_id": "b", "chunk_index": 0}],
        "What is the leave policy how is it approved": [{"document_id": "c", "chunk_index": 0}],
    }
    service.retrieval_engine.retrieve_documents.side_effect = lambda search_query, box_id: by_query[search_query]

    service.ask_question("What is the leave policy and how is it approved?", "box", "session")

    assert service.retrieval_engine.retrieve_documents.call_count == 3
    merged = service.evidence_engine.filter_and_expand.call_args_list[0].args[0]
    # Round-robin keeps the approval chunk even though the whole-question search filled five slots
    assert ("c", 0) in {(d["document_id"], d["chunk_index"]) for d in merged}
    prompt = service.llm.chat_with_messages.call_args_list[0].kwargs["messages"][0]["content"]
    assert "REQUESTED PARTS" in prompt and "1-3 short paragraphs" not in prompt


def test_missing_part_triggers_one_retry_and_better_answer_is_kept():
    service = _wired_service([
        "Leave is 12 days per year [E1].",
        "### 1. Leave policy\nLeave is 12 days per year [E1].\n\n### 2. Approval\nLeave is approved by the manager [E1].",
    ])
    service.retrieval_engine.retrieve_documents.return_value = [{"document_id": "a", "chunk_index": 0, "content": "x"}]

    res = service.ask_question("What is the leave policy and how is leave approved?", "box", "session")

    assert service.llm.chat_with_messages.call_count == 2
    assert "approved" in res["answer"] and "\n" in res["answer"]
    assert res["validation_metadata"]["retried"] is True


def test_uncited_retry_does_not_replace_the_original_answer():
    service = _wired_service(["Leave is 12 days per year [E1].", "Approval happens somehow, no citations here."])
    service.retrieval_engine.retrieve_documents.return_value = [{"document_id": "a", "chunk_index": 0, "content": "x"}]

    res = service.ask_question("What is the leave policy and how is leave approved?", "box", "session")

    assert res["answer"] == "Leave is 12 days per year [E1]."


def test_complete_answer_makes_no_extra_llm_call():
    service = _wired_service(["The notice period is 30 days [E1]."])
    service.retrieval_engine.retrieve_documents.return_value = [{"document_id": "a", "chunk_index": 0, "content": "x"}]

    service.ask_question("What is the notice period?", "box", "session")

    assert service.llm.chat_with_messages.call_count == 1
