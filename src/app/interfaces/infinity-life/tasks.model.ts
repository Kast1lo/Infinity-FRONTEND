export interface Task {
  parentId: string;
  id: string;
  title: string;
  notes?: string | null;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  isCompleted: boolean;
  columnId?: string | null;
  createdAt: string;
  updatedAt: string;
  subtasks: Subtask[];
  progress?: number;
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