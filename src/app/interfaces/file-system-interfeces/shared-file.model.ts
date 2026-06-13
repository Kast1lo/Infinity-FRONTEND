export interface SharedFileItem {
  id: string;
  name: string;
  size: string;
  mimeType: string | null;
  sharedAt: string | null;
  shareExpiresAt: string | null;
  hasPassword: boolean;
  isExpired: boolean;
}

export interface ShareSettings {
  isShared: boolean;
  expiresInDays?: number | null;
  password?: string | null;
}
