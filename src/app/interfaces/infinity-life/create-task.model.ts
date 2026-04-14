export interface CreateTaskDto {
  title: string;
  notes?: string;
  priority?: string;
  columnId?: string | null;
  dueDate?: string | null;
  color?: string | null;
}