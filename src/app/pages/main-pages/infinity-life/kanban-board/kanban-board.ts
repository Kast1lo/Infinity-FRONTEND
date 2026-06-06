import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { InfinityLife } from '../../../../services/infinity-life';
import { ProjectService } from '../../../../services/project';
import { MessageService, ConfirmationService, MenuItem } from 'primeng/api';
import { CdkDragDrop, moveItemInArray, transferArrayItem, DragDropModule } from '@angular/cdk/drag-drop';
import { Subtask, Task } from '../../../../interfaces/infinity-life/tasks.model';
import { CreateTaskDto } from '../../../../interfaces/infinity-life/create-task.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InplaceModule } from 'primeng/inplace';
import { InputTextModule } from 'primeng/inputtext';
import { MenuModule } from 'primeng/menu';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { Toast, ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { LangService } from '../../../../services/lang';

@Component({
  selector: 'app-kanban-board',
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    ButtonModule,
    CardModule,
    CheckboxModule,
    DatePickerModule,
    DialogModule,
    InplaceModule,
    InputTextModule,
    MenuModule,
    ProgressBarModule,
    SelectModule,
    TagModule,
    TextareaModule,
    Toast,
    ToastModule,
    TooltipModule,
  ],
  templateUrl: './kanban-board.html',
  styleUrl: './kanban-board.scss',
  providers: [MessageService, ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KanbanBoard implements OnInit {
  private tasksService = inject(InfinityLife);
  private projectService = inject(ProjectService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  readonly langService = inject(LangService);

  readonly projectId   = input.required<string>();
  readonly projectName = input<string>('');

  t = computed(() => this.langService.t().pages.kanban);

  goToProjects() {
    this.router.navigate(['/projects']);
  }

  readonly today = new Date();

  columns = this.tasksService.columns;
  isLoading = this.tasksService.isLoading.asReadonly();

  showCreateColumnDialog = signal(false);
  showRenameColumnDialog = signal(false);
  columnToRename = signal<any>(null);
  newColumnName = signal('');
  newColumnNameForRename = signal('');

  showCreateTaskDialog = signal(false);
  showTaskDetailDialog = signal(false);
  selectedTask = signal<Task | null>(null);
  currentColumnId = signal<string | null>(null);
  newSubtaskTitle = signal('');
  creatingSubtask = signal(false);

  newTaskDueDate = signal<Date | null>(null);
  detailDueDate = signal<Date | null>(null);

  confirmVisible = signal(false);
  confirmTitle = signal('');
  confirmMessage = signal('');
  private confirmCallback: (() => void) | null = null;

  showAiDialog = signal(false);
  aiDescription = signal('');
  aiIncludeSubtasks = signal(true);
  aiLoading = signal(false);

  newTask = signal<CreateTaskDto>({
    projectId: '',
    title: '',
    notes: '',
    priority: 'MEDIUM',
    columnId: null,
    dueDate: null,
    color: null,
  });

  readonly labelColors = computed(() => {
    const k = this.langService.t().pages.kanban;
    return [
      { value: null,      label: k.colorNone,    hex: 'transparent' },
      { value: '#e05555', label: k.colorRed,      hex: '#e05555' },
      { value: '#e08c2a', label: k.colorOrange,   hex: '#e08c2a' },
      { value: '#d4b84a', label: k.colorYellow,   hex: '#d4b84a' },
      { value: '#4caf76', label: k.colorGreen,    hex: '#4caf76' },
      { value: '#4a9eff', label: k.colorBlue,     hex: '#4a9eff' },
      { value: '#9c6bda', label: k.colorPurple,   hex: '#9c6bda' },
    ];
  });

  readonly priorities = computed(() => {
    const k = this.langService.t().pages.kanban;
    return [
      { label: k.priorityHigh,   value: 'HIGH' },
      { label: k.priorityMedium, value: 'MEDIUM' },
      { label: k.priorityLow,    value: 'LOW' },
    ];
  });

  columnMenuItems: MenuItem[] | undefined;

  constructor() {
    effect(() => {
      const id = this.projectId();
      if (id) this.loadBoard();
    });
  }

  ngOnInit() {
    const k = this.langService.t().pages.kanban;
    this.columnMenuItems = [
      { label: k.menuRename, icon: 'pi pi-pencil' },
      { separator: true },
      { label: k.menuDeleteCol, icon: 'pi pi-trash' },
    ];
  }


  openConfirm(title: string, message: string, callback: () => void) {
    this.confirmTitle.set(title);
    this.confirmMessage.set(message);
    this.confirmCallback = callback;
    this.confirmVisible.set(true);
  }

  onConfirmAccept() {
    this.confirmVisible.set(false);
    if (this.confirmCallback) {
      this.confirmCallback();
      this.confirmCallback = null;
    }
  }

  onConfirmReject() {
    this.confirmVisible.set(false);
    this.confirmCallback = null;
  }


  isoToDate(iso: string | null | undefined): Date | null {
    if (!iso) return null;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }

  dateToIso(date: Date | null): string | null {
    return date ? date.toISOString() : null;
  }


  loadBoard() {
    const id = this.projectId();
    if (!id) return;
    this.tasksService.loadBoard(id).subscribe({
      next: (columns) => {
        this.columns.set(columns.map(col => ({ ...col, tasks: [...(col.tasks || [])] })));
      },
      error: () => this.toast(this.langService.t().pages.kanban.boardLoadFailed),
    });
  }

  refreshBoard() {
    this.loadBoard();
  }


  openColumnMenu(event: Event, column: any, menu: any) {
    const k = this.langService.t().pages.kanban;
    menu.model = [
      {
        label: k.menuRename,
        icon: 'pi pi-pencil',
        command: () => this.renameColumn(column),
      },
      { separator: true },
      {
        label: k.menuDeleteCol,
        icon: 'pi pi-trash',
        command: () => this.openConfirm(
          k.deleteColTitle,
          `${k.deleteColMsgPrefix}${column.name}${k.deleteColMsgSuffix}`,
          () => this.deleteColumnAction(column),
        ),
      },
    ];
    menu.toggle(event);
  }

  createColumn() {
    const name = this.newColumnName().trim();
    if (!name) return;
    this.tasksService.createColumn({ projectId: this.projectId(), name }).subscribe({
      next: () => {
        this.refreshBoard();
        this.showCreateColumnDialog.set(false);
        this.newColumnName.set('');
        this.toast(this.langService.t().pages.kanban.colCreated, true);
      },
      error: () => this.toast(this.langService.t().pages.kanban.colCreateFailed),
    });
  }

  createColumnAndClose(inplace: any) {
    const name = this.newColumnName().trim();
    if (!name) return;
    this.tasksService.createColumn({ projectId: this.projectId(), name }).subscribe({
      next: () => {
        this.refreshBoard();
        this.newColumnName.set('');
        this.toast(this.langService.t().pages.kanban.colCreated, true);
        inplace.deactivate();
      },
      error: () => this.toast(this.langService.t().pages.kanban.colCreateFailed),
    });
  }

  renameColumn(column: any) {
    if (!column) return;
    this.columnToRename.set({ ...column });
    this.newColumnNameForRename.set(column.name || '');
    this.showRenameColumnDialog.set(true);
  }

  saveColumnRename() {
    const column = this.columnToRename();
    const newName = this.newColumnNameForRename().trim();
    if (!column || !newName || newName === column.name) {
      this.closeRenameDialog();
      return;
    }
    this.tasksService.updateColumn(column.id, { name: newName }).subscribe({
      next: () => {
        this.toast(this.langService.t().pages.kanban.colRenamed, true);
        this.refreshBoard();
        this.closeRenameDialog();
      },
      error: () => this.toast(this.langService.t().pages.kanban.colRenameFailed),
    });
  }

  closeRenameDialog() {
    this.showRenameColumnDialog.set(false);
    this.columnToRename.set(null);
    this.newColumnNameForRename.set('');
  }

  deleteColumnAction(column: any) {
    if (!column) return;
    this.cdr.markForCheck();
    this.tasksService.deleteColumn(column.id).subscribe({
      next: () => {
        this.toast(this.langService.t().pages.kanban.colDeleted, true);
        this.loadBoard();
      },
      error: () => this.toast(this.langService.t().pages.kanban.colDeleteFailed),
    });
  }


  openCreateTaskDialog(columnId: string) {
    this.currentColumnId.set(columnId);
    this.newTask.set({
      projectId: this.projectId(),
      title:     '',
      notes:     '',
      priority:  'MEDIUM',
      columnId,
      dueDate:   null,
      color:     null,
    });
    this.newTaskDueDate.set(null);
    this.showCreateTaskDialog.set(true);
  }

  openTaskDetail(task: Task) {
    this.selectedTask.set({ ...task, progress: this.calculateProgress(task.subtasks) });
    this.detailDueDate.set(this.isoToDate(task.dueDate));
    this.showTaskDetailDialog.set(true);
  }

  createTask() {
    const task = this.newTask();
    if (!task.title?.trim()) {
      this.toast(this.langService.t().pages.kanban.taskTitleRequired);
      return;
    }
    const dto = { ...task, projectId: this.projectId(), dueDate: this.dateToIso(this.newTaskDueDate()) };
    this.tasksService.createTask(dto).subscribe({
      next: () => {
        this.toast(this.langService.t().pages.kanban.taskCreated, true);
        this.loadBoard();
        this.showCreateTaskDialog.set(false);
      },
      error: () => this.toast(this.langService.t().pages.kanban.taskCreateFailed),
    });
  }

  saveTaskField(field: 'dueDate' | 'color', value: any) {
    const task = this.selectedTask();
    if (!task) return;
    const dto: any = {};
    if (field === 'dueDate') dto.dueDate = value instanceof Date ? value.toISOString() : null;
    else dto.color = value;
    this.tasksService.updateTask(task.id, dto).subscribe({
      next: () => {
        this.selectedTask.set({ ...task, ...dto });
        this.loadBoard();
      },
      error: () => this.toast(this.langService.t().pages.kanban.taskSaveFailed),
    });
  }

  onDetailDateChange(date: Date | null) {
    this.detailDueDate.set(date);
    this.saveTaskField('dueDate', date);
  }

  deleteTask(taskId: string) {
    const k = this.langService.t().pages.kanban;
    this.openConfirm(k.deleteTaskTitle, k.deleteTaskMsg, () => {
      this.tasksService.deleteTask(taskId).subscribe({
        next: () => {
          this.toast(k.taskDeleted, true);
          this.loadBoard();
          this.showTaskDetailDialog.set(false);
        },
        error: () => this.toast(k.taskDeleteFailed),
      });
    });
  }


  addSubtask(taskId: string, closeCallback: any) {
    if (this.creatingSubtask()) return;
    const title = this.newSubtaskTitle().trim();
    if (!title) return;
    this.creatingSubtask.set(true);
    this.tasksService.createSubtask({ title, taskId })
      .pipe(finalize(() => this.creatingSubtask.set(false)))
      .subscribe({
        next: (newSubtask) => {
          const current = this.selectedTask();
          if (current?.id === taskId) {
            const newSubtasks = [...(current.subtasks || []), newSubtask];
            this.selectedTask.set({ ...current, subtasks: newSubtasks, progress: this.calculateProgress(newSubtasks) });
          }
          this.updateTaskInBoard(taskId, t => ({
            ...t,
            subtasks: [...(t.subtasks || []), newSubtask],
          }));
          this.newSubtaskTitle.set('');
          closeCallback();
        },
        error: () => this.toast(this.langService.t().pages.kanban.subtaskAddFailed),
      });
  }

  deleteSubtask(subtaskId: string, taskId: string) {
    const k = this.langService.t().pages.kanban;
    this.openConfirm(k.deleteSubtaskTitle, k.deleteSubtaskMsg, () => {
      this.tasksService.deleteSubtask(subtaskId).subscribe({
        next: () => {
          this.toast(k.subtaskDeleted, true);
          const current = this.selectedTask();
          if (current?.id === taskId) {
            const newSubtasks = (current.subtasks || []).filter(s => s.id !== subtaskId);
            this.selectedTask.set({ ...current, subtasks: newSubtasks, progress: this.calculateProgress(newSubtasks) });
          }
          this.updateTaskInBoard(taskId, t => ({
            ...t,
            subtasks: (t.subtasks || []).filter(s => s.id !== subtaskId),
          }));
        },
        error: () => this.toast(this.langService.t().pages.kanban.subtaskDeleteFailed),
      });
    });
  }

  private updateTaskInBoard(taskId: string, updater: (t: Task) => Task) {
    this.columns.update(cols => cols.map((col: any) => ({
      ...col,
      tasks: (col.tasks || []).map((t: Task) => t.id === taskId ? updater(t) : t),
    })));
  }


  toggleCompletion(item: Task | Subtask) {
    if ('taskId' in item) {
      this.optimisticSubtaskToggle(item as Subtask);
    } else {
      this.tasksService.toggleTaskCompletion(item.id).subscribe({
        next: () => this.refreshBoard(),
        error: () => this.toast(this.langService.t().pages.kanban.taskStatusFailed),
      });
    }
  }

  private optimisticSubtaskToggle(subtask: Subtask) {
    const current = this.selectedTask();
    if (!current?.subtasks?.length) return;
    const updated = current.subtasks.map(s =>
      s.id === subtask.id ? { ...s, isCompleted: !s.isCompleted } : s,
    );
    this.selectedTask.set({ ...current, subtasks: updated, progress: this.calculateProgress(updated) });
    this.updateTaskInBoard(current.id, t => ({
      ...t,
      subtasks: (t.subtasks || []).map(s => s.id === subtask.id ? { ...s, isCompleted: !s.isCompleted } : s),
    }));
    this.tasksService.toggleSubtaskCompletion(subtask.id).subscribe({
      error: () => {
        this.revertOptimisticSubtaskToggle(subtask.id);
        this.toast(this.langService.t().pages.kanban.subtaskStatusFailed);
      },
    });
  }

  private revertOptimisticSubtaskToggle(subtaskId: string) {
    const current = this.selectedTask();
    if (!current?.subtasks?.length) return;
    const reverted = current.subtasks.map(s =>
      s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s,
    );
    this.selectedTask.set({ ...current, subtasks: reverted, progress: this.calculateProgress(reverted) });
    this.updateTaskInBoard(current.id, t => ({
      ...t,
      subtasks: (t.subtasks || []).map(s => s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s),
    }));
  }

  private calculateProgress(subtasks: Subtask[] | undefined): number {
    if (!subtasks?.length) return 0;
    return Math.round((subtasks.filter(s => s.isCompleted).length / subtasks.length) * 100);
  }


  drop(event: CdkDragDrop<Task[]>, newColumnId: string) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      const task = event.previousContainer.data[event.previousIndex];
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
      this.tasksService.moveTaskToColumn(task.id, newColumnId).subscribe({
        next: () => this.toast(this.langService.t().pages.kanban.taskMoved, true),
        error: () => { this.toast(this.langService.t().pages.kanban.taskMoveFailed); this.loadBoard(); },
      });
    }
  }


  isDueSoon(dueDate: string | null | undefined): boolean {
    if (!dueDate) return false;
    const diff = new Date(dueDate).getTime() - Date.now();
    return diff > 0 && diff < 48 * 60 * 60 * 1000;
  }

  isOverdue(dueDate: string | null | undefined): boolean {
    if (!dueDate) return false;
    return new Date(dueDate).getTime() < Date.now();
  }

  formatDueDate(dueDate: string | null | undefined): string {
    if (!dueDate) return '';
    const locale = this.langService.lang() === 'ru' ? 'ru-RU' : 'en-US';
    return new Date(dueDate).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  }

  getPriorityLabel(p: string): string {
    const k = this.langService.t().pages.kanban;
    const map: Record<string, string> = { HIGH: k.priorityHigh, MEDIUM: k.priorityMedium, LOW: k.priorityLow };
    return map[p] ?? p;
  }

  getPrioritySeverity(p: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | null {
    const map: Record<string, any> = { HIGH: 'danger', MEDIUM: 'warn', LOW: 'info' };
    return map[p] ?? 'secondary';
  }

  openAiDialog() {
    this.aiDescription.set('');
    this.aiIncludeSubtasks.set(true);
    this.showAiDialog.set(true);
  }

  runAiGeneration() {
    const description = this.aiDescription().trim();
    if (description.length < 10) {
      this.toast('Опишите проект подробнее (минимум 10 символов)');
      return;
    }
    this.aiLoading.set(true);
    this.projectService.generateTasksWithAi(this.projectId(), {
      description,
      includeSubtasks: this.aiIncludeSubtasks(),
    })
      .pipe(finalize(() => this.aiLoading.set(false)))
      .subscribe({
        next: (res) => {
          const count = res.tasks?.length ?? 0;
          this.toast(`Создано ${count} задач(и) через AI`, true);
          this.showAiDialog.set(false);
          this.loadBoard();
        },
        error: (err) => this.toast(err?.message ?? 'AI-генерация не удалась'),
      });
  }

  private toast(detail: string, success = false) {
    const k = this.langService.t().pages.kanban;
    this.messageService.add({
      severity: 'secondary',
      summary: success ? k.toastDone : k.toastError,
      detail,
      key: 'br',
    });
  }
}