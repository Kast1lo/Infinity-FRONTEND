import { FileItem } from "./file-item.model";

export interface FolderItem {
  id: string;
  name: string;
  path: string;
  ownerId: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  isShared: boolean;
  isStarred?: boolean;
  children: FolderItem[];
  files: FileItem[];
  deletedAt?: string | null;
}