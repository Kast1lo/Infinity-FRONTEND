import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../../../services/auth';
import { UserService } from '../../../../services/user-service';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';

@Component({
  selector: 'app-profile-card',
  imports: [AvatarModule, AvatarGroupModule],
  templateUrl: './profile-card.html',
  styleUrl: './profile-card.scss',
})
export class ProfileCard {
  
  protected readonly userService = inject(UserService);
  protected readonly authService = inject(AuthService);
  retry() {
    this.userService.getProfile().subscribe();
  }
  profile = this.userService.profile;
  isLoading = this.userService.isLoading;
  error = this.userService.error;
  placeholderUrl = 'infinityLogo.svg';
  avatarUrl = computed(() => {
    const profile = this.profile();
    return profile?.avatarUrl || '';
  });
}
