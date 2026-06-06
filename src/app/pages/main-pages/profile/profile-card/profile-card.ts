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
import { LangService } from '../../../../services/lang';


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
  protected readonly langService  = inject(LangService);
  private   readonly messageService = inject(MessageService);
  private   readonly cdr = inject(ChangeDetectorRef);

  t = computed(() => this.langService.t().pages.profile);

  profile   = this.userService.profile;
  isLoading = this.userService.isLoading;
  planInfo  = this.planService.planInfo;

  avatarUrl = computed(() => this.profile()?.avatarUrl || '');

  allTasks = this.infinityLife.allTasks;

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
    this.infinityLife.loadAllUserTasks().subscribe();
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

  daysWord(n: number): string {
    const t = this.langService.t().pages.profile;
    if (this.langService.lang() === 'en') return n === 1 ? t.dayOne : t.dayMany;
    const mod10 = n % 10, mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 14) return t.dayMany;
    if (mod10 === 1) return t.dayOne;
    if (mod10 >= 2 && mod10 <= 4) return t.dayFew;
    return t.dayMany;
  }

  activatePromo() {
    const code = this.promoCode().trim();
    if (!code) return;

    this.promoLoading.set(true);
    const t = this.langService.t().pages.profile;

    this.planService.activatePromo(code).subscribe({
      next: (res) => {
        this.promoLoading.set(false);
        this.promoCode.set('');
        this.showPromoInput.set(false);
        this.messageService.add({
          severity: 'success',
          summary:  t.toastDone,
          detail:   res.message,
          life:     4000,
        });
      },
      error: (err) => {
        this.promoLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary:  t.toastError,
          detail:   err.error?.message || t.promoError,
          life:     4000,
        });
      },
    });
  }
}