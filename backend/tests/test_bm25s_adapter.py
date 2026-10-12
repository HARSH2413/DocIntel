from types import SimpleNamespace

import pytest

from app.infrastructure.bm25s_adapter import BM25SAdapter


class FakeQuery:
    """Minimal stand-in for the PostgREST builder chain the adapter uses."""

    def __init__(self, db: "FakeChunkDB"):
        self.db = db
        self.counted = False
        self.window = None
        self.limit_n = None

    def select(self, _columns, count=None):
        self.counted = count == "exact"
        return self

    def eq(self, *_args):
        return self

    def order(self, *_args, **_kwargs):
        return self

    def limit(self, n):
        self.limit_n = n
        return self

    def range(self, start, end):
        self.window = (start, end)
        return self

    def execute(self):
        self.db.calls += 1
        rows = self.db.rows
        if self.window is not None:
            start, end = self.window
            data = rows[start:min(end + 1, start + self.db.server_max_rows)]
        else:
            newest_first = sorted(rows, key=lambda r: r["created_at"], reverse=True)
            data = newest_first[: self.limit_n] if self.limit_n else newest_first
        return SimpleNamespace(data=data, count=len(rows) if self.counted else None)


class FakeChunkDB:
    def __init__(self, contents, server_max_rows=1000):
        self.server_max_rows = server_max_rows
        self.calls = 0
        self.rows = []
        self.set_contents(contents)
        self.client = SimpleNamespace(table=lambda _name: FakeQuery(self))

    def set_contents(self, contents):
        self.rows = [
            {"id": f"c{i:06d}", "document_id": f"doc{i}", "chunk_index": 0, "content": text,
             "created_at": f"2026-10-11T00:00:{i % 60:02d}.{i:06d}", "documents": {"filename": f"file{i}.txt"}}
            for i, text in enumerate(contents)
        ]


@pytest.fixture
def adapter(tmp_path):
    return BM25SAdapter(data_dir=str(tmp_path / "bm25"), freshness_seconds=0)


def test_build_and_search(adapter):
    db = FakeChunkDB([
        "The quick brown fox jumps over the lazy dog",
        "Fast brown foxes leap across sleepy dogs",
        "A completely unrelated document about quantum physics",
    ])
    adapter.ensure_box_index("box", db)

    results = adapter.search("brown fox", "box", limit=2)
    assert len(results) == 2
    assert "fox" in results[0]["content"].lower()
    assert adapter.search("quantum physics", "box", limit=1)[0]["filename"] == "file2.txt"


def test_index_includes_every_page_beyond_server_row_cap(adapter):
    # 2,503 chunks against a server that returns at most 1,000 rows per request.
    db = FakeChunkDB([f"filler text number {i}" for i in range(2502)] + ["zebra migration policy"])
    adapter.ensure_box_index("box", db)
    assert len(adapter.metadata_cache["box"]) == 2503
    assert adapter.search("zebra", "box", limit=1)[0]["content"] == "zebra migration policy"


def test_pagination_survives_a_lower_server_cap(adapter):
    db = FakeChunkDB([f"chunk {i}" for i in range(1200)] + ["needle"], server_max_rows=500)
    adapter.ensure_box_index("box", db)
    assert len(adapter.metadata_cache["box"]) == 1201


def test_stemming_matches_plural_and_singular(adapter):
    db = FakeChunkDB([
        "Leave policy allows twenty days of paid leave per year.",
        "Expense policies require receipts within 30 days.",
    ])
    adapter.ensure_box_index("box", db)
    results = adapter.search("expense policy", "box", limit=2)
    # Both words now match the expense chunk, so it clearly outranks the leave chunk.
    assert results[0]["content"].startswith("Expense policies")
    assert len(results) == 1 or results[0]["lexical_score"] > results[1]["lexical_score"]


def test_stale_index_rebuilds_when_db_changes_elsewhere(adapter):
    db = FakeChunkDB(["alpha content"])
    adapter.ensure_box_index("box", db)
    assert adapter.search("beta", "box") == []

    # Another process (worker / re-ingest script) changes the box; no invalidate_box() here.
    db.set_contents(["alpha content", "beta content"])
    adapter.ensure_box_index("box", db)
    assert adapter.search("beta", "box")[0]["content"] == "beta content"


def test_fresh_index_is_not_rebuilt(tmp_path):
    adapter = BM25SAdapter(data_dir=str(tmp_path / "bm25"), freshness_seconds=0)
    db = FakeChunkDB(["alpha content"])
    adapter.ensure_box_index("box", db)
    calls_after_build = db.calls
    adapter.ensure_box_index("box", db)
    assert db.calls == calls_after_build + 1  # only the cheap fingerprint query


def test_freshness_check_is_throttled(tmp_path):
    adapter = BM25SAdapter(data_dir=str(tmp_path / "bm25"), freshness_seconds=3600)
    db = FakeChunkDB(["alpha content"])
    adapter.ensure_box_index("box", db)
    calls = db.calls
    adapter.ensure_box_index("box", db)
    assert db.calls == calls  # within the window: no DB round-trip at all


def test_invalidate_drops_index(adapter):
    db = FakeChunkDB(["test document"])
    adapter.ensure_box_index("box", db)
    adapter.invalidate_box("box")
    assert "box" not in adapter.indexes
    assert adapter.search("test", "box") == []


def test_nothing_is_written_to_disk_and_legacy_copies_are_removed(tmp_path):
    legacy = tmp_path / "bm25" / "old-box"
    legacy.mkdir(parents=True)
    (legacy / "metadata.json").write_text('[{"content": "secret plaintext"}]')

    adapter = BM25SAdapter(data_dir=str(tmp_path / "bm25"), freshness_seconds=0)
    adapter.ensure_box_index("box", FakeChunkDB(["some content"]))
    assert not (tmp_path / "bm25").exists()
