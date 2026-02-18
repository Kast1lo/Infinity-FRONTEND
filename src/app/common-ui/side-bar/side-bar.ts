import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { UserService } from '../../services/user-service';
import { AuthService } from '../../services/auth';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { ButtonModule } from 'primeng/button';
import { RouterLink } from "@angular/router";
import { UserProfile } from '../../interfaces/profile-interfaces/user-profile.model';


@Component({
  selector: 'app-side-bar',
  imports: [AvatarModule,
    AvatarGroupModule, ButtonModule, RouterLink],
  templateUrl: './side-bar.html',
  styleUrl: './side-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SideBar {
  public authService = inject(AuthService)
  public userService = inject(UserService)

  profile = this.userService.profile;
  isLoading = this.userService.isLoading;
  error = this.userService.error;
  placeholderUrl = 'infinityLogo.svg';
  avatarUrl = computed(() => {
    const profile = this.profile();
    return profile?.avatarUrl || '';
  });
  logout(){
    this.authService.logout();
  }
}
