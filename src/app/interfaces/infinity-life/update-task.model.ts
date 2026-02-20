export interface UpdateTask {
  title?: string;
  notes?: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  isCompleted?: boolean;
  parentId?: string | null;
}