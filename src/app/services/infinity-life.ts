import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, Observable, tap, throwError } from 'rxjs';

import { Task, Subtask } from '../interfaces/infinity-life/tasks.model';
import { UpdateTask } from '../interfaces/infinity-life/update-task.model';
import { CreateSubtaskDto } from '../interfaces/infinity-life/create-subtask.model';
import { CreateColumnDto } from '../interfaces/infinity-life/create-column.model';
import { UpdateColumnDto } from '../interfaces/infinity-life/update-column.model';
import { CreateTaskDto } from '../interfaces/infinity-life/create-task.model';

@Injectable({
  providedIn: 'root',
})
export class InfinityLife {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:4400/infinity-life';

  readonly columns = signal<any[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {}

  // ─── COLUMNS ───
  loadBoard(): Observable<any[]> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.get<any[]>(`${this.baseUrl}/columns`, { withCredentials: true }).pipe(
      tap(columns => this.columns.set(columns)),
      catchError(err => this.handleError(err, 'Не удалось загрузить доску')),
      finalize(() => this.isLoading.set(false))
    );
  }

  createColumn(dto: CreateColumnDto): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.post(`${this.baseUrl}/columns`, dto, { withCredentials: true }).pipe(
      catchError(err => this.handleError(err, 'Ошибка создания колонки')),
      finalize(() => this.isLoading.set(false))
    );
  }

  updateColumn(columnId: string, dto: UpdateColumnDto): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.patch(`${this.baseUrl}/columns/${columnId}`, dto, { withCredentials: true }).pipe(
      catchError(err => this.handleError(err, 'Ошибка обновления колонки')),
      finalize(() => this.isLoading.set(false))
    );
  }

  deleteColumn(columnId: string): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.delete(`${this.baseUrl}/columns/${columnId}`, { withCredentials: true }).pipe(
      catchError(err => this.handleError(err, 'Ошибка удаления колонки')),
      finalize(() => this.isLoading.set(false))
    );
  }

  // ─── TASKS ───
  createTask(dto: CreateTaskDto): Observable<Task> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.post<Task>(`${this.baseUrl}/tasks`, dto, { withCredentials: true }).pipe(
      catchError(err => this.handleError(err, 'Ошибка создания задачи')),
      finalize(() => this.isLoading.set(false))
    );
  }

  updateTask(taskId: string, dto: Partial<CreateTaskDto>): Observable<Task> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.patch<Task>(`${this.baseUrl}/tasks/${taskId}`, dto, { withCredentials: true }).pipe(
      catchError(err => this.handleError(err, 'Ошибка обновления задачи')),
      finalize(() => this.isLoading.set(false))
    );
  }

  moveTaskToColumn(id: string, newColumnId: string): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.patch(`${this.baseUrl}/tasks/${id}/move`, { columnId: newColumnId }, { withCredentials: true }).pipe(
      catchError(err => this.handleError(err, 'Не удалось переместить задачу')),
      finalize(() => this.isLoading.set(false))
    );
  }

  toggleTaskCompletion(taskId: string): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.patch(`${this.baseUrl}/tasks/${taskId}/toggle`, {}, { withCredentials: true }).pipe(
      catchError(err => this.handleError(err, 'Ошибка изменения статуса задачи')),
      finalize(() => this.isLoading.set(false))
    );
  }

  deleteTask(taskId: string): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.delete(`${this.baseUrl}/tasks/${taskId}`, { withCredentials: true }).pipe(
      catchError(err => this.handleError(err, 'Ошибка удаления задачи')),
      finalize(() => this.isLoading.set(false))
    );
  }

  // ─── SUBTASKS ───
  createSubtask(dto: CreateSubtaskDto): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.post(`${this.baseUrl}/subtasks`, dto, { withCredentials: true }).pipe(
      catchError(err => this.handleError(err, 'Ошибка создания подзадачи')),
      finalize(() => this.isLoading.set(false))
    );
  }

  toggleSubtaskCompletion(subtaskId: string): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.patch(`${this.baseUrl}/subtasks/${subtaskId}/toggle`, {}, { withCredentials: true }).pipe(
      catchError(err => this.handleError(err, 'Ошибка изменения статуса подзадачи')),
      finalize(() => this.isLoading.set(false))
    );
  }

  deleteSubtask(subtaskId: string): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.delete(`${this.baseUrl}/subtasks/${subtaskId}`, { withCredentials: true }).pipe(
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