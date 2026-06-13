import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { UserService } from '../../../services/user-service';
import { AuthService } from '../../../services/auth';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinner } from 'primeng/progressspinner';
import { CommonModule } from '@angular/common';
import { ProfileCard } from "./profile-card/profile-card";

@Component({
  selector: 'app-profile',
  imports: [
    AvatarModule,
    ButtonModule,
    CommonModule, ProfileCard],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Profile {

}
