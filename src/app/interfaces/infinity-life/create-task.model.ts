export interface CreateTaskDto {
  title: string;
  notes?: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  parentId?: string | null;
}