import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { InfinityLife } from '../../../../services/infinity-life';
import { MessageService } from 'primeng/api';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Subtask, Task } from '../../../../interfaces/infinity-life/tasks.model';
import { TableModule } from "primeng/table";
import { ButtonModule } from 'primeng/button';
import { Toast } from "primeng/toast";
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { InplaceModule } from 'primeng/inplace';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { ConfirmationService } from 'primeng/api';
import { MenuItem } from 'primeng/api';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { MenuModule } from 'primeng/menu';
import { CheckboxModule } from 'primeng/checkbox';
import { CreateTaskDto } from '../../../../interfaces/infinity-life/create-task.model';
import { CreateSubtaskDto } from '../../../../interfaces/infinity-life/create-subtask.model';
import { DragDropModule } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-kanban-board',
  imports: [
  DragDropModule,
  CheckboxModule,
  MenuModule,
  TagModule,
  ProgressBarModule,
  ToastModule,
  SelectModule,
  TextareaModule,
  TieredMenuModule,
  InplaceModule,  
  TableModule, 
  ButtonModule, 
  Toast, 
  DialogModule, 
  InputTextModule, 
  CommonModule, 
  FormsModule,
  CardModule
  ],
  templateUrl: './kanban-board.html',
  styleUrl: './kanban-board.scss',
  providers:[MessageService, ConfirmationService,],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KanbanBoard implements OnInit {
  private tasksService = inject(InfinityLife);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  columns = this.tasksService.columns;
  isLoading = this.tasksService.isLoading.asReadonly();

  showRenameColumnDialog = signal(false);
  columnToRename = signal<any>(null);
  newColumnNameForRename = signal('');
  showCreateColumnDialog = signal(false);
  showCreateTaskDialog = signal(false);
  showTaskDetailDialog = signal(false);
  selectedTask = signal<Task | null>(null);
  currentColumnId = signal<string | null>(null);
  newColumnName = signal('');
  newSubtaskTitle = signal('');
  newTask = signal<CreateTaskDto>({
    title: '',
    notes: '',
    priority: 'MEDIUM',
    columnId: null
  });

  columnMenuItems: MenuItem[] | undefined;

  constructor() {
    this.loadBoard();
  }

  loadBoard() {
    this.tasksService.loadBoard().subscribe({
      next: (columns) => {
        const newColumns = columns.map(col => ({ ...col, tasks: [...(col.tasks || [])] }));
        this.columns.set(newColumns);
      },
      error: () => {
        this.messageService.add({ 
          severity: 'secondary', 
          summary: 'Ошибка', 
          detail: 'Не удалось загрузить доску',
          key: 'br'
        });
      }
    });
  }

  refreshBoard() {
    this.loadBoard();
  }

  ngOnInit() {
    this.columnMenuItems = [
      {
        label: 'Переименовать',
        icon: 'pi pi-pencil',
      },
      {
        separator: true
      },
      {
        label: 'Удалить колонку',
        icon: 'pi pi-trash',
      }
    ];
  }

  openColumnMenu(event: Event, column: any, menu: any) {
    if (!menu || !this.columnMenuItems) return;
    const menuItems = this.columnMenuItems.map(item => ({
      ...item,
      data: column,
      command: () => {
        if (item.label === 'Переименовать') {
          this.renameColumn(column);
        } 
        else if (item.label === 'Удалить колонку') {
          const overlay = document.querySelector('.p-menu-overlay');
          if (overlay) {
            overlay.remove();
          }
          this.deleteColumnAction(column);
        }
      }
    }));
    menu.model = menuItems;
    menu.toggle(event);
  }

deleteColumnAction(column: any) {
  if (!column) return;
  this.cdr.markForCheck();
  this.tasksService.deleteColumn(column.id).subscribe({
    next: () => {
      this.messageService.add({ 
        severity: 'seconadry', 
        summary: 'Успех', 
        detail: 'Колонка удалена' 
      });
      this.loadBoard();
    },
    error: () => {
      this.messageService.add({ 
        severity: 'secondary', 
        summary: 'Ошибка', 
        detail: 'Не удалось удалить колонку' 
      });
    }
  });
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
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Успех', 
          detail: 'Колонка переименована' 
        });
        this.refreshBoard();
        this.closeRenameDialog();
      },
      error: () => {
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Ошибка', 
          detail: 'Не удалось переименовать колонку' 
        });
      }
    });
  }

  renameColumn(column: any) {
    if (!column) return;

    this.columnToRename.set({ ...column });
    this.newColumnNameForRename.set(column.name || '');
    this.showRenameColumnDialog.set(true);
  }

  closeRenameDialog() {
    this.showRenameColumnDialog.set(false);
    this.columnToRename.set(null);
    this.newColumnNameForRename.set('');
  }

  addSubtask(taskId: string, closeCallback: any) {
    const title = this.newSubtaskTitle().trim();
    if (!title) return;

    const dto: CreateSubtaskDto = { title, taskId };

    this.tasksService.createSubtask(dto).subscribe({
      next: (newSubtask) => {
        const current = this.selectedTask();
        if (current && current.id === taskId) {
          const newSubtasks = [...(current.subtasks || []), newSubtask];

          const completedCount = newSubtasks.filter((s: any) => s.isCompleted).length;
          const progress = newSubtasks.length > 0 
            ? Math.round((completedCount / newSubtasks.length) * 100) 
            : 0;

          this.selectedTask.set({
            ...current,
            subtasks: newSubtasks,
            progress
          });
        }

        this.newSubtaskTitle.set('');
        closeCallback();
      },
      error: () => this.messageService.add({ 
        severity: 'secondary', 
        summary: 'Ошибка', 
        detail: 'Не удалось добавить подзадачу',
        key: 'br'
      })
    });
  }

  deleteTask(taskId: string) {
    if (!confirm('Удалить задачу и все её подзадачи?')) {
      return;
    }

    this.tasksService.deleteTask(taskId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Успех',
          detail: 'Задача удалена'
        });
        this.loadBoard();
        this.showTaskDetailDialog.set(false);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: 'Не удалось удалить задачу'
        });
      }
    });
  }

  deleteSubtask(subtaskId: string, taskId: string) {
    if (!confirm('Удалить подзадачу?')) {
      return;
    }

    this.tasksService.deleteSubtask(subtaskId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Успех',
          detail: 'Подзадача удалена'
        });
        const current = this.selectedTask();
        if (current && current.id === taskId) {
          const newSubtasks = (current.subtasks || []).filter(s => s.id !== subtaskId);
          
          const completedCount = newSubtasks.filter(s => s.isCompleted).length;
          const newProgress = newSubtasks.length > 0 
            ? Math.round((completedCount / newSubtasks.length) * 100) 
            : 0;

          this.selectedTask.set({
            ...current,
            subtasks: newSubtasks,
            progress: newProgress
          });
        }
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: 'Не удалось удалить подзадачу'
        });
      }
    });
  }
drop(event: CdkDragDrop<Task[]>, newColumnId: string) {
  if (event.previousContainer === event.container) {
    moveItemInArray(
      event.container.data, 
      event.previousIndex, 
      event.currentIndex
    );
  } else {
    const task = event.previousContainer.data[event.previousIndex];
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );

    this.tasksService.moveTaskToColumn(task.id, newColumnId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'secondary',
          summary: 'Успех',
          detail: 'Задача перемещена'
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'secondary',
          summary: 'Ошибка',
          detail: 'Не удалось переместить задачу'
        });
        this.loadBoard();
      }
    });
  }
}

  priorities = [
  { label: 'Высокий', value: 'HIGH' },
  { label: 'Средний', value: 'MEDIUM' },
  { label: 'Низкий', value: 'LOW' }
];
  openCreateTaskDialog(columnId: string) {
    this.currentColumnId.set(columnId);
    this.newTask.set({
      title: '',
      notes: '',
      priority: 'MEDIUM',
      columnId: columnId
    });
    this.showCreateTaskDialog.set(true);
  }

  private calculateProgress(subtasks: Subtask[] | undefined): number {
    if (!subtasks || subtasks.length === 0) return 0;
    const completedCount = subtasks.filter(s => s.isCompleted === true).length;
    return Math.round((completedCount / subtasks.length) * 100);
  }

  openTaskDetail(task: Task) {
    const taskWithProgress = {
      ...task,
      progress: this.calculateProgress(task.subtasks)
    };

    this.selectedTask.set(taskWithProgress);
    this.showTaskDetailDialog.set(true);
  }

  createTask() {
    const task = this.newTask();
    
    if (!task.title?.trim()) {
      this.messageService.add({ 
        severity: 'secondary', 
        summary: 'Ошибка', 
        detail: 'Название задачи обязательно',
        key: 'br'
      });
      return;
    }

    this.tasksService.createTask(task).subscribe({
      next: () => {
        this.messageService.add({ 
          severity: 'secondary', 
          summary: 'Успех', 
          detail: 'Задача создана',
          key: 'br'
        });
        this.loadBoard();
        this.showCreateTaskDialog.set(false);
      },
      error: () => {
        this.messageService.add({ 
          severity: 'secondary', 
          summary: 'Ошибка', 
          detail: 'Не удалось создать задачу',
          key: 'br'
        });
      }
    });
  }
  
  toggleCompletion(item: Task | Subtask) {
    const isSubtask = 'taskId' in item;

    if (isSubtask) {
      this.optimisticSubtaskToggle(item as Subtask);
    } else {
      this.tasksService.toggleTaskCompletion(item.id).subscribe({
        next: () => this.refreshBoard(),
        error: () => {
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Ошибка', 
            detail: 'Не удалось изменить статус задачи' 
          });
        }
      });
    }
  }

  private optimisticSubtaskToggle(subtask: Subtask) {
    const currentTask = this.selectedTask();
    if (!currentTask?.subtasks?.length) return;
    const updatedSubtasks = currentTask.subtasks.map(s =>
      s.id === subtask.id
        ? { ...s, isCompleted: !s.isCompleted }
        : s
    );
    const completedCount = updatedSubtasks.filter(s => s.isCompleted).length;
    const newProgress = updatedSubtasks.length > 0
      ? Math.round((completedCount / updatedSubtasks.length) * 100)
      : 0;
    this.selectedTask.set({
      ...currentTask,
      subtasks: updatedSubtasks,
      progress: newProgress
    });
    this.tasksService.toggleSubtaskCompletion(subtask.id).subscribe({
      error: () => {
        this.revertOptimisticSubtaskToggle(subtask.id);
        this.messageService.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: 'Не удалось изменить статус подзадачи'
        });
      }
    });
  }

  private revertOptimisticSubtaskToggle(subtaskId: string) {
    const currentTask = this.selectedTask();
    if (!currentTask?.subtasks?.length) return;

    const revertedSubtasks = currentTask.subtasks.map(s =>
      s.id === subtaskId
        ? { ...s, isCompleted: !s.isCompleted }
        : s
    );

    const completedCount = revertedSubtasks.filter(s => s.isCompleted).length;
    const newProgress = revertedSubtasks.length > 0
      ? Math.round((completedCount / revertedSubtasks.length) * 100)
      : 0;

    this.selectedTask.set({
      ...currentTask,
      subtasks: revertedSubtasks,
      progress: newProgress
    });
  }

  createColumn() {
    const name = this.newColumnName().trim();
    if (!name) return;
    this.tasksService.createColumn({ name }).subscribe({
      next: () => {
        this.refreshBoard();  
        this.showCreateColumnDialog.set(false);
        this.newColumnName.set('');
        this.messageService.add({ severity: 'secondary', summary: 'Успех', detail: 'Колонка создана', key: 'br' });
      },
      error: () => this.messageService.add({ severity: 'secondary', summary: 'Ошибка', detail: 'Не удалось создать колонку', key: 'br' })
    });
  }

  createColumnAndClose(inplace: any) {
    const name = this.newColumnName().trim();
    if (!name) return;

    this.tasksService.createColumn({ name }).subscribe({
      next: () => {
        this.refreshBoard();  
        this.newColumnName.set('');
        this.messageService.add({ 
          severity: 'secondary', 
          summary: 'Успех', 
          detail: 'Колонка создана',
          key: 'br'
        });
        inplace.deactivate();
      },
      error: () => {
        this.messageService.add({ 
          severity: 'secondary', 
          summary: 'Ошибка', 
          detail: 'Не удалось создать колонку',
          key: 'br'
        });
      }
    });
  }
  
  getPriorityLabel(p: string): string {
    const map: any = { HIGH: 'Высокий', MEDIUM: 'Средний', LOW: 'Низкий' };
    return map[p] || p;
  }

  getPrioritySeverity(p: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | null {
    switch (p) {
      case 'HIGH':
        return 'danger';
      case 'MEDIUM':
        return 'warn';
      case 'LOW':
        return 'info';       
      default:
        return 'secondary';
    }
  }

}
