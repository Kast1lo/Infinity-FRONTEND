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
import { LangService } from '../../../services/lang';
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
  langService    = inject(LangService);

  t = computed(() => this.langService.t().pages.editProfile);

  profile   = this.userService.profile;
  isLoading = this.userService.isLoading;

  newUsername = signal('');

  hasUsernameChanges = computed(() => !!this.newUsername());

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

  selectedFile  = signal<File | null>(null);
  avatarPreview = signal<string | null>(null);
  isUploading   = signal(false);

  showCropper  = signal(false);
  cropImageSrc = signal<string>('');
  private cropper: any = null;

  @ViewChild('cropperImage') cropperImageRef!: ElementRef<HTMLImageElement>;

  saveUsername() {
    if (!this.newUsername()) return;
    const updates: UpdateProfile = { username: this.newUsername() };
    const t = this.langService.t().pages.editProfile;

    this.userService.updateProfile(updates).subscribe({
      next: () => {
        this.newUsername.set('');
        this.messageService.add({
          severity: 'secondary',
          summary:  t.toastDone,
          detail:   t.loginSaved,
          life:     3000,
        });
      },
      error: (err: any) => {
        this.messageService.add({
          severity: 'secondary',
          summary:  t.toastError,
          detail:   err.error?.message || t.loginFailed,
          life:     4000,
        });
      },
    });
  }

  changePassword() {
    this.pwdError.set(null);
    const t = this.langService.t().pages.editProfile;

    if (this.newPassword() !== this.confirmPassword()) {
      this.pwdError.set(t.pwdMismatch);
      return;
    }

    if (this.newPassword().length < 6) {
      this.pwdError.set(t.pwdTooShort);
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
          summary:  t.toastDone,
          detail:   t.pwdSaved,
          life:     3000,
        });
      },
      error: (err: any) => {
        this.isChangingPwd.set(false);
        this.pwdError.set(err.error?.message || t.loginFailed);
      },
    });
  }

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

    (event.target as HTMLInputElement).value = '';
  }

  private initCropper() {
    if (this.cropper) {
      this.cropper.destroy();
      this.cropper = null;
    }

    const img = this.cropperImageRef?.nativeElement;
    if (!img) return;

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

  confirmCrop() {
    if (!this.cropper) return;

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

  closeCropper() {
    this.showCropper.set(false);
    if (this.cropper) {
      this.cropper.destroy();
      this.cropper = null;
    }
  }

  cancelAvatarSelect() {
    this.selectedFile.set(null);
    this.avatarPreview.set(null);
  }

  onAvatarUpload() {
    const file = this.selectedFile();
    if (!file) return;
    this.isUploading.set(true);

    this.userService.uploadAvatar(file).subscribe({
      next: () => {
        const t = this.langService.t().pages.editProfile;
        this.isUploading.set(false);
        this.selectedFile.set(null);
        this.avatarPreview.set(null);
        this.cdr.markForCheck()
        this.messageService.add({
          severity: 'secondary',
          summary:  t.toastDone,
          detail:   t.avatarSaved,
          life:     3000,
        });
      },
      error: (err: any) => {
        const t = this.langService.t().pages.editProfile;
        this.isUploading.set(false);
        this.messageService.add({
          severity: 'secondary',
          summary:  t.toastError,
          detail:   err.error?.message || t.avatarFailed,
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