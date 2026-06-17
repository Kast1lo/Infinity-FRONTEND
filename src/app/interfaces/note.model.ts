export interface Note {
  id:        string;
  title:     string;
  content:   string;        // rich-text HTML
  color:     string | null;
  isPinned:  boolean;
  createdAt: string;
  updatedAt: string;
}
