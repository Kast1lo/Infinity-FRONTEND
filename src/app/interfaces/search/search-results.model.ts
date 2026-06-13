import { FileItem } from '../file-system-interfeces/file-item.model';
import { FolderItem } from '../file-system-interfeces/folder-item.model';

export interface SearchTask {
  id: string;
  title: string;
  isCompleted: boolean;
  priority: string;
  dueDate: string | null;
  projectId: string;
  projectName: string;
  projectColor: string | null;
}

export interface FileSearchResults {
  files: FileItem[];
  folders: FolderItem[];
}
