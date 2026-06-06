export interface CreateTaskDto {
  projectId: string;
  title: string;
  notes?: string;
  priority?: string;
  columnId?: string | null;
  dueDate?: string | null;
  color?: string | null;
}