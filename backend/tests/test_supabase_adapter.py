import pytest
import httpx
from unittest.mock import MagicMock, patch
from postgrest.exceptions import APIError
from app.infrastructure.supabase_adapter import SupabaseAdapter

@pytest.fixture
def mock_supabase_client():
    with patch('app.infrastructure.supabase_adapter.create_client') as mock_create:
        mock_client = MagicMock()
        mock_create.return_value = mock_client
        yield mock_client

@pytest.fixture
def adapter(mock_supabase_client):
    return SupabaseAdapter("http://localhost", "dummy_key", max_retries=3)

def test_retry_on_network_error(adapter, mock_supabase_client):
    # Mock the execute method to raise ConnectError twice, then succeed
    mock_execute = MagicMock(side_effect=[
        httpx.ConnectError("Connection refused"),
        httpx.ConnectError("Connection refused"),
        MagicMock(data=[{"id": "doc-1"}])
    ])
    
    mock_supabase_client.table().insert().execute = mock_execute
    
    result = adapter.create_document({"box_id": "b1", "filename": "test.txt", "file_hash": "hash", "status": "processing"})
    
    assert result == "doc-1"
    assert mock_execute.call_count == 3

def test_retry_on_api_error_429(adapter, mock_supabase_client):
    # Mock the execute method to raise APIError with rate limit, then succeed
    mock_execute = MagicMock(side_effect=[
        APIError({"message": "Rate limit exceeded", "code": "429"}),
        MagicMock(data=[{"id": "doc-2"}])
    ])
    
    mock_supabase_client.table().insert().execute = mock_execute
    
    result = adapter.create_document({"box_id": "b1", "filename": "test.txt", "file_hash": "hash", "status": "processing"})
    
    assert result == "doc-2"
    assert mock_execute.call_count == 2

def test_retry_on_api_error_502(adapter, mock_supabase_client):
    # Mock the execute method to raise APIError with 502 message, then succeed
    mock_execute = MagicMock(side_effect=[
        APIError({"message": "502 Bad Gateway"}),
        MagicMock(data=[{"id": "doc-3"}])
    ])
    
    mock_supabase_client.table().insert().execute = mock_execute
    
    result = adapter.create_document({"box_id": "b1", "filename": "test.txt", "file_hash": "hash", "status": "processing"})
    
    assert result == "doc-3"
    assert mock_execute.call_count == 2

def test_no_retry_on_permanent_api_error_400(adapter, mock_supabase_client):
    # Mock the execute method to raise APIError with a permanent error (e.g. 400 Bad Request)
    mock_execute = MagicMock(side_effect=APIError({"message": "invalid input syntax for type uuid", "code": "22P02"}))
    
    mock_supabase_client.table().insert().execute = mock_execute
    
    with pytest.raises(APIError) as exc_info:
        adapter.create_document({"box_id": "b1", "filename": "test.txt", "file_hash": "hash", "status": "processing"})
        
    assert "invalid input syntax" in str(exc_info.value)
    # Should only be called once, no retries for permanent errors
    assert mock_execute.call_count == 1

def test_successful_request_no_retry(adapter, mock_supabase_client):
    mock_execute = MagicMock(return_value=MagicMock(data=[{"id": "doc-4"}]))
    mock_supabase_client.table().insert().execute = mock_execute
    
    result = adapter.create_document({"box_id": "b1", "filename": "test.txt", "file_hash": "hash", "status": "processing"})
    
    assert result == "doc-4"
    assert mock_execute.call_count == 1

def test_client_uses_http1(mock_supabase_client):
    with patch('app.infrastructure.supabase_adapter.httpx.Client') as mock_http_client, \
         patch('app.infrastructure.supabase_adapter.create_client') as mock_create:
        SupabaseAdapter("http://localhost", "dummy_key")

    assert mock_http_client.call_args.kwargs["http2"] is False
    assert mock_create.call_args.kwargs["options"].httpx_client is mock_http_client.return_value

def test_box_access_check_retries_server_disconnect(adapter, mock_supabase_client):
    mock_execute = MagicMock(side_effect=[
        httpx.RemoteProtocolError("Server disconnected"),
        MagicMock(data=[{"id": "box-1"}]),
    ])
    mock_supabase_client.table().select().eq().eq().execute = mock_execute

    assert adapter.get_box_for_user("box-1", "user-1") == {"id": "box-1"}
    assert mock_execute.call_count == 2

def test_box_access_check_returns_none_for_foreign_box(adapter, mock_supabase_client):
    mock_supabase_client.table().select().eq().eq().execute.return_value = MagicMock(data=[])
    assert adapter.get_box_for_user("box-1", "intruder") is None

def test_auth_user_lookup_retries_connection_reset(adapter, mock_supabase_client):
    user_resp = MagicMock()
    mock_supabase_client.auth.get_user.side_effect = [httpx.ReadError("connection reset"), user_resp]

    assert adapter.get_auth_user("token") is user_resp
    assert mock_supabase_client.auth.get_user.call_count == 2
