"""Security regression tests: tenant isolation at the API layer, upload hardening,
cache invalidation, rate-limit keys, headers, and quotas.

The backend talks to Supabase with the service-role key, so RLS does not protect
these routes — the per-route ownership checks are the isolation boundary. These
tests pin that every box-scoped route refuses a box the caller does not own and
never reaches the service layer when it does.
"""
import base64
import io
import json
import zipfile
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

import main
from app.api import upload as upload_api
from app.core.auth import UserContext, get_current_user
from app.core.cache import QueryResultCache
from app.core.config import settings
from app.core.dependencies import get_box_service, get_chat_service, get_ingestion_service
from app.core.rate_limiter import user_or_ip_key
from app.services.ingestion_service import PartialIngestionError, UserFacingIngestionError

FOREIGN = HTTPException(status_code=404, detail="Box not found or unauthorized")

chat_service = MagicMock()
ingestion_service = MagicMock()
box_service = MagicMock()


@pytest.fixture(autouse=True)
def wired_app():
    for m in (chat_service, ingestion_service, box_service):
        m.reset_mock(return_value=True, side_effect=True)
    ingestion_service.db.count_documents.return_value = 0
    box_service.count_boxes.return_value = 0
    main.app.dependency_overrides.update({
        get_current_user: lambda: UserContext(user_id="attacker", email="a@example.com"),
        get_chat_service: lambda: chat_service,
        get_ingestion_service: lambda: ingestion_service,
        get_box_service: lambda: box_service,
    })
    yield
    main.app.dependency_overrides.clear()


client = TestClient(main.app, raise_server_exceptions=False)


def _deny_all_boxes():
    """Patch every module's ownership check to treat the box as someone else's."""
    return [patch(f"app.api.{mod}.verify_box_access", side_effect=FOREIGN)
            for mod in ("chat", "documents", "upload", "boxes")]


@pytest.mark.parametrize("method,url,kwargs", [
    ("get", "/api/v1/documents/?box_id=victim-box", {}),
    ("delete", "/api/v1/documents/doc-1?box_id=victim-box", {}),
    ("get", "/api/v1/chat/sessions?box_id=victim-box", {}),
    ("post", "/api/v1/chat/sessions", {"json": {"box_id": "victim-box"}}),
    ("get", "/api/v1/chat/sessions/s-1?box_id=victim-box", {}),
    ("patch", "/api/v1/chat/sessions/s-1?box_id=victim-box", {"json": {"title": "x"}}),
    ("delete", "/api/v1/chat/sessions/s-1?box_id=victim-box", {}),
    ("post", "/api/v1/chat/", {"json": {"question": "q", "box_id": "victim-box", "session_id": "s-1"}}),
    ("patch", "/api/v1/boxes/victim-box", {"json": {"name": "mine now"}}),
    ("delete", "/api/v1/boxes/victim-box", {}),
    ("post", "/api/v1/upload/box", {"data": {"box_id": "victim-box"},
                                     "files": {"file": ("a.txt", io.BytesIO(b"hello"), "text/plain")}}),
])
def test_foreign_box_is_rejected_before_any_service_call(method, url, kwargs):
    patches = _deny_all_boxes()
    for p in patches:
        p.start()
    try:
        response = getattr(client, method)(url, **kwargs)
    finally:
        for p in patches:
            p.stop()
    assert response.status_code == 404
    chat_service.ask_question.assert_not_called()
    chat_service.db.get_chat_history.assert_not_called()
    chat_service.db.delete_chat_session.assert_not_called()
    chat_service.db.rename_chat_session.assert_not_called()
    chat_service.db.create_chat_session.assert_not_called()
    ingestion_service.delete_document.assert_not_called()
    ingestion_service.db.create_document.assert_not_called()
    ingestion_service.db.get_document_metadata.assert_not_called()
    box_service.update_box.assert_not_called()
    box_service.delete_box.assert_not_called()


def test_get_box_is_scoped_to_caller():
    box_service.get_box.return_value = None
    assert client.get("/api/v1/boxes/victim-box").status_code == 404
    box_service.get_box.assert_called_once_with(box_id="victim-box", user_id="attacker")


@patch("app.api.chat.verify_box_access", return_value={"id": "my-box"})
def test_session_from_another_box_is_rejected(_verify):
    chat_service.db.session_belongs_to_box.return_value = False
    r = client.get("/api/v1/chat/sessions/victim-session?box_id=my-box")
    assert r.status_code == 404
    chat_service.db.get_chat_history.assert_not_called()

    r = client.post("/api/v1/chat/", json={"question": "q", "box_id": "my-box", "session_id": "victim-session"})
    assert r.status_code == 404
    chat_service.ask_question.assert_not_called()


def test_question_length_is_capped():
    r = client.post("/api/v1/chat/", json={"question": "x" * (settings.MAX_QUESTION_CHARS + 1),
                                           "box_id": "b", "session_id": "s"})
    assert r.status_code == 422


def test_box_quota_enforced():
    box_service.count_boxes.return_value = settings.MAX_BOXES_PER_USER
    r = client.post("/api/v1/boxes/", json={"name": "one too many"})
    assert r.status_code == 403
    box_service.create_box.assert_not_called()


@patch("app.api.upload.verify_box_access", return_value={"id": "my-box"})
def test_document_quota_enforced(_verify):
    ingestion_service.db.count_documents.return_value = settings.MAX_DOCUMENTS_PER_BOX
    r = client.post("/api/v1/upload/box", data={"box_id": "my-box"},
                    files={"file": ("a.txt", io.BytesIO(b"hello"), "text/plain")})
    assert r.status_code == 403
    ingestion_service.db.create_document.assert_not_called()


@patch("app.api.upload.verify_box_access", return_value={"id": "my-box"})
def test_upload_backpressure_returns_429(_verify, monkeypatch):
    monkeypatch.setattr(upload_api, "_pending_ingestions", settings.MAX_PENDING_INGESTIONS)
    r = client.post("/api/v1/upload/box", data={"box_id": "my-box"},
                    files={"file": ("a.txt", io.BytesIO(b"hello"), "text/plain")})
    assert r.status_code == 429


def test_oversized_upload_rejected_before_body_is_read(monkeypatch):
    monkeypatch.setattr(main, "_UPLOAD_BODY_LIMIT", 10)
    r = client.post("/api/v1/upload/box", data={"box_id": "b"},
                    files={"file": ("a.txt", io.BytesIO(b"x" * 100), "text/plain")})
    assert r.status_code == 413
    ingestion_service.db.count_documents.assert_not_called()


# ── File content validation ──

def _zip_bytes(members: dict[str, bytes]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, data in members.items():
            zf.writestr(name, data)
    return buf.getvalue()


@pytest.mark.parametrize("ext,content,status", [
    (".pdf", b"MZ\x90\x00 not a pdf", 415),
    (".docx", b"plain text pretending to be docx", 415),
    (".docx", None, 415),             # zip without word/
    (".txt", b"abc\x00\x01binary", 415),
])
def test_content_mismatch_rejected(tmp_path, ext, content, status):
    if content is None:
        content = _zip_bytes({"evil/payload.bin": b"x"})
    path = tmp_path / f"f{ext}"
    path.write_bytes(content)
    with pytest.raises(HTTPException) as exc:
        upload_api._validate_file_content(str(path), ext)
    assert exc.value.status_code == status


def test_zip_bomb_rejected(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "MAX_UNCOMPRESSED_UPLOAD_MB", 1)
    path = tmp_path / "bomb.xlsx"
    path.write_bytes(_zip_bytes({"xl/workbook.xml": b"0" * (2 * 1024 * 1024)}))  # tiny compressed, 2 MB unpacked
    with pytest.raises(HTTPException) as exc:
        upload_api._validate_file_content(str(path), ".xlsx")
    assert exc.value.status_code == 413


@pytest.mark.parametrize("ext,content", [
    (".pdf", b"%PDF-1.7\n..."),
    (".docx", None),
    (".txt", "héllo".encode("utf-16")),  # BOM-prefixed UTF-16 stays allowed
    (".csv", b"a,b\n1,2\n"),
])
def test_valid_content_accepted(tmp_path, ext, content):
    if content is None:
        content = _zip_bytes({"word/document.xml": b"<w:document/>", "[Content_Types].xml": b"<Types/>"})
    path = tmp_path / f"ok{ext}"
    path.write_bytes(content)
    upload_api._validate_file_content(str(path), ext)  # does not raise


def test_ingestion_errors_shown_to_users_are_sanitised():
    assert upload_api._user_safe_error(UserFacingIngestionError("No extractable text")) == "No extractable text"
    assert "could not be processed" in upload_api._user_safe_error(PartialIngestionError("batch 3: APIError 23505 ..."))
    internal = upload_api._user_safe_error(RuntimeError("connection to db.internal:5432 refused"))
    assert "5432" not in internal and "internal" not in internal


# ── Cache, rate-limit key, headers, docs ──

def test_deleting_a_document_invalidates_that_boxs_cached_answers():
    cache = QueryResultCache(max_size=10, ttl=60)
    cache.set_query_result("what is the policy?", "box-a", ["stale chunk"])
    cache.set_query_result("what is the policy?", "box-b", ["other box"])
    cache.invalidate_box("box-a")
    assert cache.get_query_result("what is the policy?", "box-a") is None
    assert cache.get_query_result("what is the policy?", "box-b") == ["other box"]


def _request_with(headers: dict):
    req = MagicMock()
    req.headers = headers
    req.client.host = "203.0.113.7"
    return req


def test_rate_limit_key_is_per_user_not_per_ip():
    payload = base64.urlsafe_b64encode(json.dumps({"sub": "user-123"}).encode()).decode().rstrip("=")
    token = f"eyJhbGciOiJIUzI1NiJ9.{payload}.sig"
    assert user_or_ip_key(_request_with({"authorization": f"Bearer {token}"})) == "user:user-123"
    assert user_or_ip_key(_request_with({"authorization": "Bearer garbage"})).startswith("token:")
    assert user_or_ip_key(_request_with({})).startswith("ip:")


def test_security_headers_present():
    r = client.get("/")
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["X-Frame-Options"] == "DENY"
    assert r.headers["Cache-Control"] == "no-store"
    assert "default-src 'none'" in r.headers["Content-Security-Policy"]


def test_api_docs_disabled_by_default():
    if settings.ENABLE_API_DOCS:
        pytest.skip("ENABLE_API_DOCS is turned on in this environment")
    assert client.get("/docs").status_code == 404
    assert client.get("/openapi.json").status_code == 404
