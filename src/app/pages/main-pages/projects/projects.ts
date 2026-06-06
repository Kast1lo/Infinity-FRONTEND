import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { SideBar } from '../../../common-ui/side-bar/side-bar';
import { ProjectService } from '../../../services/project';
import { Project } from '../../../interfaces/project/project.model';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { MenuModule } from 'primeng/menu';
import { Toast, ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-projects',
  imports: [
    CommonModule,
    FormsModule,
    SideBar,
    ButtonModule,
    CardModule,
    CheckboxModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    MenuModule,
    Toast,
    ToastModule,
  ],
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Projects implements OnInit {
  private router         = inject(Router);
  private projectService = inject(ProjectService);
  private messageService = inject(MessageService);

  readonly projects = this.projectService.projects;
  readonly isLoading = this.projectService.isLoading.asReadonly();

  showCreateDialog = signal(false);
  showRenameDialog = signal(false);

  newName = signal('');
  newDescription = signal('');
  newColor = signal<string | null>(null);
  useAiGeneration = signal(false);
  aiIncludeSubtasks = signal(true);
  creating = signal(false);

  renameTarget = signal<Project | null>(null);
  renameName = signal('');
  renameDescription = signal('');

  confirmVisible = signal(false);
  confirmTitle = signal('');
  confirmMessage = signal('');
  private confirmCallback: (() => void) | null = null;

  readonly colors = [
    { value: null,      hex: 'transparent' },
    { value: '#e05555', hex: '#e05555' },
    { value: '#e08c2a', hex: '#e08c2a' },
    { value: '#d4b84a', hex: '#d4b84a' },
    { value: '#4caf76', hex: '#4caf76' },
    { value: '#4a9eff', hex: '#4a9eff' },
    { value: '#9c6bda', hex: '#9c6bda' },
  ];

  ngOnInit() {
    this.loadProjects();
  }

  loadProjects() {
    this.projectService.loadProjects().subscribe({
      error: () => this.toast('Не удалось загрузить проекты'),
    });
  }

  openCreateDialog() {
    this.newName.set('');
    this.newDescription.set('');
    this.newColor.set(null);
    this.useAiGeneration.set(false);
    this.aiIncludeSubtasks.set(true);
    this.showCreateDialog.set(true);
  }

  createProject() {
    const name = this.newName().trim();
    if (!name) {
      this.toast('Укажите название проекта');
      return;
    }
    const description = this.newDescription().trim();
    const wantsAi     = this.useAiGeneration();

    if (wantsAi && description.length < 10) {
      this.toast('Для AI-генерации опишите проект подробнее (минимум 10 символов)');
      return;
    }

    this.creating.set(true);
    this.projectService.createProject({
      name,
      description: description || undefined,
      color:       this.newColor() ?? undefined,
    }).subscribe({
      next: (project) => {
        if (wantsAi) {
          this.projectService.generateTasksWithAi(project.id, {
            description,
            includeSubtasks: this.aiIncludeSubtasks(),
          })
            .pipe(finalize(() => this.creating.set(false)))
            .subscribe({
              next: () => {
                this.toast('Проект создан, задачи сгенерированы', true);
                this.showCreateDialog.set(false);
                this.router.navigate(['/projects', project.id]);
              },
              error: (err) => {
                this.toast(`Проект создан, но AI вернул ошибку: ${err?.message ?? 'неизвестная ошибка'}`);
                this.showCreateDialog.set(false);
                this.router.navigate(['/projects', project.id]);
              },
            });
        } else {
          this.creating.set(false);
          this.toast('Проект создан', true);
          this.showCreateDialog.set(false);
          this.loadProjects();
        }
      },
      error: (err) => {
        this.creating.set(false);
        this.toast(err?.message ?? 'Не удалось создать проект');
      },
    });
  }

  openProject(project: Project) {
    this.router.navigate(['/projects', project.id]);
  }

  openRenameDialog(project: Project, event: Event) {
    event.stopPropagation();
    this.renameTarget.set(project);
    this.renameName.set(project.name);
    this.renameDescription.set(project.description ?? '');
    this.showRenameDialog.set(true);
  }

  saveRename() {
    const target = this.renameTarget();
    if (!target) return;
    const name = this.renameName().trim();
    if (!name) {
      this.toast('Название не может быть пустым');
      return;
    }
    this.projectService.updateProject(target.id, {
      name,
      description: this.renameDescription().trim() || undefined,
    }).subscribe({
      next: () => {
        this.toast('Проект обновлён', true);
        this.showRenameDialog.set(false);
        this.loadProjects();
      },
      error: (err) => this.toast(err?.message ?? 'Не удалось обновить проект'),
    });
  }

  deleteProject(project: Project, event: Event) {
    event.stopPropagation();
    this.openConfirm(
      'Удалить проект?',
      `Все задачи и колонки проекта «${project.name}» будут безвозвратно удалены.`,
      () => {
        this.projectService.deleteProject(project.id).subscribe({
          next: () => {
            this.toast('Проект удалён', true);
            this.loadProjects();
          },
          error: (err) => this.toast(err?.message ?? 'Не удалось удалить проект'),
        });
      },
    );
  }

  openConfirm(title: string, message: string, callback: () => void) {
    this.confirmTitle.set(title);
    this.confirmMessage.set(message);
    this.confirmCallback = callback;
    this.confirmVisible.set(true);
  }

  onConfirmAccept() {
    this.confirmVisible.set(false);
    if (this.confirmCallback) { this.confirmCallback(); this.confirmCallback = null; }
  }

  onConfirmReject() {
    this.confirmVisible.set(false);
    this.confirmCallback = null;
  }

  private toast(detail: string, success = false) {
    this.messageService.add({
      severity: 'secondary',
      summary: success ? 'Готово' : 'Ошибка',
      detail,
      key: 'br',
    });
  }
}
