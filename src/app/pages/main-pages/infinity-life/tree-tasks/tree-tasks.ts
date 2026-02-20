import { Component, inject, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TreeModule } from 'primeng/tree';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { ConfirmationService, MessageService, TreeNode } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { InfinityLife } from '../../../../services/infinity-life';
import { Task } from '../../../../interfaces/infinity-life/tasks.model';
import { CreateTaskDto } from '../../../../interfaces/infinity-life/create-task.model';
import { InputText } from "primeng/inputtext";
import { FormsModule } from '@angular/forms';
import { Dialog } from "primeng/dialog";
import { CheckboxModule } from 'primeng/checkbox';

@Component({
  selector: 'app-tree-tasks',
  imports: [CommonModule, 
    TreeModule, 
    ButtonModule, 
    ProgressBarModule, 
    ConfirmDialogModule, 
    ToastModule, 
    TagModule, 
    InputText, 
    FormsModule, 
    Dialog, 
    CheckboxModule],
  templateUrl: './tree-tasks.html',
  styleUrl: './tree-tasks.scss',
  providers: [ConfirmationService, MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TreeTasks {
  protected readonly tasksService = inject(InfinityLife);
  protected readonly confirmationService = inject(ConfirmationService);
  protected readonly messageService = inject(MessageService);

  tasks = this.tasksService.tasks.asReadonly();
  isLoading = this.tasksService.isLoading.asReadonly();

  showSubtaskDialog = signal(false);
  newSubtaskTitle = signal('');
  currentParentId = signal<string | null>(null);

  treeNodes = computed<TreeNode[]>(() => this.buildTreeNodes(this.tasks()));

  constructor() {
    this.tasksService.loadAllTasks().subscribe();
  }

  private buildTreeNodes(tasks: Task[]): TreeNode[] {
    const map = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    tasks.forEach(task => {
      const node: TreeNode = {
        label: task.title,
        data: task,
        expanded: false,
        children: []
      };
      map.set(task.id, node);

      if (task.parentId) {
        const parent = map.get(task.parentId);
        if (parent) {
          parent.children!.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  toggleCompletion(task: Task) {
    this.tasksService.toggleTaskCompletion(task.id).subscribe({
      next: () => {
        this.tasksService.loadAllTasks().subscribe();
        this.messageService.add({
          severity: 'success',
          summary: 'Успех',
          detail: task.isCompleted ? 'Задача отменена' : 'Задача выполнена'
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: 'Не удалось изменить статус'
        });
      }
    });
  }

  confirmDelete(id: string) {
    this.confirmationService.confirm({
      message: 'Удалить задачу и все её подзадачи?',
      accept: () => {
        this.tasksService.deleteTask(id).subscribe({
          next: () => {
            this.tasksService.loadAllTasks().subscribe();
            this.messageService.add({
              severity: 'success',
              summary: 'Успех',
              detail: 'Задача удалена'
            });
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Ошибка',
              detail: 'Не удалось удалить'
            });
          }
        });
      }
    });
  }

  openAddSubtaskDialog(parentId: string) {
    this.currentParentId.set(parentId);
    this.newSubtaskTitle.set('');
    this.showSubtaskDialog.set(true);
  }

  closeSubtaskDialog() {
    this.showSubtaskDialog.set(false);
    this.newSubtaskTitle.set('');
    this.currentParentId.set(null);
  }

  saveSubtask() {
    const title = this.newSubtaskTitle().trim();
    if (!title) return;

    const dto: CreateTaskDto = {
      title,
      parentId: this.currentParentId()!,
      priority: 'MEDIUM'
    };

    this.tasksService.createTask(dto).subscribe({
      next: () => {
        this.tasksService.loadAllTasks().subscribe();
        this.messageService.add({
          severity: 'success',
          summary: 'Успех',
          detail: 'Подзадача создана'
        });
        this.closeSubtaskDialog();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: 'Не удалось создать подзадачу'
        });
      }
    });
  }

  confirmDeleteSubtask(id: string, event: Event) {
  this.confirmationService.confirm({
    target: event.target as EventTarget,
    message: 'Удалить эту подзадачу?',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Да, удалить',
    rejectLabel: 'Отмена',
    accept: () => {
      this.tasksService.deleteTask(id).subscribe({
        next: () => {
          this.tasksService.loadAllTasks().subscribe();
          this.messageService.add({
            severity: 'success',
            summary: 'Успех',
            detail: 'Подзадача удалена'
          });
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
  });
}

  getPriorityClass(p: string): string {
    return p?.toLowerCase() ?? 'low';
  }
}
