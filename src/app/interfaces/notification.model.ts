export interface AppNotification {
  id: string;
  type: string;       // 'share' | 'plan' | 'system'
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}
