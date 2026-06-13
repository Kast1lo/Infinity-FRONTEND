export interface Reminder {
  id: string;
  title: string;
  dueDate: string | null;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  projectId: string;
  projectName: string;
  projectColor: string | null;
  isOverdue: boolean;
}
