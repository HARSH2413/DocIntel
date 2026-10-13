export interface Box {
  id: string;
  name: string;
  description?: string | null;
  domain?: string | null;
  created_at: string;
  updated_at?: string | null;
  document_count?: number;
}

/** Event the sidebar's "New box" button sends to whichever box page is open. */
export const CREATE_BOX_EVENT = 'docintel:create-box';
