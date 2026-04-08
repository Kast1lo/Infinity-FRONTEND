import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { KnobModule } from 'primeng/knob';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { FileSystem } from '../../../../services/file-system';
import { InfinityLife } from '../../../../services/infinity-life';
import { AuthService } from '../../../../services/auth';
import { UserService } from '../../../../services/user-service';


@Component({
  selector: 'app-profile-card',
  imports: [AvatarModule, AvatarGroupModule, KnobModule, ButtonModule, FormsModule, RouterModule, CommonModule],
  templateUrl: './profile-card.html',
  styleUrl: './profile-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileCard implements OnInit {
  
  protected readonly userService  = inject(UserService);
  protected readonly authService  = inject(AuthService);
  protected readonly infinityLife = inject(InfinityLife);
  protected readonly fileSystem   = inject(FileSystem);
 
  profile   = this.userService.profile;
  isLoading = this.userService.isLoading;
 
  avatarUrl = computed(() => this.profile()?.avatarUrl || '');
 
  allTasks = computed(() =>
    this.infinityLife.columns().flatMap((col: any) => col.tasks ?? [])
  );
 
  totalTasks = computed(() => this.allTasks().length);
 
  completedTasks = computed(() =>
    this.allTasks().filter((t: any) => t.isCompleted).length
  );
 
  knobValue = 0;
  private readonly fs: any = this.fileSystem;
 
  totalFiles   = computed(() => this.fs.files().length);
  totalFolders = computed(() => this.fs.folders().length);
 
  constructor() {
    effect(() => {
      const total = this.totalTasks();
      if (total === 0) { this.knobValue = 0; return; }
      this.knobValue = Math.round((this.completedTasks() / total) * 100);
    });
  }
 
  ngOnInit() {
    this.infinityLife.loadBoard().subscribe();
    this.fs.loadTree();
    this.fs.loadFiles(null);
  }
}
