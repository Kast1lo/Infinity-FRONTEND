import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { UserService } from '../../services/user-service';
import { AuthService } from '../../services/auth';
import { ThemeService } from '../../services/theme';
import { LangService } from '../../services/lang';
import { FileSystem } from '../../services/file-system';
import { PlanService } from '../../services/plan';

@Component({
  selector: 'app-side-bar',
  imports: [RouterLink, RouterLinkActive, AvatarModule],
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

  isDark = computed(() => this.themeService.theme() === 'dark');
  t      = computed(() => this.langService.t().sidebar);

  ngOnInit() {
    this.fileSystem.loadTrash();
    this.planService.loadPlanInfo().subscribe({ error: () => {} });
  }
}
