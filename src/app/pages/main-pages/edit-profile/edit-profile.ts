import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { SideBar } from "../../../common-ui/side-bar/side-bar";
import { UserService } from '../../../services/user-service';
import { UpdateProfile } from '../../../interfaces/profile-interfaces/update-profile.model';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { Button } from "primeng/button";
import { MessageService } from 'primeng/api';
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
  authService = inject(UserService);

  profile = this.userService.profile;
  isLoading = this.userService.isLoading;
  error = this.userService.error;

  newUsername = signal<string>('');
  newEmail = signal<string>('');

  hasChanges = computed(() => {
    const user = this.userService.profile();
    if (!user) return false;
    return !!this.newUsername() || !!this.newEmail();
  });

  saveChanges() {
    const updates: UpdateProfile = {};
    if (this.newUsername()) updates.username = this.newUsername();
    if (this.newEmail()) updates.email = this.newEmail();

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

  fu = viewChild.required<FileUpload>('fu');

  selectedFile = signal<File | null>(null);

  isUploading = signal(false);
  uploadError = signal<string | null>(null);
  initials = computed(() => {
    const name = this.profile()?.username;
    if (!name) return '??';
    return name.substring(0, 2).toUpperCase();
  });
  onFileSelected(event: any) {
    const file = event.files?.[0];
    if (file) {
      this.selectedFile.set(file);
    }
  }
  onClear() {
    this.selectedFile.set(null);
  }
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
}
