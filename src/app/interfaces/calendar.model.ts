export interface CalendarTask {
  id:          string;
  date:        string;        // YYYY-MM-DD
  title:       string;
  isCompleted: boolean;
  order:       number;
}

export interface CalendarNote {
  id:      string;
  date:    string;            // YYYY-MM-DD
  content: string;            // HTML / текст мини-заметки
}

export interface CalendarMonth {
  notes: CalendarNote[];
  tasks: CalendarTask[];
}
