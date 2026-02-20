import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { InfinityLife } from '../../../../services/infinity-life';
import { UserService } from '../../../../services/user-service';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CreateTaskDto } from '../../../../interfaces/infinity-life/create-task.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TextareaModule } from 'primeng/textarea';
import { FloatLabel } from "primeng/floatlabel";


@Component({
  selector: 'app-create-task',
  imports: [SelectModule, InputTextModule, ButtonModule, CommonModule, FormsModule, ToastModule, ConfirmDialogModule, TextareaModule, FloatLabel],
  templateUrl: './create-task.html',
  styleUrl: './create-task.scss',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateTask {
  protected readonly tasksService = inject(InfinityLife);
  protected readonly messageService = inject(MessageService);
  protected readonly userService = inject(UserService);
    priorities = signal([
    { label: 'Высокий', value: 'HIGH' },
    { label: 'Средний', value: 'MEDIUM' },
    { label: 'Низкий', value: 'LOW' }
  ]);
  newTask = signal<CreateTaskDto>({
    title: '',
    priority: 'MEDIUM',
    notes: '',
    parentId: null
  });
  isLoading = this.tasksService.isLoading.asReadonly();
  parentOptions = computed(() => this.tasksService.tasks());
  createTask(){
    const task = this.newTask();
    if (!task.title.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Ошибка', detail: 'Название задачи не может быть пустым' });
      return;
    }
    this.tasksService.createTask(task).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Успех', detail: 'Задача создана' });
        this.newTask.set({
          title: '',
          priority: 'MEDIUM'
        });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Ошибка', detail: 'Не удалось создать задачу' });
      }
    });
  }
}
