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
import { finalize } from 'rxjs';

import { ProjectService } from '../../../services/project';
import { Project, ProjectMember } from '../../../interfaces/project/project.model';
import { LangService } from '../../../services/lang';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { MenuModule } from 'primeng/menu';
import { Toast, ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-projects',
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    CheckboxModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    MenuModule,
    Toast,
    ToastModule,
    TooltipModule,
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
  readonly langService   = inject(LangService);

  readonly t = computed(() => this.langService.t().pages.projects);

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

  // ─── Участники доски ───
  showMembersDialog = signal(false);
  membersTarget  = signal<Project | null>(null);
  members        = signal<ProjectMember[]>([]);
  membersLoading = signal(false);
  inviteEmail    = signal('');
  inviteRole     = signal<'VIEWER' | 'EDITOR'>('EDITOR');
  inviting       = signal(false);

  isOwner(project: Project): boolean { return !project.shared; }

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
      error: () => this.toast(this.t().loadFailed),
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
      this.toast(this.t().nameRequired);
      return;
    }
    const description = this.newDescription().trim();
    const wantsAi     = this.useAiGeneration();

    if (wantsAi && description.length < 10) {
      this.toast(this.t().aiDescTooShort);
      return;
    }

    const includeSubtasks = this.aiIncludeSubtasks();

    this.creating.set(true);
    this.projectService.createProject({
      name,
      description: description || undefined,
      color:       this.newColor() ?? undefined,
    })
      .pipe(finalize(() => this.creating.set(false)))
      .subscribe({
        next: (project) => {
          this.showCreateDialog.set(false);
          if (wantsAi) {
            // Генерация долгая — не держим диалог открытым. Переходим на доску
            // и запускаем генерацию там (с неблокирующим оверлеем).
            this.router.navigate(['/projects', project.id], {
              state: { aiGenerate: { description, includeSubtasks } },
            });
          } else {
            this.toast(this.t().created, true);
            this.router.navigate(['/projects', project.id]);
          }
        },
        error: (err) => {
          this.toast(err?.message ?? this.t().createFailed);
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
      this.toast(this.t().renameEmpty);
      return;
    }
    this.projectService.updateProject(target.id, {
      name,
      description: this.renameDescription().trim() || undefined,
    }).subscribe({
      next: () => {
        this.toast(this.t().updated, true);
        this.showRenameDialog.set(false);
        this.loadProjects();
      },
      error: (err) => this.toast(err?.message ?? this.t().updateFailed),
    });
  }

  deleteProject(project: Project, event: Event) {
    event.stopPropagation();
    this.openConfirm(
      this.t().deleteTitle,
      `${this.t().deleteMsgPrefix}${project.name}${this.t().deleteMsgSuffix}`,
      () => {
        this.projectService.deleteProject(project.id).subscribe({
          next: () => {
            this.toast(this.t().deleted, true);
            this.loadProjects();
          },
          error: (err) => this.toast(err?.message ?? this.t().deleteFailed),
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

  openMembersDialog(project: Project, event: Event) {
    event.stopPropagation();
    this.membersTarget.set(project);
    this.members.set([]);
    this.inviteEmail.set('');
    this.inviteRole.set('EDITOR');
    this.showMembersDialog.set(true);
    this.loadMembers(project.id);
  }

  private loadMembers(projectId: string) {
    this.membersLoading.set(true);
    this.projectService.listMembers(projectId).subscribe({
      next: (m) => { this.members.set(m); this.membersLoading.set(false); },
      error: () => { this.membersLoading.set(false); this.toast(this.t().membersLoadFailed); },
    });
  }

  invite() {
    const project = this.membersTarget();
    const email = this.inviteEmail().trim();
    if (!project || !email || this.inviting()) return;
    this.inviting.set(true);
    this.projectService.inviteMember(project.id, email, this.inviteRole()).subscribe({
      next: () => {
        this.inviting.set(false);
        this.inviteEmail.set('');
        this.toast(this.t().memberAdded, true);
        this.loadMembers(project.id);
      },
      error: (err) => { this.inviting.set(false); this.toast(err?.message ?? this.t().inviteFailed); },
    });
  }

  changeMemberRole(member: ProjectMember, role: 'VIEWER' | 'EDITOR') {
    const project = this.membersTarget();
    if (!project || member.isOwner || member.role === role) return;
    this.projectService.updateMemberRole(project.id, member.userId, role).subscribe({
      next: () => this.loadMembers(project.id),
      error: (err) => this.toast(err?.message ?? this.t().updateFailed),
    });
  }

  removeMember(member: ProjectMember) {
    const project = this.membersTarget();
    if (!project || member.isOwner) return;
    this.projectService.removeMember(project.id, member.userId).subscribe({
      next: () => { this.toast(this.t().memberRemoved, true); this.loadMembers(project.id); },
      error: (err) => this.toast(err?.message ?? this.t().updateFailed),
    });
  }

  leaveProject(project: Project, event: Event) {
    event.stopPropagation();
    this.openConfirm(
      this.t().leaveTitle,
      `${this.t().leaveMsgPrefix}${project.name}${this.t().leaveMsgSuffix}`,
      () => {
        this.projectService.leaveProject(project.id).subscribe({
          next: () => { this.toast(this.t().leftProject, true); this.loadProjects(); },
          error: (err) => this.toast(err?.message ?? this.t().updateFailed),
        });
      },
    );
  }

  private toast(detail: string, success = false) {
    this.messageService.add({
      severity: 'secondary',
      summary: success ? this.t().toastDone : this.t().toastError,
      detail,
      key: 'br',
    });
  }
}
