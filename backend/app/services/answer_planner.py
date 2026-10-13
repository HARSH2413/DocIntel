"""
Answer Planner — rule-based question analysis that shapes the answer, not the retrieval stack.

Classifies the question type (so the prompt can ask for the right structure) and splits
multi-part questions into sub-questions (so each part gets its own evidence and the
model gets an explicit checklist). Pure functions: no LLM call, no I/O.
"""
import math
import re
from dataclasses import dataclass, field

# More parts than this multiplies retrieval latency for little gain.
MAX_ANSWER_PARTS = 4

_ASK_START = r"(?:what|how|why|when|where|who|which|whether|is|are|does|do|can|list|explain|describe|give|tell)\b"
_PRONOUNS = re.compile(r"\b(it|its|they|them|their|this|that|these|those)\b", re.I)
_STOPWORDS = {
    "what", "which", "when", "where", "who", "whom", "whose", "why", "how", "does", "do", "did",
    "is", "are", "was", "were", "the", "and", "for", "with", "from", "into", "about", "under",
    "explain", "describe", "list", "give", "tell", "detail", "details", "please", "also", "there",
    "this", "that", "these", "those", "their", "them", "they", "its", "can", "could", "should",
    "would", "will", "have", "has", "been", "being", "any", "all", "each", "some", "between",
}

FORMAT_GUIDES = {
    "factual": "Answer directly in one or two sentences, then add short supporting detail only if useful. No headings.",
    "definition": "Give the definition first, then its key characteristics as bullet points, then examples if the evidence has them.",
    "comparison": "Use a markdown table whose rows are the comparison criteria and whose columns are the items, "
                  "with a citation in every cell that states a fact. Follow with a one-line takeaway if the evidence supports it.",
    "process": "Present the steps as a numbered list in their logical order, one action per step.",
    "pros_cons": "Use two headings, Advantages and Disadvantages (or the source's own terms), with bullet points under each. "
                 "Add trade-offs only if the evidence states them.",
    "summary": "Cover the source's main ideas in its own order as short paragraphs or bullets, keeping key examples, "
               "conditions and qualifications.",
    "multi_part": "Use one numbered heading per requested part, in the order asked (e.g. '### 1. <part>').",
    "comprehensive": "Start with a one-sentence overview, then descriptive headings with grouped bullet points, "
                     "and end with a brief conclusion only if it adds something.",
}


@dataclass
class AnswerPlan:
    question_type: str
    parts: list[str] = field(default_factory=list)          # requested sub-questions / compared items
    retrieval_queries: list[str] = field(default_factory=list)  # one search per part, self-contained

    @property
    def is_multi_part(self) -> bool:
        return len(self.parts) > 1


def plan_answer(question: str) -> AnswerPlan:
    q = " ".join(question.split())
    q_lower = q.lower()

    items = _comparison_items(q)
    if items or re.search(r"\b(compare|comparison|versus|vs\.?|difference|differences|differ|contrast)\b", q_lower):
        parts = items[:MAX_ANSWER_PARTS]
        # Each compared item is its own search; anchoring items to each other would blur them.
        return AnswerPlan("comparison", parts, list(parts) if len(parts) > 1 else [])

    parts = _split_parts(q)[:MAX_ANSWER_PARTS]
    if len(parts) > 1:
        return AnswerPlan("multi_part", parts, _retrieval_queries(parts, q))

    if re.search(r"\b(advantages?|disadvantages?|pros and cons|benefits and (limitations|drawbacks|risks)|merits|demerits|drawbacks)\b", q_lower):
        question_type = "pros_cons"
    elif re.search(r"\b(steps?|procedure|process|workflow|stages?|how (do|does|to|can|should|is|are))\b", q_lower):
        question_type = "process"
    elif re.search(r"\b(summari[sz]e|summary|overview|key points|main points|gist|outline)\b", q_lower):
        question_type = "summary"
    elif re.search(r"\b(in detail|detailed|comprehensive|everything about|elaborate|all aspects|discuss|explain fully)\b", q_lower):
        question_type = "comprehensive"
    elif re.match(
        r"^(define|definition of|meaning of|what is meant by|explain the (term|concept|meaning)|what does .+ (mean|stand for)"
        r"|what (is|are) (a|an) [^?]{1,40}\??$)",
        q_lower,
    ):
        question_type = "definition"
    else:
        question_type = "factual"
    return AnswerPlan(question_type, [q])


def _comparison_items(q: str) -> list[str]:
    patterns = [
        r"\bdifferences? between (.+?) and (.+?)(?:[?.]|\s+(?:in terms of|regarding|with respect to)\b|$)",
        r"\bcompar(?:e|ison of|ison between)\s+(.+?)\s+(?:and|with|to|vs\.?|versus)\s+(.+?)(?:[?.]|\s+(?:in terms of|on|regarding|for|with respect to)\b|$)",
        r"^(?:what is |how does )?(.+?)\s+(?:vs\.?|versus)\s+(.+?)(?:[?.]|$)",
    ]
    for pattern in patterns:
        m = re.search(pattern, q, re.I)
        if m:
            # "A, B and C": the regex splits at the first "and", so split lists inside both groups
            items = [_clean_part(x) for g in m.groups() for x in re.split(r",\s*|\s+and\s+", g)]
            return [i for i in items if i]
    return []


def _split_parts(q: str) -> list[str]:
    # Explicit enumeration: "1) ... 2) ...", "1. ... 2. ...", "(a) ... (b) ..."
    enumerated = re.split(r"(?:^|\s)(?:\(?[0-9]{1,2}[.)]|\(?[a-hA-H]\))\s+", q)
    enumerated = [_clean_part(p) for p in enumerated if _is_substantive(p)]
    if len(enumerated) > 1:
        return enumerated

    # Several questions in one message.
    questions = [_clean_part(p) for p in re.split(r"\?\s*", q) if _is_substantive(p)]
    if len(questions) > 1:
        return questions

    # One sentence joining separate asks: "What is X, how is it approved, and who signs it".
    joined = re.split(
        rf"[;,]?\s+(?:and|also|as well as)\s+(?={_ASK_START})|[;,]\s+(?={_ASK_START})",
        q, flags=re.I,
    )
    joined = [_clean_part(p) for p in joined if _is_substantive(p)]
    # Only a split where every piece reads as a question; otherwise "In case of resignation,
    # what is the notice period" would become two parts.
    if len(joined) > 1 and all(re.match(_ASK_START, p, re.I) for p in joined):
        return joined
    return [q]


def _retrieval_queries(parts: list[str], question: str) -> list[str]:
    """A part like 'how is it approved' is a poor search on its own; anchor it to the first part."""
    queries = []
    for i, part in enumerate(parts):
        if i > 0 and (_PRONOUNS.search(part) or len(part.split()) < 3):
            part = f"{parts[0]} {part}"
        queries.append(part)
    return queries


def part_is_covered(part: str, answer: str) -> bool:
    """Crude coverage check: most (60%) of the part's content words appear in the answer.

    Words are matched on a 5-letter prefix so inflections count ("approved" ~ "approval",
    "policy" ~ "policies"). A disclosure line naming the part also counts as covering it.
    """
    terms = {w for w in re.findall(r"[a-z0-9]{4,}", part.lower()) if w not in _STOPWORDS}
    if not terms:
        return True
    answer_lower = answer.lower()
    hits = sum(1 for t in terms if t[:5] in answer_lower)
    return hits >= math.ceil(len(terms) * 0.6)


def _clean_part(text: str) -> str:
    return text.strip(" ,;:.?!").strip()


def _is_substantive(text: str) -> bool:
    return len(_clean_part(text).split()) >= 2
