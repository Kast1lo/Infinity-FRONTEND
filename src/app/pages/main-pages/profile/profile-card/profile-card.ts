import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { KnobModule } from 'primeng/knob';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { FileSystem } from '../../../../services/file-system';
import { InfinityLife } from '../../../../services/infinity-life';
import { AuthService } from '../../../../services/auth';
import { UserService } from '../../../../services/user-service';
import { PlanService } from '../../../../services/plan';


@Component({
  selector:        'app-profile-card',
  imports:         [
    AvatarModule, AvatarGroupModule, KnobModule,
    ButtonModule, FormsModule, RouterModule,
    CommonModule, ToastModule,
  ],
  providers:       [MessageService],
  templateUrl:     './profile-card.html',
  styleUrl:        './profile-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileCard implements OnInit {

  protected readonly userService  = inject(UserService);
  protected readonly authService  = inject(AuthService);
  protected readonly infinityLife = inject(InfinityLife);
  protected readonly fileSystem   = inject(FileSystem);
  protected readonly planService  = inject(PlanService);
  private   readonly messageService = inject(MessageService);
  private   readonly cdr = inject(ChangeDetectorRef);

  profile   = this.userService.profile;
  isLoading = this.userService.isLoading;
  planInfo  = this.planService.planInfo;

  avatarUrl = computed(() => this.profile()?.avatarUrl || '');

  allTasks = computed(() =>
    this.infinityLife.columns().flatMap((col: any) => col.tasks ?? [])
  );

  totalTasks     = computed(() => this.allTasks().length);
  completedTasks = computed(() => this.allTasks().filter((t: any) => t.isCompleted).length);

  knobValue = 0;
  private readonly fs: any = this.fileSystem;

  totalFiles   = this.fileSystem.totalFilesCount;
  totalFolders = computed(() => this.fs.folders().length);

  promoCode       = signal('');
  promoLoading    = signal(false);
  showPromoInput  = signal(false);

  readonly planBadgeMap: Record<string, { label: string; class: string }> = {
    spark:   { label: 'Spark',   class: 'badge--spark'   },
    pulse:   { label: 'Pulse',   class: 'badge--pulse'   },
    horizon: { label: 'Horizon', class: 'badge--horizon' },
    eternal: { label: 'Eternal', class: 'badge--eternal' },
  };

  constructor() {
    effect(() => {
      const total = this.totalTasks();
      this.knobValue = total === 0 ? 0 : Math.round((this.completedTasks() / total) * 100);
      this.cdr.markForCheck();
    });
  }

  ngOnInit() {
    this.infinityLife.loadBoard().subscribe();
    this.fs.loadFilesStats();
    this.planService.loadPlanInfo().subscribe();
  }

  get storageUsedLabel(): string {
    const info = this.planInfo();
    if (!info) return '0 Б';
    return this.planService.formatBytes(info.storage.usedBytes);
  }

  get storageLimitLabel(): string {
    const info = this.planInfo();
    if (!info) return '0 Б';
    return this.planService.formatBytes(info.storage.limitBytes);
  }

  get storagePercent(): number {
    return this.planInfo()?.storage.percent ?? 0;
  }

  get storageColor(): string {
    return this.planService.getStorageColor(this.storagePercent);
  }

  activatePromo() {
    const code = this.promoCode().trim();
    if (!code) return;

    this.promoLoading.set(true);

    this.planService.activatePromo(code).subscribe({
      next: (res) => {
        this.promoLoading.set(false);
        this.promoCode.set('');
        this.showPromoInput.set(false);
        this.messageService.add({
          severity: 'success',
          summary:  'Готово',
          detail:   res.message,
          life:     4000,
        });
      },
      error: (err) => {
        this.promoLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary:  'Ошибка',
          detail:   err.error?.message || 'Неверный промокод',
          life:     4000,
        });
      },
    });
  }
}