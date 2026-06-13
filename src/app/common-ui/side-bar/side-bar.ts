import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { UserService } from '../../services/user-service';
import { AuthService } from '../../services/auth';
import { ThemeService } from '../../services/theme';
import { LangService } from '../../services/lang';
import { FileSystem } from '../../services/file-system';

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

  profile = this.userService.profile;

  avatarUrl  = computed(() => this.profile()?.avatarUrl || '');
  username   = computed(() => this.profile()?.username || '');
  email      = computed(() => this.profile()?.email || '');
  trashCount = this.fileSystem.trashCount;

  isDark = computed(() => this.themeService.theme() === 'dark');
  t      = computed(() => this.langService.t().sidebar);

  ngOnInit() {
    this.fileSystem.loadTrash();
  }
}
