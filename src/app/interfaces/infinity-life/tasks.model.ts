export interface Task {
  id: string;
  title: string;
  notes?: string | null;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  isCompleted: boolean;
  parentId?: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  subtasks?: Task[];          
  progress?: number;          
}