import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import Cropper from 'cropperjs';
import { SideBar } from '../../../common-ui/side-bar/side-bar';
import { UserService } from '../../../services/user-service';
import { BackgroundService } from '../../../services/background';
import { UpdateProfile } from '../../../interfaces/profile-interfaces/update-profile.model';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { Button } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
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
  cdr            = inject(ChangeDetectorRef);

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
  selectedFile  = signal<File | null>(null);
  avatarPreview = signal<string | null>(null);
  isUploading   = signal(false);

  // ─── Кроппер ───
  showCropper  = signal(false);
  cropImageSrc = signal<string>('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cropper: any = null;

  @ViewChild('cropperImage') cropperImageRef!: ElementRef<HTMLImageElement>;

  // ─── Сохранить логин ───
  saveUsername() {
    if (!this.newUsername()) return;
    const updates: UpdateProfile = { username: this.newUsername() };

    this.userService.updateProfile(updates).subscribe({
      next: () => {
        this.newUsername.set('');
        this.messageService.add({
          severity: 'secondary',
          summary:  'Готово',
          detail:   'Логин успешно изменён',
          life:     3000,
        });
      },
      error: (err: any) => {
        this.messageService.add({
          severity: 'secondary',
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
          severity: 'secondary',
          summary:  'Готово',
          detail:   'Пароль успешно изменён',
          life:     3000,
        });
      },
      error: (err: any) => {
        this.isChangingPwd.set(false);
        this.pwdError.set(err.error?.message || 'Не удалось изменить пароль');
      },
    });
  }

  // ─── Аватар: выбор файла → открыть кроппер ───
  onAvatarFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.cropImageSrc.set(e.target?.result as string);
      this.showCropper.set(true);
      this.cdr.detectChanges();
      setTimeout(() => this.initCropper(), 50);
    };
    reader.readAsDataURL(file);

    // Сброс input чтобы можно было выбрать тот же файл повторно
    (event.target as HTMLInputElement).value = '';
  }

  private initCropper() {
    if (this.cropper) {
      this.cropper.destroy();
      this.cropper = null;
    }

    const img = this.cropperImageRef?.nativeElement;
    if (!img) return;

    // Используем any чтобы избежать конфликтов типов между v1 и v2
    const CropperClass = Cropper as any;

    this.cropper = new CropperClass(img, {
      aspectRatio:              1,
      viewMode:                 1,
      dragMode:                 'move',
      autoCropArea:             0.85,
      cropBoxResizable:         false,
      cropBoxMovable:           false,
      toggleDragModeOnDblclick: false,
      background:               false,
      guides:                   false,
      center:                   false,
      highlight:                false,
    });
  }

  // ─── Кроппер: подтвердить ───
  confirmCrop() {
    if (!this.cropper) return;

    // getCropperCanvas — метод в v2, getCroppedCanvas — в v1
    // Определяем автоматически какой метод доступен
    const canvas: HTMLCanvasElement =
      typeof this.cropper.getCropperCanvas === 'function'
        ? this.cropper.getCropperCanvas({ width: 256, height: 256 })
        : this.cropper.getCroppedCanvas({ width: 256, height: 256 });

    if (!canvas) return;

    this.avatarPreview.set(canvas.toDataURL('image/jpeg', 0.9));

    canvas.toBlob(
      (blob: Blob | null) => {
        if (blob) {
          const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
          this.selectedFile.set(file);
          this.cdr.markForCheck();
        }
      },
      'image/jpeg',
      0.9,
    );

    this.closeCropper();
  }

  // ─── Кроппер: закрыть ───
  closeCropper() {
    this.showCropper.set(false);
    if (this.cropper) {
      this.cropper.destroy();
      this.cropper = null;
    }
  }

  // ─── Аватар: отмена выбора ───
  cancelAvatarSelect() {
    this.selectedFile.set(null);
    this.avatarPreview.set(null);
  }

  // ─── Аватар: загрузка на сервер ───
  onAvatarUpload() {
    const file = this.selectedFile();
    if (!file) return;
    this.isUploading.set(true);

    this.userService.uploadAvatar(file).subscribe({
      next: () => {
        this.isUploading.set(false);
        this.selectedFile.set(null);
        this.avatarPreview.set(null);
        this.cdr.markForCheck()
        this.messageService.add({
          severity: 'secondary',
          summary:  'Готово',
          detail:   'Аватар обновлён',
          life:     3000,
        });
      },
      error: (err: any) => {
        this.isUploading.set(false);
        this.messageService.add({
          severity: 'secondary',
          summary:  'Ошибка',
          detail:   err.error?.message || 'Ошибка загрузки аватара',
          life:     4000,
        });
      },
    });
  }

  // ─── Фон приложения ───
  onCustomBg(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.bgService.setCustom(file);
      (event.target as HTMLInputElement).value = '';
    }
  }
}