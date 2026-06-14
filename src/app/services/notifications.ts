import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AppNotification } from '../interfaces/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private _items   = signal<AppNotification[]>([]);
  private _loading = signal(false);

  items       = computed(() => this._items());
  loading     = computed(() => this._loading());
  unreadCount = computed(() => this._items().filter(n => !n.isRead).length);

  load() {
    this._loading.set(true);
    this.http.get<AppNotification[]>(`${this.apiUrl}/notifications`, { withCredentials: true }).pipe(
      catchError(() => of([] as AppNotification[])),
    ).subscribe(items => {
      this._items.set(items ?? []);
      this._loading.set(false);
    });
  }

  markRead(id: string) {
    this._items.update(list => list.map(n => (n.id === id ? { ...n, isRead: true } : n)));
    this.http.patch(`${this.apiUrl}/notifications/${id}/read`, {}, { withCredentials: true })
      .pipe(catchError(() => of(null))).subscribe();
  }

  markAllRead() {
    if (this.unreadCount() === 0) return;
    this._items.update(list => list.map(n => ({ ...n, isRead: true })));
    this.http.patch(`${this.apiUrl}/notifications/read-all`, {}, { withCredentials: true })
      .pipe(catchError(() => of(null))).subscribe();
  }

  remove(id: string) {
    this._items.update(list => list.filter(n => n.id !== id));
    this.http.delete(`${this.apiUrl}/notifications/${id}`, { withCredentials: true })
      .pipe(catchError(() => of(null))).subscribe();
  }

  clear() {
    this._items.set([]);
    this.http.delete(`${this.apiUrl}/notifications`, { withCredentials: true })
      .pipe(catchError(() => of(null))).subscribe();
  }
}
