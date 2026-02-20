import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Task } from '../interfaces/infinity-life/tasks.model';
import { catchError, finalize, Observable, tap, throwError } from 'rxjs';
import { CreateTaskDto } from '../interfaces/infinity-life/create-task.model';
import { UpdateTask } from '../interfaces/infinity-life/update-task.model';

@Injectable({
  providedIn: 'root',
})
export class InfinityLife {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:4400/infinity-life';
  
  readonly tasks = signal<Task[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  loadAllTasks(): Observable<Task[]> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.get<Task[]>(`${this.baseUrl}/tasksAll`, { 
      withCredentials: true 
    }).pipe(
      tap(tasks => {
        this.tasks.set(tasks);
      }),
      finalize(() => this.isLoading.set(false))
    );
  }

  createTask(dto: CreateTaskDto): Observable<Task> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.post<Task>(`${this.baseUrl}/createTasks`, dto, {
      withCredentials: true 
    }).pipe(
      tap(newTask => {
        if (!newTask.parentId) {
          this.tasks.update(tasks => [...tasks, newTask]);
        } else {
          this.loadAllTasks().subscribe();
        }
      }),
      finalize(() => this.isLoading.set(false))
    );
  }
    
  updateTask(taskId: string, updates: UpdateTask): Observable<Task>{
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.patch<Task>(`${this.baseUrl}/updateTask/${taskId}`, updates, {
      withCredentials: true 
    }).pipe(
      tap(updated => {
        this.tasks.update(current =>
          current.map(t => t.id === taskId ? { ...t, ...updated } : t)
        );
      }),
    finalize(() => this.isLoading.set(false))
    );
  }

  toggleTaskCompletion(taskId: string): Observable<Task> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.patch<Task>(`${this.baseUrl}/toggleTaskCompletion/${taskId}`, {}, {
      withCredentials: true 
    }).pipe(
      tap(updated => {
        this.tasks.update(current =>
          current.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t)
        );
      }),
      catchError(err => this.handleError(err, 'Ошибка переключения статуса задачи')),
      finalize(() => this.isLoading.set(false))
    );
  }

  deleteTask(taskId: string): Observable<{message: string; deletedTaskId: string}> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.delete<{message: string; deletedTaskId: string}>(`${this.baseUrl}/deleteTask/${taskId}`, {
      withCredentials: true 
    }).pipe(
      tap(() => {
        this.tasks.update(current => current.filter(t => t.id !== taskId));
      }),
      catchError(err => this.handleError(err, 'Ошибка удаления задачи')),
      finalize(() => this.isLoading.set(false))
    );
  }

    private handleError(error: HttpErrorResponse, defaultMessage: string): Observable<never> {
    let errorMessage = defaultMessage;

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Сетевая ошибка: ${error.error.message}`;
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.error?.error) {
      errorMessage = error.error.error;
    } else {
      errorMessage = `Сервер ответил ${error.status}: ${error.statusText}`;
    }

    console.error('[TasksService]', errorMessage, error);
    this.error.set(errorMessage);

    return throwError(() => new Error(errorMessage));
  }

  clearError(): void {
    this.error.set(null);
  }

  reset(): void {
    this.tasks.set([]);
    this.error.set(null);
    this.isLoading.set(false);
  }

}
