export type FolderRole = 'OWNER' | 'EDITOR' | 'VIEWER';

export interface FolderMember {
  userId:   string;
  username: string | null;
  email:    string;
  role:     FolderRole;
  isOwner:  boolean;
}

export interface SharedWithMeFolder {
  id:        string;
  name:      string;
  role:      'VIEWER' | 'EDITOR';
  ownerName: string | null;
}

export interface SharedFolderEntry { id: string; name: string; }

export interface SharedFolderFile {
  id:          string;
  name:        string;
  size:        string;
  mimeType:    string | null;
  downloadUrl: string;
}

export interface SharedFolderContents {
  id:      string;
  name:    string;
  role:    FolderRole;
  folders: SharedFolderEntry[];
  files:   SharedFolderFile[];
}
