import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { SideBar } from '../../../common-ui/side-bar/side-bar';
import { UserService } from '../../../services/user-service';
import { BackgroundService } from '../../../services/background';
import { UpdateProfile } from '../../../interfaces/profile-interfaces/update-profile.model';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { Button } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';
import { AvatarModule } from 'primeng/avatar';
import { PasswordModule } from 'primeng/password';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-edit-profile',
  imports: [
    SideBar,
    FormsModule,
    InputTextModule,
    Button,
    ToastModule,
    FileUploadModule,
    AvatarModule,
    PasswordModule,
  ],
  providers: [MessageService],
  templateUrl: './edit-profile.html',
  styleUrl: './edit-profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditProfile {
  userService    = inject(UserService);
  bgService      = inject(BackgroundService);
  messageService = inject(MessageService);

  profile   = this.userService.profile;
  isLoading = this.userService.isLoading;

  // ─── Смена логина ───
  newUsername = signal('');

  hasUsernameChanges = computed(() => !!this.newUsername());

  // ─── Смена пароля ───
  currentPassword = signal('');
  newPassword     = signal('');
  confirmPassword = signal('');
  isChangingPwd   = signal(false);
  pwdError        = signal<string | null>(null);

  hasPasswordChanges = computed(() =>
    !!this.currentPassword() && !!this.newPassword() && !!this.confirmPassword()
  );

  initials = computed(() => {
    const name = this.profile()?.username;
    if (!name) return '??';
    return name.substring(0, 2).toUpperCase();
  });

  // ─── Аватар ───
  fu           = viewChild.required<FileUpload>('fu');
  selectedFile = signal<File | null>(null);
  isUploading  = signal(false);

  // ─── Сохранить логин ───
  saveUsername() {
    if (!this.newUsername()) return;
    const updates: UpdateProfile = { username: this.newUsername() };

    this.userService.updateProfile(updates).subscribe({
      next: () => {
        this.newUsername.set('');
        this.messageService.add({
          severity: 'success',
          summary:  'Готово',
          detail:   'Логин успешно изменён',
          life:     3000,
        });
      },
      error: err => {
        this.messageService.add({
          severity: 'error',
          summary:  'Ошибка',
          detail:   err.error?.message || 'Не удалось изменить логин',
          life:     4000,
        });
      },
    });
  }

  // ─── Сменить пароль ───
  changePassword() {
    this.pwdError.set(null);

    if (this.newPassword() !== this.confirmPassword()) {
      this.pwdError.set('Новый пароль и подтверждение не совпадают');
      return;
    }

    if (this.newPassword().length < 6) {
      this.pwdError.set('Новый пароль должен содержать минимум 6 символов');
      return;
    }

    this.isChangingPwd.set(true);

    this.userService.changePassword(this.currentPassword(), this.newPassword()).subscribe({
      next: () => {
        this.isChangingPwd.set(false);
        this.currentPassword.set('');
        this.newPassword.set('');
        this.confirmPassword.set('');
        this.messageService.add({
          severity: 'success',
          summary:  'Готово',
          detail:   'Пароль успешно изменён',
          life:     3000,
        });
      },
      error: err => {
        this.isChangingPwd.set(false);
        this.pwdError.set(err.error?.message || 'Не удалось изменить пароль');
      },
    });
  }

  // ─── Аватар ───
  onFileSelected(event: any) {
    const file = event.files?.[0];
    if (file) this.selectedFile.set(file);
  }

  onAvatarUpload() {
    const file = this.selectedFile();
    if (!file) return;
    this.isUploading.set(true);

    this.userService.uploadAvatar(file).subscribe({
      next: () => {
        this.isUploading.set(false);
        this.selectedFile.set(null);
        this.fu()?.clear();
        this.messageService.add({
          severity: 'success',
          summary:  'Готово',
          detail:   'Аватар обновлён',
          life:     3000,
        });
      },
      error: err => {
        this.isUploading.set(false);
        this.messageService.add({
          severity: 'error',
          summary:  'Ошибка',
          detail:   err.error?.message || 'Ошибка загрузки аватара',
          life:     4000,
        });
      },
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