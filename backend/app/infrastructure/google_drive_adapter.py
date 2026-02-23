import io
import os
from pathlib import Path
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

# This defines what our robot is allowed to do (Read-Only access)
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

# 🛡️ THE BULLETPROOF PATH FIX
# This file is in app/infrastructure/, so we tell Python to go up 3 folders to find the root backend folder
BASE_DIR = Path(__file__).resolve().parent.parent.parent
CREDENTIALS_FILE = os.path.join(BASE_DIR, 'google_credentials.json')

class GoogleDriveAdapter:
    def __init__(self):
        if not os.path.exists(CREDENTIALS_FILE):
            # Now it will print exactly where it is looking, so you can see if it's right!
            raise FileNotFoundError(f"Missing {CREDENTIALS_FILE} at path: {CREDENTIALS_FILE}")
        
        self.credentials = Credentials.from_service_account_file(CREDENTIALS_FILE, scopes=SCOPES)
        self.service = build('drive', 'v3', credentials=self.credentials)

    def get_files_in_folder(self, folder_id: str):
        # ... keep the rest of your methods exactly the same ...
        """Asks Google for a list of all files inside a specific folder."""
        # trashed = false ensures we don't download deleted files
        query = f"'{folder_id}' in parents and trashed = false"
        results = self.service.files().list(
            q=query, spaces='drive', fields='files(id, name, mimeType)').execute()
        return results.get('files', [])

    def download_file(self, file_id: str) -> bytes:
        """Downloads a specific file into your server's RAM as raw bytes."""
        request = self.service.files().get_media(fileId=file_id)
        file_stream = io.BytesIO()
        downloader = MediaIoBaseDownload(file_stream, request)
        
        done = False
        while done is False:
            status, done = downloader.next_chunk()
            
        return file_stream.getvalue()