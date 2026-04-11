import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { SideBar } from "../../../common-ui/side-bar/side-bar";
import { UserService } from '../../../services/user-service';
import { BackgroundService } from '../../../services/background';
import { UpdateProfile } from '../../../interfaces/profile-interfaces/update-profile.model';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { Button } from "primeng/button";
import { ToastModule } from 'primeng/toast';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';
import { AvatarModule } from 'primeng/avatar';

@Component({
  selector: 'app-edit-profile',
  imports: [SideBar, FormsModule, InputTextModule, Button, ToastModule, FileUploadModule, AvatarModule],
  templateUrl: './edit-profile.html',
  styleUrl: './edit-profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditProfile {
  userService = inject(UserService);
  bgService   = inject(BackgroundService);

  profile   = this.userService.profile;
  isLoading = this.userService.isLoading;
  error     = this.userService.error;

  newUsername = signal<string>('');
  newEmail    = signal<string>('');

  hasChanges = computed(() => {
    const user = this.userService.profile();
    if (!user) return false;
    return !!this.newUsername() || !!this.newEmail();
  });

  initials = computed(() => {
    const name = this.profile()?.username;
    if (!name) return '??';
    return name.substring(0, 2).toUpperCase();
  });

  fu = viewChild.required<FileUpload>('fu');
  selectedFile = signal<File | null>(null);
  isUploading  = signal(false);
  uploadError  = signal<string | null>(null);

  saveChanges() {
    const updates: UpdateProfile = {};
    if (this.newUsername()) updates.username = this.newUsername();
    if (this.newEmail())    updates.email    = this.newEmail();
    if (Object.keys(updates).length === 0) return;

    this.userService.updateProfile(updates).subscribe({
      next: () => {
        this.newUsername.set('');
        this.newEmail.set('');
        alert('Профиль обновлён!');
      },
      error: err => alert('Ошибка: ' + (err.error?.message || 'Неизвестная ошибка'))
    });
  }

  onFileSelected(event: any) {
    const file = event.files?.[0];
    if (file) this.selectedFile.set(file);
  }

  onClear() { this.selectedFile.set(null); }

  onAvatarUpload() {
    const file = this.selectedFile();
    if (!file) return;
    this.isUploading.set(true);
    this.uploadError.set(null);
    this.userService.uploadAvatar(file).subscribe({
      next: () => {
        this.isUploading.set(false);
        this.selectedFile.set(null);
        this.fu()?.clear();
      },
      error: (err) => {
        this.isUploading.set(false);
        this.uploadError.set(err.error?.message || 'Ошибка загрузки');
      }
    });
  }

  onCustomBg(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.bgService.setCustom(file);
      (event.target as HTMLInputElement).value = '';
    }
  }
}