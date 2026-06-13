import { ChangeDetectionStrategy, Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { UserService } from '../../services/user-service';
import { AuthService } from '../../services/auth';
import { ThemeService } from '../../services/theme';
import { LangService } from '../../services/lang';
import { FileSystem } from '../../services/file-system';
import { PlanService } from '../../services/plan';
import { InfinityLife } from '../../services/infinity-life';
import { Reminder } from '../../interfaces/infinity-life/reminder.model';

@Component({
  selector: 'app-side-bar',
  imports: [RouterLink, RouterLinkActive, AvatarModule, DatePipe],
  templateUrl: './side-bar.html',
  styleUrl: './side-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SideBar implements OnInit {
  public authService  = inject(AuthService);
  public userService  = inject(UserService);
  public themeService = inject(ThemeService);
  public langService  = inject(LangService);
  private fileSystem  = inject(FileSystem);
  public planService  = inject(PlanService);
  private infinityLife = inject(InfinityLife);
  private router       = inject(Router);

  profile = this.userService.profile;

  avatarUrl  = computed(() => this.profile()?.avatarUrl || '');
  username   = computed(() => this.profile()?.username || '');
  email      = computed(() => this.profile()?.email || '');
  trashCount = this.fileSystem.trashCount;

  // Хранилище
  planInfo   = this.planService.planInfo;
  storage    = computed(() => this.planInfo()?.storage ?? null);
  planLabel  = computed(() => this.planInfo()?.planLabel ?? '');
  percent    = computed(() => Math.min(100, Math.round(this.storage()?.percent ?? 0)));
  usedLabel  = computed(() => this.planService.formatBytes(this.storage()?.usedBytes ?? 0));
  limitLabel = computed(() => this.planService.formatBytes(this.storage()?.limitBytes ?? 0));
  barColor   = computed(() => this.planService.getStorageColor(this.percent()));
  showUpsell = computed(() => {
    const plan = this.planInfo()?.planType;
    return this.percent() >= 80 && (plan === 'spark' || plan === 'pulse');
  });

  // Напоминания
  reminders     = this.infinityLife.reminders;
  reminderCount = this.infinityLife.reminderCount;
  overdueCount  = this.infinityLife.overdueCount;
  remindersOpen = signal(false);

  isDark = computed(() => this.themeService.theme() === 'dark');
  t      = computed(() => this.langService.t().sidebar);

  ngOnInit() {
    this.fileSystem.loadTrash();
    this.planService.loadPlanInfo().subscribe({ error: () => {} });
    this.infinityLife.loadReminders().subscribe({ error: () => {} });
  }

  toggleReminders(event: Event) {
    event.stopPropagation();
    this.remindersOpen.update(v => !v);
  }

  openReminder(r: Reminder) {
    this.remindersOpen.set(false);
    this.router.navigate(['/projects', r.projectId]);
  }

  snoozeReminder(r: Reminder, event: Event) {
    event.stopPropagation();
    this.infinityLife.snoozeReminder(r.id).subscribe({ error: () => {} });
  }

  @HostListener('document:click')
  closeReminders() {
    if (this.remindersOpen()) this.remindersOpen.set(false);
  }
}
