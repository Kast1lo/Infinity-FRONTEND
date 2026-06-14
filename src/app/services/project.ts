import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, Observable, tap, throwError } from 'rxjs';

import {
  Project,
  ProjectMember,
  CreateProjectDto,
  UpdateProjectDto,
  AiGenerateTasksDto,
  AiGenerateResponse,
} from '../interfaces/project/project.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  readonly projects     = signal<Project[]>([]);
  readonly currentProject = signal<any | null>(null);
  readonly isLoading    = signal(false);
  readonly error        = signal<string | null>(null);

  loadProjects(): Observable<Project[]> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.get<Project[]>(`${this.baseUrl}/projects`, { withCredentials: true }).pipe(
      tap(list => this.projects.set(list)),
      catchError(err => this.handleError(err, 'Не удалось загрузить проекты')),
      finalize(() => this.isLoading.set(false)),
    );
  }

  loadProject(projectId: string): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.get(`${this.baseUrl}/projects/${projectId}`, { withCredentials: true }).pipe(
      tap(project => this.currentProject.set(project)),
      catchError(err => this.handleError(err, 'Не удалось загрузить проект')),
      finalize(() => this.isLoading.set(false)),
    );
  }

  createProject(dto: CreateProjectDto): Observable<Project> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.post<Project>(`${this.baseUrl}/projects`, dto, { withCredentials: true }).pipe(
      catchError(err => this.handleError(err, 'Не удалось создать проект')),
      finalize(() => this.isLoading.set(false)),
    );
  }

  updateProject(projectId: string, dto: UpdateProjectDto): Observable<Project> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.patch<Project>(`${this.baseUrl}/projects/${projectId}`, dto, { withCredentials: true }).pipe(
      catchError(err => this.handleError(err, 'Не удалось обновить проект')),
      finalize(() => this.isLoading.set(false)),
    );
  }

  deleteProject(projectId: string): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.delete(`${this.baseUrl}/projects/${projectId}`, { withCredentials: true }).pipe(
      catchError(err => this.handleError(err, 'Не удалось удалить проект')),
      finalize(() => this.isLoading.set(false)),
    );
  }

  generateTasksWithAi(projectId: string, dto: AiGenerateTasksDto): Observable<AiGenerateResponse> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.post<AiGenerateResponse>(
      `${this.baseUrl}/projects/${projectId}/ai-generate`,
      dto,
      { withCredentials: true },
    ).pipe(
      catchError(err => this.handleError(err, 'AI-генерация не удалась')),
      finalize(() => this.isLoading.set(false)),
    );
  }

  // ─── Совместный доступ к доске ───

  listMembers(projectId: string): Observable<ProjectMember[]> {
    return this.http.get<ProjectMember[]>(`${this.baseUrl}/projects/${projectId}/members`, { withCredentials: true }).pipe(
      catchError(err => this.handleError(err, 'Не удалось загрузить участников')),
    );
  }

  inviteMember(projectId: string, email: string, role: 'VIEWER' | 'EDITOR'): Observable<ProjectMember> {
    return this.http.post<ProjectMember>(
      `${this.baseUrl}/projects/${projectId}/members`, { email, role }, { withCredentials: true },
    ).pipe(catchError(err => this.handleError(err, 'Не удалось пригласить пользователя')));
  }

  updateMemberRole(projectId: string, memberUserId: string, role: 'VIEWER' | 'EDITOR'): Observable<any> {
    return this.http.patch(
      `${this.baseUrl}/projects/${projectId}/members/${memberUserId}`, { role }, { withCredentials: true },
    ).pipe(catchError(err => this.handleError(err, 'Не удалось изменить роль')));
  }

  removeMember(projectId: string, memberUserId: string): Observable<any> {
    return this.http.delete(
      `${this.baseUrl}/projects/${projectId}/members/${memberUserId}`, { withCredentials: true },
    ).pipe(catchError(err => this.handleError(err, 'Не удалось удалить участника')));
  }

  leaveProject(projectId: string): Observable<any> {
    return this.http.delete(
      `${this.baseUrl}/projects/${projectId}/leave`, { withCredentials: true },
    ).pipe(catchError(err => this.handleError(err, 'Не удалось покинуть доску')));
  }

  clearError(): void { this.error.set(null); }

  reset(): void {
    this.projects.set([]);
    this.currentProject.set(null);
    this.error.set(null);
    this.isLoading.set(false);
  }

  private handleError(error: HttpErrorResponse, defaultMessage: string): Observable<never> {
    let errorMessage = defaultMessage;
    if (error.error?.message) errorMessage = Array.isArray(error.error.message)
      ? error.error.message.join(', ')
      : error.error.message;
    else if (error.error?.error) errorMessage = error.error.error;
    console.error('[ProjectService]', errorMessage, error);
    this.error.set(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
