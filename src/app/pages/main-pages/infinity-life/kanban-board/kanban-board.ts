import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { InfinityLife } from '../../../../services/infinity-life';
import { MessageService } from 'primeng/api';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Task } from '../../../../interfaces/infinity-life/tasks.model';
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

@Component({
  selector: 'app-kanban-board',
  imports: [
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
  changeDetection: ChangeDetectionStrategy.Default
})
export class KanbanBoard implements OnInit {
  private tasksService = inject(InfinityLife);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  columns = this.tasksService.columns;
  isLoading = this.tasksService.isLoading.asReadonly();

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
        command: (event) => this.renameColumn(event.item?.['data'])
      },
      {
        separator: true
      },
      {
        label: 'Удалить колонку',
        icon: 'pi pi-trash',
        command: (event) => this.confirmDeleteColumn(event.item?.['data'])
      }
    ];
  }

  getColumnMenu(column: any): MenuItem[] {
    return (this.columnMenuItems || []).map(item => ({
      ...item,
      data: column
    }));
  }

  renameColumn(column: any) {
    if (!column) return;
    const newName = prompt('Новое название колонки:', column.name);
    if (newName && newName.trim() !== column.name) {
      this.tasksService.updateColumn(column.id, { name: newName.trim() }).subscribe({
        next: () => {
          this.refreshBoard();
          this.messageService.add({ severity: 'success', summary: 'Успех', detail: 'Колонка переименована', key: 'br' });
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Ошибка', detail: 'Не удалось переименовать', key: 'br' })
      });
    }
  }

  confirmDeleteColumn(column: any) {
    if (!column) return;

    this.confirmationService.confirm({
      message: `Удалить колонку "${column.name}" и все задачи внутри неё?`,
      header: 'Подтверждение удаления',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.tasksService.deleteColumn(column.id).subscribe({
          next: () => this.loadBoard(),
          error: () => this.messageService.add({ severity: 'error', summary: 'Ошибка', detail: 'Не удалось удалить колонку' })
        });
      }
    });
  }

  addSubtask(taskId: string, closeCallback: any) {
    const title = this.newSubtaskTitle().trim();
    if (!title) return;

    const dto: CreateSubtaskDto = { title, taskId };

    this.tasksService.createSubtask(dto).subscribe({
      next: (newSubtask) => {
        this.updateTaskInDialog(newSubtask);
        this.newSubtaskTitle.set('');
        closeCallback();
        this.messageService.add({ severity: 'success', summary: 'Успех', detail: 'Подзадача добавлена' });
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Ошибка', detail: 'Не удалось добавить подзадачу' })
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
      this.tasksService.moveTaskToColumn(task.id, newColumnId)
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

  openTaskDetail(task: Task) {
    this.selectedTask.set(task);
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
  
  toggleCompletion(task: Task) {
    this.tasksService.toggleTaskCompletion(task.id).subscribe({
      next: (updatedTaskFromServer) => {
        this.updateTaskInDialog(updatedTaskFromServer);
      },
      error: () => {
        this.messageService.add({ 
          severity: 'secondary', 
          summary: 'Ошибка', 
          detail: 'Не удалось изменить статус',
          key: 'br'
        });
      }
    });
  }

  private updateTaskInDialog(updated: Task) {
    const current = this.selectedTask();
    if (!current) return;
    if (current.id === updated.id) {
      this.selectedTask.set({ ...current, ...updated });
      return;
    }
    if (current.subtasks && updated.parentId === current.id) {
      const updatedSubtasks = current.subtasks.map(sub => 
        sub.id === updated.id ? { ...sub, ...updated } : sub
      );
      this.selectedTask.set({
        ...current,
        subtasks: updatedSubtasks
      });
    }
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
