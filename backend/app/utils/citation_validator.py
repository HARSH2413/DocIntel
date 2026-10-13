import re

def split_into_sentences(text: str) -> list[str]:
    """
    Robustly split text into sentences while ignoring common abbreviations and decimals.
    Handles Dr., Mr., Mrs., Ms., Prof., Rs., No., e.g., i.e., vs., list markers (1., a.), and decimals (3.5).
    """
    # A regex to match sentence boundaries without breaking on abbreviations.
    # It looks for ending punctuation (.?!) followed by whitespace and a capital letter,
    # making sure it's not preceded by a known abbreviation or a single letter/digit (list markers).
    # Using a simpler but robust approach:
    
    # 1. Temporarily replace dots in known abbreviations/decimals/initials with a special token
    abbrevs = [
        r'(?i)\b(dr)\.', r'(?i)\b(mr)\.', r'(?i)\b(mrs)\.', r'(?i)\b(ms)\.', r'(?i)\b(prof)\.', 
        r'(?i)\b(rs)\.', r'(?i)\b(no)\.', r'(?i)\b(e\.g)\.', r'(?i)\b(i\.e)\.', r'(?i)\b(vs)\.',
        r'(?i)\b(etc)\.', r'(?i)\b(et al)\.', r'(?i)\b(vol)\.', r'(?i)\b(fig)\.',
        r'(?i)\b([a-z])\.'  # Single letter initials like M. in M. Puri
    ]
    
    # Temporarily hide decimals (e.g. 3.5) and list numbers (e.g. 1. )
    text = re.sub(r'(\d)\.(\d)', r'\1<DOT>\2', text)
    
    # Temporarily hide list markers (e.g., "1. ", "a. ", "(1) ") 
    # Actually, if a list marker is at the start of a line, we don't want it to break the PREVIOUS sentence incorrectly,
    # but the previous sentence ended with a period. The period before the list marker is fine to split on.
    
    for abbrev in abbrevs:
        text = re.sub(abbrev, lambda m: m.group(0).replace('.', '<DOT>'), text)
        
    # Split on period, question mark, or exclamation mark followed by whitespace and capital letter
    # Or followed by a newline.
    sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z0-9\-\*\[])', text)
    
    # Restore the dots
    cleaned_sentences = []
    for s in sentences:
        restored = s.replace('<DOT>', '.')
        # Strip whitespace
        restored = restored.strip()
        if restored:
            cleaned_sentences.append(restored)
            
    return cleaned_sentences

def extract_normalized_numbers(text: str) -> set[str]:
    """
    Extracts numbers, dates, and percentages from text and normalizes them for comparison.
    - Strips commas (1,50,000 -> 150000)
    - Treats '15%' and '15 percent' identically (extracts '15')
    - Ignores small standalone numbers likely to be list markers or fractions like 1/2.
    """
    # Normalize percent
    text_lower = text.lower().replace(" percent", "%")
    
    # Remove commas in numbers
    text_nocomma = re.sub(r'(\d),(\d)', r'\1\2', text_lower)
    # Run twice for things like 1,500,000
    text_nocomma = re.sub(r'(\d),(\d)', r'\1\2', text_nocomma)
    
    # Find all standalone numbers or percentages
    # We want to capture numbers even if attached to units like 3.5m
    matches = re.finditer(r'(\d+(?:\.\d+)?)', text_nocomma)
    
    normalized = set()
    for m in matches:
        num_str = m.group(1)
        # Check if there is a % sign shortly after
        pct_str = "%" if "%" in text_nocomma[m.end():m.end()+2] else ""
        
        val = float(num_str) if '.' in num_str else int(num_str)
        if isinstance(val, int) and val < 10 and not pct_str:
            continue
            
        normalized.add(str(val))
        
    return normalized

def is_factual_sentence(sentence: str) -> bool:
    """
    Skip non-factual sentences (greetings, 'I don't have enough...', headings).
    """
    s = sentence.strip()
    if not s:
        return False
    if s.startswith("#"):
        return False
    
    s_lower = s.lower()
    non_factual_starts = [
        "i don't have enough",
        "i do not have enough",
        "the provided documents do not",
        "based on the provided",
        "according to the documents",
        "hello",
        "here is the",
        "here are the",
    ]
    for start in non_factual_starts:
        if s_lower.startswith(start):
            return False
    # Disclosures of missing evidence ("The retrieved sections do not cover X") need no citation.
    if "retrieved sections" in s_lower:
        return False

    # Check if it has a verb (very crude heuristic: length > 3 words and not all caps)
    words = s.split()
    if len(words) < 4:
        return False

    return True


# ── Markdown-aware answer handling ──
# The citation firewall checks claims sentence by sentence. Answers are markdown, so they
# are parsed into lines first and rebuilt line by line: headings, lists and tables survive,
# and each table row is checked as a single claim.

_HEADING = re.compile(r"^\s{0,3}#{1,6}\s")
_TABLE_DIVIDER = re.compile(r"^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$")
_TABLE_ROW = re.compile(r"^\s*\|.*\|\s*$")
_LIST_ITEM = re.compile(r"^(\s*(?:[-*+]|\d{1,3}[.)])\s+)(.*)$")


def _heading_level(line: str) -> int:
    return len(line.strip()) - len(line.strip().lstrip("#"))


def _is_table_divider(line: str) -> bool:
    # A lone "---" is a horizontal rule, not a table divider; dividers always contain "|".
    return "|" in line and "-" in line and bool(_TABLE_DIVIDER.match(line))


class AnswerLine:
    """One markdown line. `units` are the claims checked by the firewall: the sentences of a
    paragraph or list item, or a whole table row. Structural lines have no units."""

    def __init__(self, kind: str, raw: str, prefix: str = "", units: list[str] | None = None):
        self.kind = kind  # blank | heading | table_header | table_divider | table_row | list | text
        self.raw = raw
        self.prefix = prefix
        self.units = units if units is not None else []

    def render(self) -> str:
        if self.kind in ("list", "text"):
            return self.prefix + " ".join(self.units)
        if self.kind == "table_row":
            return " ".join(self.units)
        return self.raw


def parse_answer_lines(text: str) -> list[AnswerLine]:
    raw_lines = text.split("\n")
    lines = []
    for i, raw in enumerate(raw_lines):
        stripped = raw.strip()
        next_line = raw_lines[i + 1] if i + 1 < len(raw_lines) else ""
        if not stripped:
            lines.append(AnswerLine("blank", raw))
        elif _HEADING.match(raw):
            lines.append(AnswerLine("heading", raw))
        elif _is_table_divider(raw):
            lines.append(AnswerLine("table_divider", raw))
        elif _TABLE_ROW.match(raw):
            kind = "table_header" if _is_table_divider(next_line) else "table_row"
            lines.append(AnswerLine(kind, raw, units=[raw.strip()] if kind == "table_row" else []))
        else:
            m = _LIST_ITEM.match(raw)
            if m:
                lines.append(AnswerLine("list", raw, m.group(1), split_into_sentences(m.group(2))))
            else:
                indent = raw[: len(raw) - len(raw.lstrip())]
                lines.append(AnswerLine("text", raw, indent, split_into_sentences(stripped)))
    return lines


def render_answer_lines(lines: list[AnswerLine], drop_emptied: bool = False) -> str:
    """Rebuild the answer. With drop_emptied (strict mode), content lines whose claims were all
    removed disappear, along with headings and table headers left with nothing under them."""
    kept = [l for l in lines if not (drop_emptied and l.kind in ("list", "text", "table_row") and not l.units)]

    if drop_emptied:
        # Tables first (a header and divider with no rows left), then headings: a heading is
        # empty when the next content is a heading of the same or a higher level, or nothing.
        tables = []
        for i, line in enumerate(kept):
            if line.kind == "table_header" and not (
                i + 2 < len(kept) and kept[i + 1].kind == "table_divider" and kept[i + 2].kind == "table_row"
            ):
                continue
            if line.kind == "table_divider" and (not tables or tables[-1].kind != "table_header"):
                continue
            tables.append(line)

        kept = []
        for i, line in enumerate(tables):
            if line.kind == "heading":
                following = next((l for l in tables[i + 1:] if l.kind != "blank"), None)
                if following is None or (
                    following.kind == "heading" and _heading_level(following.raw) <= _heading_level(line.raw)
                ):
                    continue
            kept.append(line)

    text = "\n".join(l.render() for l in kept)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def claim_text(unit: str) -> str:
    """Claim text for scoring: citation tags and table pipes removed."""
    return re.sub(r"\s+", " ", re.sub(r"\[E\d+\]", "", unit).replace("|", " ")).strip()


# Phrasings that claim the whole document lacks something. Retrieval only ever sees the
# top-ranked sections, so absence can't be confirmed; restate it as "not retrieved".
_ABSENCE_SUBJECT = re.compile(
    r"\b(?:the |these |this |provided |uploaded |given )*(?:documents?|sources?|files?|context|evidence|pdfs?|texts?)"
    r"\s+(?:do|does)\s+not\s+(mention|contain|include|state|specify|say|discuss|cover|provide|address|describe|explain)\b",
    re.I,
)
_ABSENCE_LOCATION = re.compile(
    r"\b((?:is|are)\s+not\s+(?:mentioned|stated|specified|provided|included|available|found|covered|discussed|described)"
    r"|no\s+(?:mention|information|details?|reference|data)\b[^.\n]{0,80}?)"
    r"\s+in\s+the\s+(?:provided\s+|uploaded\s+|given\s+)?(?:documents?|sources?|context|files?|evidence|pdfs?)\b",
    re.I,
)


def soften_absence_claims(text: str) -> str:
    def subject(m: re.Match) -> str:
        replacement = f"the retrieved sections do not {m.group(1).lower()}"
        return replacement[0].upper() + replacement[1:] if m.group(0)[0].isupper() else replacement

    text = _ABSENCE_SUBJECT.sub(subject, text)
    return _ABSENCE_LOCATION.sub(lambda m: f"{m.group(1)} in the retrieved sections", text)


_INTERNAL_HEADING = re.compile(
    r"^\s{0,3}(?:#{1,6}\s*|\*\*)\s*(?:internal\s+)?(?:checklist|quality check|final quality check|self[- ]check|"
    r"verification|reasoning|thought process|analysis notes)\b",
    re.I,
)


def strip_internal_sections(text: str) -> str:
    """Remove checklist/reasoning sections the model sometimes appends despite instructions."""
    out, skipping = [], False
    for line in text.split("\n"):
        if _INTERNAL_HEADING.match(line):
            skipping = True
            continue
        if skipping and _HEADING.match(line):
            skipping = False
        if not skipping:
            out.append(line)
    return "\n".join(out).strip()
