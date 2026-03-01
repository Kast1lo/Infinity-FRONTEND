export interface FileItem {
  id: string;
  name: string;
  path: string;
  size: string;
  mimeType: string;
  ownerId: string;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
  isShared: boolean;
  downloadUrl: string;
}