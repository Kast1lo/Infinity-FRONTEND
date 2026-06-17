import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { CalendarMonth, CalendarTask } from '../interfaces/calendar.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private _month = signal<CalendarMonth>({ notes: [], tasks: [] });
  month = computed(() => this._month());

  loadMonth(year: number, month: number): Observable<CalendarMonth> {
    return this.http.get<CalendarMonth>(
      `${this.apiUrl}/calendar/month`,
      { params: { year, month }, withCredentials: true },
    ).pipe(tap(data => this._month.set({ notes: data.notes ?? [], tasks: data.tasks ?? [] })));
  }

  // Сохранить мини-заметку дня (пустая — удаляется на бэке).
  saveNote(date: string, content: string): Observable<{ note: { id: string; content: string } | null }> {
    return this.http.post<{ note: { id: string; content: string } | null }>(
      `${this.apiUrl}/calendar/note`, { date, content }, { withCredentials: true },
    ).pipe(tap(res => {
      this._month.update(m => {
        const notes = m.notes.filter(n => n.date !== date);
        if (res.note) notes.push({ id: res.note.id, date, content: res.note.content });
        return { ...m, notes };
      });
    }));
  }

  createTask(date: string, title: string): Observable<Omit<CalendarTask, 'date'>> {
    return this.http.post<Omit<CalendarTask, 'date'>>(
      `${this.apiUrl}/calendar/task`, { date, title }, { withCredentials: true },
    ).pipe(tap(t => this._month.update(m => ({ ...m, tasks: [...m.tasks, { ...t, date }] }))));
  }

  updateTask(id: string, patch: { title?: string; isCompleted?: boolean }): Observable<Omit<CalendarTask, 'date'>> {
    return this.http.patch<Omit<CalendarTask, 'date'>>(
      `${this.apiUrl}/calendar/task/${id}`, patch, { withCredentials: true },
    ).pipe(tap(t => this._month.update(m => ({
      ...m,
      tasks: m.tasks.map(x => (x.id === id ? { ...x, ...t } : x)),
    }))));
  }

  deleteTask(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.apiUrl}/calendar/task/${id}`, { withCredentials: true },
    ).pipe(tap(() => this._month.update(m => ({ ...m, tasks: m.tasks.filter(x => x.id !== id) }))));
  }
}
