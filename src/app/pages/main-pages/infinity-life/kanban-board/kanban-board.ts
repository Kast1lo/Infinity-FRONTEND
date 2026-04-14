import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { InfinityLife } from '../../../../services/infinity-life';
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
  ],
  templateUrl: './kanban-board.html',
  styleUrl: './kanban-board.scss',
  providers: [MessageService, ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KanbanBoard implements OnInit {
  private tasksService = inject(InfinityLife);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  readonly today = new Date();

  columns = this.tasksService.columns;
  isLoading = this.tasksService.isLoading.asReadonly();

  // ─── Column dialogs ───
  showCreateColumnDialog = signal(false);
  showRenameColumnDialog = signal(false);
  columnToRename = signal<any>(null);
  newColumnName = signal('');
  newColumnNameForRename = signal('');

  // ─── Task dialogs ───
  showCreateTaskDialog = signal(false);
  showTaskDetailDialog = signal(false);
  selectedTask = signal<Task | null>(null);
  currentColumnId = signal<string | null>(null);
  newSubtaskTitle = signal('');

  // ─── Date signals (Date | null для p-datepicker) ───
  newTaskDueDate = signal<Date | null>(null);
  detailDueDate = signal<Date | null>(null);

  // ─── Confirm ───
  confirmVisible = signal(false);
  confirmTitle = signal('');
  confirmMessage = signal('');
  private confirmCallback: (() => void) | null = null;

  newTask = signal<CreateTaskDto>({
    title: '',
    notes: '',
    priority: 'MEDIUM',
    columnId: null,
    dueDate: null,
    color: null,
  });

  readonly labelColors = [
    { value: null,      label: 'Нет',         hex: 'transparent' },
    { value: '#e05555', label: 'Красный',     hex: '#e05555' },
    { value: '#e08c2a', label: 'Оранжевый',   hex: '#e08c2a' },
    { value: '#d4b84a', label: 'Жёлтый',     hex: '#d4b84a' },
    { value: '#4caf76', label: 'Зелёный',     hex: '#4caf76' },
    { value: '#4a9eff', label: 'Синий',       hex: '#4a9eff' },
    { value: '#9c6bda', label: 'Фиолетовый',  hex: '#9c6bda' },
  ];

  readonly priorities = [
    { label: 'Высокий', value: 'HIGH' },
    { label: 'Средний', value: 'MEDIUM' },
    { label: 'Низкий',  value: 'LOW' },
  ];

  columnMenuItems: MenuItem[] | undefined;

  constructor() {
    this.loadBoard();
  }

  ngOnInit() {
    this.columnMenuItems = [
      { label: 'Переименовать', icon: 'pi pi-pencil' },
      { separator: true },
      { label: 'Удалить колонку', icon: 'pi pi-trash' },
    ];
  }

  // ─── Confirm ───

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

  // ─── Date utils ───

  isoToDate(iso: string | null | undefined): Date | null {
    if (!iso) return null;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }

  dateToIso(date: Date | null): string | null {
    return date ? date.toISOString() : null;
  }

  // ─── Board ───

  loadBoard() {
    this.tasksService.loadBoard().subscribe({
      next: (columns) => {
        this.columns.set(columns.map(col => ({ ...col, tasks: [...(col.tasks || [])] })));
      },
      error: () => this.toast('Не удалось загрузить доску'),
    });
  }

  refreshBoard() {
    this.loadBoard();
  }

  // ─── Columns ───

  openColumnMenu(event: Event, column: any, menu: any) {
    if (!menu || !this.columnMenuItems) return;
    menu.model = this.columnMenuItems.map(item => ({
      ...item,
      command: () => {
        if (item.label === 'Переименовать') this.renameColumn(column);
        if (item.label === 'Удалить колонку') {
          this.openConfirm(
            'Удалить колонку',
            `Удалить колонку «${column.name}» и все её задачи?`,
            () => this.deleteColumnAction(column),
          );
        }
      },
    }));
    menu.toggle(event);
  }

  createColumn() {
    const name = this.newColumnName().trim();
    if (!name) return;
    this.tasksService.createColumn({ name }).subscribe({
      next: () => {
        this.refreshBoard();
        this.showCreateColumnDialog.set(false);
        this.newColumnName.set('');
        this.toast('Колонка создана', true);
      },
      error: () => this.toast('Не удалось создать колонку'),
    });
  }

  createColumnAndClose(inplace: any) {
    const name = this.newColumnName().trim();
    if (!name) return;
    this.tasksService.createColumn({ name }).subscribe({
      next: () => {
        this.refreshBoard();
        this.newColumnName.set('');
        this.toast('Колонка создана', true);
        inplace.deactivate();
      },
      error: () => this.toast('Не удалось создать колонку'),
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
        this.toast('Колонка переименована', true);
        this.refreshBoard();
        this.closeRenameDialog();
      },
      error: () => this.toast('Не удалось переименовать колонку'),
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
        this.toast('Колонка удалена', true);
        this.loadBoard();
      },
      error: () => this.toast('Не удалось удалить колонку'),
    });
  }

  // ─── Tasks ───

  openCreateTaskDialog(columnId: string) {
    this.currentColumnId.set(columnId);
    this.newTask.set({ title: '', notes: '', priority: 'MEDIUM', columnId, dueDate: null, color: null });
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
      this.toast('Название задачи обязательно');
      return;
    }
    const dto = { ...task, dueDate: this.dateToIso(this.newTaskDueDate()) };
    this.tasksService.createTask(dto).subscribe({
      next: () => {
        this.toast('Задача создана', true);
        this.loadBoard();
        this.showCreateTaskDialog.set(false);
      },
      error: () => this.toast('Не удалось создать задачу'),
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
      error: () => this.toast('Не удалось сохранить'),
    });
  }

  onDetailDateChange(date: Date | null) {
    this.detailDueDate.set(date);
    this.saveTaskField('dueDate', date);
  }

  deleteTask(taskId: string) {
    this.openConfirm('Удалить задачу', 'Удалить задачу и все её подзадачи?', () => {
      this.tasksService.deleteTask(taskId).subscribe({
        next: () => {
          this.toast('Задача удалена', true);
          this.loadBoard();
          this.showTaskDetailDialog.set(false);
        },
        error: () => this.toast('Не удалось удалить задачу'),
      });
    });
  }

  // ─── Subtasks ───

  addSubtask(taskId: string, closeCallback: any) {
    const title = this.newSubtaskTitle().trim();
    if (!title) return;
    this.tasksService.createSubtask({ title, taskId }).subscribe({
      next: (newSubtask) => {
        const current = this.selectedTask();
        if (current?.id === taskId) {
          const newSubtasks = [...(current.subtasks || []), newSubtask];
          this.selectedTask.set({ ...current, subtasks: newSubtasks, progress: this.calculateProgress(newSubtasks) });
        }
        this.newSubtaskTitle.set('');
        closeCallback();
      },
      error: () => this.toast('Не удалось добавить подзадачу'),
    });
  }

  deleteSubtask(subtaskId: string, taskId: string) {
    this.openConfirm('Удалить подзадачу', 'Вы уверены?', () => {
      this.tasksService.deleteSubtask(subtaskId).subscribe({
        next: () => {
          this.toast('Подзадача удалена', true);
          const current = this.selectedTask();
          if (current?.id === taskId) {
            const newSubtasks = (current.subtasks || []).filter(s => s.id !== subtaskId);
            this.selectedTask.set({ ...current, subtasks: newSubtasks, progress: this.calculateProgress(newSubtasks) });
          }
        },
        error: () => this.toast('Не удалось удалить подзадачу'),
      });
    });
  }

  // ─── Completion ───

  toggleCompletion(item: Task | Subtask) {
    if ('taskId' in item) {
      this.optimisticSubtaskToggle(item as Subtask);
    } else {
      this.tasksService.toggleTaskCompletion(item.id).subscribe({
        next: () => this.refreshBoard(),
        error: () => this.toast('Не удалось изменить статус задачи'),
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
    this.tasksService.toggleSubtaskCompletion(subtask.id).subscribe({
      error: () => {
        this.revertOptimisticSubtaskToggle(subtask.id);
        this.toast('Не удалось изменить статус подзадачи');
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
  }

  private calculateProgress(subtasks: Subtask[] | undefined): number {
    if (!subtasks?.length) return 0;
    return Math.round((subtasks.filter(s => s.isCompleted).length / subtasks.length) * 100);
  }

  // ─── Drag & Drop ───

  drop(event: CdkDragDrop<Task[]>, newColumnId: string) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      const task = event.previousContainer.data[event.previousIndex];
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
      this.tasksService.moveTaskToColumn(task.id, newColumnId).subscribe({
        next: () => this.toast('Задача перемещена', true),
        error: () => { this.toast('Не удалось переместить задачу'); this.loadBoard(); },
      });
    }
  }

  // ─── Helpers ───

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
    return new Date(dueDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  }

  getPriorityLabel(p: string): string {
    const map: Record<string, string> = { HIGH: 'Высокий', MEDIUM: 'Средний', LOW: 'Низкий' };
    return map[p] ?? p;
  }

  getPrioritySeverity(p: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | null {
    const map: Record<string, any> = { HIGH: 'danger', MEDIUM: 'warn', LOW: 'info' };
    return map[p] ?? 'secondary';
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