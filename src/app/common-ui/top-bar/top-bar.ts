import { ChangeDetectionStrategy, Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { UserService } from '../../services/user-service';
import { AuthService } from '../../services/auth';
import { ThemeService } from '../../services/theme';
import { LangService } from '../../services/lang';
import { InfinityLife } from '../../services/infinity-life';
import { Reminder } from '../../interfaces/infinity-life/reminder.model';
import { SearchBar } from '../search-bar/search-bar';

@Component({
  selector: 'app-top-bar',
  imports: [RouterLink, RouterLinkActive, DatePipe, SearchBar],
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopBar implements OnInit {
  public authService  = inject(AuthService);
  public userService  = inject(UserService);
  public themeService = inject(ThemeService);
  public langService  = inject(LangService);
  private infinityLife = inject(InfinityLife);
  private router       = inject(Router);

  profile   = this.userService.profile;
  avatarUrl = computed(() => this.profile()?.avatarUrl || '');
  username  = computed(() => this.profile()?.username || '');
  initials  = computed(() => {
    const name = this.profile()?.username;
    if (!name) return '∞';
    return name.substring(0, 2).toUpperCase();
  });

  // Напоминания
  reminders     = this.infinityLife.reminders;
  reminderCount = this.infinityLife.reminderCount;
  overdueCount  = this.infinityLife.overdueCount;
  remindersOpen = signal(false);

  isDark = computed(() => this.themeService.theme() === 'dark');
  t      = computed(() => this.langService.t().sidebar);

  ngOnInit() {
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
