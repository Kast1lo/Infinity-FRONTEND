export interface UpdateTask {
  title?: string;
  notes?: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  isCompleted?: boolean;
  columnId?: string | null;
}