import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CalendarService } from '../../../services/calendar';
import { LangService } from '../../../services/lang';

interface DayCell {
  dateStr: string;     // YYYY-MM-DD
  day:     number;
  inMonth: boolean;
  isToday: boolean;
}

@Component({
  selector: 'app-calendar',
  imports: [FormsModule, ToastModule],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Calendar implements OnInit {
  private calendarService = inject(CalendarService);
  private messageService = inject(MessageService);
  readonly langService = inject(LangService);

  t = computed(() => this.langService.t().pages.calendar);

  private now = new Date();
  viewYear  = signal(this.now.getFullYear());
  viewMonth = signal(this.now.getMonth());     // 0-based

  month = this.calendarService.month;

  selectedDate = signal<string | null>(null);

  newTaskTitle = signal('');
  noteText     = signal('');
  private noteSaveTimer: any;
  noteSaving   = signal(false);

  private pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
  private toStr(y: number, m: number, d: number) { return `${y}-${this.pad(m + 1)}-${this.pad(d)}`; }

  readonly weekdays = computed(() => this.t().weekdays);

  // Сетка месяца (недели по 7 дней, неделя с понедельника).
  weeks = computed<DayCell[][]>(() => {
    const year = this.viewYear();
    const month = this.viewMonth();
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7;       // Пн=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    const today = new Date();
    const todayStr = this.toStr(today.getFullYear(), today.getMonth(), today.getDate());

    const cells: DayCell[] = [];
    for (let i = 0; i < totalCells; i++) {
      const d = new Date(year, month, 1 - startOffset + i);
      const dateStr = this.toStr(d.getFullYear(), d.getMonth(), d.getDate());
      cells.push({
        dateStr,
        day:     d.getDate(),
        inMonth: d.getMonth() === month,
        isToday: dateStr === todayStr,
      });
    }
    const weeks: DayCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  });

  monthTitle = computed(() => {
    const names = this.t().months;
    return `${names[this.viewMonth()]} ${this.viewYear()}`;
  });

  // Множество дат с мини-заметкой и карта задач по датам (для бейджей).
  private noteDates = computed(() => new Set(this.month().notes.map(n => n.date)));
  private tasksByDate = computed(() => {
    const map = new Map<string, { total: number; done: number }>();
    for (const t of this.month().tasks) {
      const e = map.get(t.date) ?? { total: 0, done: 0 };
      e.total++; if (t.isCompleted) e.done++;
      map.set(t.date, e);
    }
    return map;
  });

  hasNote(dateStr: string) { return this.noteDates().has(dateStr); }
  taskInfo(dateStr: string) { return this.tasksByDate().get(dateStr) ?? null; }

  // Данные выбранного дня (из загруженного месяца).
  dayTasks = computed(() => {
    const d = this.selectedDate();
    if (!d) return [];
    return this.month().tasks.filter(t => t.date === d).sort((a, b) => a.order - b.order);
  });

  selectedHuman = computed(() => {
    const d = this.selectedDate();
    if (!d) return '';
    const [y, m, day] = d.split('-').map(Number);
    return `${day} ${this.t().monthsGenitive[m - 1]} ${y}`;
  });

  ngOnInit() {
    this.loadMonth();
  }

  private loadMonth() {
    this.calendarService.loadMonth(this.viewYear(), this.viewMonth() + 1).subscribe({ error: () => {} });
  }

  prevMonth() {
    let m = this.viewMonth() - 1, y = this.viewYear();
    if (m < 0) { m = 11; y--; }
    this.viewMonth.set(m); this.viewYear.set(y);
    this.loadMonth();
  }
  nextMonth() {
    let m = this.viewMonth() + 1, y = this.viewYear();
    if (m > 11) { m = 0; y++; }
    this.viewMonth.set(m); this.viewYear.set(y);
    this.loadMonth();
  }
  goToday() {
    const t = new Date();
    this.viewYear.set(t.getFullYear()); this.viewMonth.set(t.getMonth());
    this.loadMonth();
    this.selectDay(this.toStr(t.getFullYear(), t.getMonth(), t.getDate()));
  }

  selectDay(dateStr: string) {
    this.flushNote();
    this.selectedDate.set(dateStr);
    this.noteText.set(this.month().notes.find(n => n.date === dateStr)?.content ?? '');
    this.newTaskTitle.set('');
  }

  closeDay() { this.flushNote(); this.selectedDate.set(null); }

  // ── Мини-заметка ──
  onNoteInput(text: string) {
    this.noteText.set(text);
    this.noteSaving.set(true);
    clearTimeout(this.noteSaveTimer);
    this.noteSaveTimer = setTimeout(() => this.saveNote(), 700);
  }
  private flushNote() {
    if (this.noteSaveTimer) { clearTimeout(this.noteSaveTimer); this.noteSaveTimer = null; this.saveNote(); }
  }
  private saveNote() {
    const date = this.selectedDate();
    if (!date) return;
    this.calendarService.saveNote(date, this.noteText()).subscribe({
      next: () => this.noteSaving.set(false),
      error: () => { this.noteSaving.set(false); this.toast(this.t().saveFailed); },
    });
  }

  // ── Задачи дня ──
  addTask() {
    const date = this.selectedDate();
    const title = this.newTaskTitle().trim();
    if (!date || !title) return;
    this.calendarService.createTask(date, title).subscribe({
      next: () => this.newTaskTitle.set(''),
      error: () => this.toast(this.t().taskFailed),
    });
  }
  toggleTask(id: string, isCompleted: boolean) {
    this.calendarService.updateTask(id, { isCompleted: !isCompleted }).subscribe({ error: () => {} });
  }
  deleteTask(id: string) {
    this.calendarService.deleteTask(id).subscribe({ error: () => this.toast(this.t().taskFailed) });
  }

  private toast(detail: string) {
    this.messageService.add({ severity: 'secondary', summary: this.t().toastError, detail, key: 'cal' });
  }
}
