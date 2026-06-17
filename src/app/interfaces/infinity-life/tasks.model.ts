export interface Task {
  id: string;
  title: string;
  notes?: string | null;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  isCompleted: boolean;
  columnId?: string | null;
  dueDate?: string | null;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
  subtasks: Subtask[];
  attachments?: TaskAttachment[];
  progress?: number;
}

// Файл, прикреплённый к задаче (запись TaskAttachment + данные файла из хранилища).
export interface TaskAttachment {
  id: string;          // id записи-вложения
  fileId: string;      // id файла в хранилище
  name: string;
  mimeType: string | null;
  size: number;        // байты
  isStarred?: boolean;
  createdAt: string;
  downloadUrl: string;
  // отдельная задача проекта, к которой относится файл (для списка файлов проекта)
  taskId?: string;
  taskTitle?: string;
}

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  order: number;
  taskId: string;
  createdAt: string;
  updatedAt: string;
}