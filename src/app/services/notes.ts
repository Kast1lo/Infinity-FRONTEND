import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, Observable, tap } from 'rxjs';
import { Note } from '../interfaces/note.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private _notes   = signal<Note[]>([]);
  private _loading = signal(false);

  notes   = computed(() => this._notes());
  loading = computed(() => this._loading());

  // Важно: сигнал обновляем через tap, БЕЗ внутренней подписки — иначе каждая
  // подписка компонента породила бы дублирующий HTTP-запрос (cold observable).

  load(): Observable<Note[]> {
    this._loading.set(true);
    return this.http.get<Note[]>(`${this.apiUrl}/notes`, { withCredentials: true }).pipe(
      tap({
        next: (n) => { this._notes.set(n ?? []); this._loading.set(false); },
        error: () => this._loading.set(false),
      }),
    );
  }

  create(): Observable<Note> {
    return this.http.post<Note>(`${this.apiUrl}/notes`, { title: '', content: '' }, { withCredentials: true }).pipe(
      tap((note) => this._notes.update(list => [note, ...list])),
    );
  }

  update(id: string, patch: Partial<Pick<Note, 'title' | 'content' | 'color' | 'isPinned'>>): Observable<Note> {
    return this.http.patch<Note>(`${this.apiUrl}/notes/${id}`, patch, { withCredentials: true }).pipe(
      tap((updated) => this._notes.update(list => this.resort(list.map(n => (n.id === id ? updated : n))))),
    );
  }

  remove(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/notes/${id}`, { withCredentials: true }).pipe(
      tap(() => this._notes.update(list => list.filter(n => n.id !== id))),
    );
  }

  // Загрузка картинки → возвращает абсолютный URL для вставки в <img> заметки.
  async uploadImage(file: File): Promise<string> {
    const form = new FormData();
    form.append('image', file);
    const res = await firstValueFrom(
      this.http.post<{ id: string }>(`${this.apiUrl}/notes/image`, form, { withCredentials: true }),
    );
    return `${this.apiUrl}/notes/image/${res.id}`;
  }

  // Закреплённые сверху, затем по дате обновления (как на бэке).
  private resort(list: Note[]): Note[] {
    return [...list].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }
}
