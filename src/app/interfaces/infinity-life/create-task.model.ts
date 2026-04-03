export interface CreateTaskDto {
  title: string;
  notes?: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  columnId?: string | null;
}