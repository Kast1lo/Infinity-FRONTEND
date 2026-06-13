import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, Observable, tap, throwError } from 'rxjs';

import { Task, Subtask } from '../interfaces/infinity-life/tasks.model';
import { Reminder } from '../interfaces/infinity-life/reminder.model';
import { SearchTask } from '../interfaces/search/search-results.model';
import { UpdateTask } from '../interfaces/infinity-life/update-task.model';
import { CreateSubtaskDto } from '../interfaces/infinity-life/create-subtask.model';
import { CreateColumnDto } from '../interfaces/infinity-life/create-column.model';
import { UpdateColumnDto } from '../interfaces/infinity-life/update-column.model';
import { CreateTaskDto } from '../interfaces/infinity-life/create-task.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class InfinityLife {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  readonly columns = signal<any[]>([]);
  readonly allTasks = signal<Task[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  readonly reminders = signal<Reminder[]>([]);
  readonly reminderCount = computed(() => this.reminders().length);
  readonly overdueCount  = computed(() => this.reminders().filter(r => r.isOverdue).length);

  constructor() {}

  loadAllUserTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.baseUrl}/infinity-life/tasks`, { withCredentials: true }).pipe(
      tap(tasks => this.allTasks.set(tasks)),
      catchError(err => this.handleError(err, 'Не удалось загрузить задачи'))
    );
  }

  loadReminders(): Observable<Reminder[]> {
    return this.http.get<Reminder[]>(`${this.baseUrl}/infinity-life/reminders`, { withCredentials: true }).pipe(
      tap(reminders => this.reminders.set(reminders ?? [])),
      catchError(err => this.handleError(err, 'Не удалось загрузить напоминания'))
    );
  }

  // Поиск задач по названию (для глобального поиска).
  searchTasks(query: string): Observable<SearchTask[]> {
    return this.http.get<SearchTask[]>(`${this.baseUrl}/infinity-life/search`, {
      params: { q: query }, withCredentials: true,
    }).pipe(
      catchError(err => this.handleError(err, 'Ошибка поиска задач')),
    );
  }

  // Отложить напоминание: сразу убираем из списка оптимистично, затем шлём на бэк.
  snoozeReminder(taskId: string, days = 3): Observable<{ snoozedUntil: string }> {
    this.reminders.update(list => list.filter(r => r.id !== taskId));
    return this.http.patch<{ snoozedUntil: string }>(
      `${this.baseUrl}/infinity-life/reminders/${taskId}/snooze`, { days }, { withCredentials: true }
    ).pipe(
      catchError(err => this.handleError(err, 'Не удалось отложить напоминание'))
    );
  }

  loadBoard(projectId: string): Observable<any[]> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.get<any[]>(`${this.baseUrl}/infinity-life/columns`, {
      params: { projectId },
      withCredentials: true,
    }).pipe(
      tap(columns => this.columns.set(columns)),
      catchError(err => this.handleError(err, 'Не удалось загрузить доску')),
      finalize(() => this.isLoading.set(false))
    );
  }

  createColumn(dto: CreateColumnDto): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.post(`${this.baseUrl}/infinity-life/columns`, dto, { withCredentials: true }).pipe(
      catchError(err => this.handleError(err, 'Ошибка создания колонки')),
      finalize(() => this.isLoading.set(false))
    );
  }

  updateColumn(columnId: string, dto: UpdateColumnDto): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.patch(`${this.baseUrl}/infinity-life/columns/${columnId}`, dto, { withCredentials: true }).pipe(
      catchError(err => this.handleError(err, 'Ошибка обновления колонки')),
      finalize(() => this.isLoading.set(false))
    );
  }

  deleteColumn(columnId: string): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.delete(`${this.baseUrl}/infinity-life/columns/${columnId}`, { withCredentials: true }).pipe(
      catchError(err => this.handleError(err, 'Ошибка удаления колонки')),
      finalize(() => this.isLoading.set(false))
    );
  }

  createTask(dto: CreateTaskDto): Observable<Task> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.post<Task>(`${this.baseUrl}/infinity-life/tasks`, dto, { withCredentials: true }).pipe(
      catchError(err => this.handleError(err, 'Ошибка создания задачи')),
      finalize(() => this.isLoading.set(false))
    );
  }

  updateTask(taskId: string, dto: Partial<CreateTaskDto>): Observable<Task> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.patch<Task>(`${this.baseUrl}/infinity-life/tasks/${taskId}`, dto, { withCredentials: true }).pipe(
      catchError(err => this.handleError(err, 'Ошибка обновления задачи')),
      finalize(() => this.isLoading.set(false))
    );
  }

  moveTaskToColumn(id: string, newColumnId: string): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.patch(`${this.baseUrl}/infinity-life/tasks/${id}/move`, { columnId: newColumnId }, { withCredentials: true }).pipe(
      catchError(err => this.handleError(err, 'Не удалось переместить задачу')),
      finalize(() => this.isLoading.set(false))
    );
  }

  toggleTaskCompletion(taskId: string): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.patch(`${this.baseUrl}/infinity-life/tasks/${taskId}/toggle`, {}, { withCredentials: true }).pipe(
      catchError(err => this.handleError(err, 'Ошибка изменения статуса задачи')),
      finalize(() => this.isLoading.set(false))
    );
  }

  deleteTask(taskId: string): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.delete(`${this.baseUrl}/infinity-life/tasks/${taskId}`, { withCredentials: true }).pipe(
      catchError(err => this.handleError(err, 'Ошибка удаления задачи')),
      finalize(() => this.isLoading.set(false))
    );
  }

  createSubtask(dto: CreateSubtaskDto): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.post(`${this.baseUrl}/infinity-life/subtasks`, dto, { withCredentials: true }).pipe(
      catchError(err => this.handleError(err, 'Ошибка создания подзадачи')),
      finalize(() => this.isLoading.set(false))
    );
  }

  toggleSubtaskCompletion(subtaskId: string): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.patch(`${this.baseUrl}/infinity-life/subtasks/${subtaskId}/toggle`, {}, { withCredentials: true }).pipe(
      catchError(err => this.handleError(err, 'Ошибка изменения статуса подзадачи')),
      finalize(() => this.isLoading.set(false))
    );
  }

  deleteSubtask(subtaskId: string): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.delete(`${this.baseUrl}/infinity-life/subtasks/${subtaskId}`, { withCredentials: true }).pipe(
      catchError(err => this.handleError(err, 'Ошибка удаления подзадачи')),
      finalize(() => this.isLoading.set(false))
    );
  }

  private handleError(error: HttpErrorResponse, defaultMessage: string): Observable<never> {
    let errorMessage = defaultMessage;
    if (error.error?.message) errorMessage = error.error.message;
    else if (error.error?.error) errorMessage = error.error.error;
    console.error('[InfinityLife Service]', errorMessage, error);
    this.error.set(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  clearError(): void { this.error.set(null); }
  reset(): void { this.columns.set([]); this.error.set(null); this.isLoading.set(false); }
}