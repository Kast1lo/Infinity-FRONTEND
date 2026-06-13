import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { PasswordModule } from 'primeng/password';
import { InputTextModule } from 'primeng/inputtext';
import { Router, RouterLink } from '@angular/router';
import { LoginRequest } from '../../../interfaces/auth-interfaces/login-request.model';
import { email, form, FormField, maxLength, minLength, required } from '@angular/forms/signals';
import { AuthService } from '../../../services/auth';
import { TooltipModule } from 'primeng/tooltip';
import { ThemeService } from '../../../services/theme';
import { LangService } from '../../../services/lang';
import { environment } from '../../../../environments/environment';

type Screen = 'login' | 'forgot' | 'reset';

@Component({
  selector: 'app-login',
  imports: [
    FormField,
    RouterLink,
    ButtonModule,
    FloatLabelModule,
    IconFieldModule,
    InputIconModule,
    PasswordModule,
    InputTextModule,
    TooltipModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login implements OnInit, OnDestroy {
  private readonly router      = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly cdr         = inject(ChangeDetectorRef);
  readonly themeService = inject(ThemeService);
  readonly langService  = inject(LangService);

  ngOnInit() {
    // Если пользователь ранее выбрал «запомнить меня» и сессия жива — сразу в профиль.
    this.authService.autoRedirectIfRemembered();
  }

  isDark    = computed(() => this.themeService.theme() === 'dark');
  imagePath = computed(() => this.isDark() ? 'infinityLogo.svg' : 'infinity.svg');
  t         = computed(() => this.langService.t().pages.auth.login);

  readonly googleAuthUrl = `${environment.apiUrl}/auth/google`;

  screen = signal<Screen>('login');

  // ───── Вход ─────
  loginModel = signal<LoginRequest>({
    username:     '',
    passwordHash: '',
  });

  loginForm = form(this.loginModel, (s) => {
    required(s.username,      { message: 'Логин обязателен' });
    minLength(s.username, 3,  { message: 'Логин должен содержать минимум 3 символа' });
    maxLength(s.username, 30, { message: 'Логин не должен превышать 30 символов' });
    required(s.passwordHash,       { message: 'Пароль обязателен' });
    minLength(s.passwordHash, 6,   { message: 'Пароль должен содержать минимум 6 символов' });
    maxLength(s.passwordHash, 128, { message: 'Пароль не должен превышать 128 символов' });
  });

  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);
  rememberMe   = signal(false);

  toggleRemember() { this.rememberMe.update(v => !v); }

  get usernameField() { return this.loginForm.username(); }
  get passwordField() { return this.loginForm.passwordHash(); }

  showUsernameError(): boolean { return this.usernameField.touched() && !this.usernameField.valid(); }
  showPasswordError(): boolean { return this.passwordField.touched() && !this.passwordField.valid(); }
  usernameError(): string | null { return this.usernameField.errors()?.[0]?.message ?? null; }
  passwordError(): string | null { return this.passwordField.errors()?.[0]?.message ?? null; }

  onSubmit(event: Event) {
    event.preventDefault();
    this.usernameField.markAsTouched();
    this.passwordField.markAsTouched();
    this.cdr.markForCheck();
    if (!this.loginForm().valid()) return;
    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.authService.login({ ...this.loginModel(), rememberMe: this.rememberMe() }).subscribe({
      next:  () => { this.isSubmitting.set(false); },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Ошибка входа. Попробуйте позже.');
      },
    });
  }

  // ───── Сброс пароля: запрос кода ─────
  forgotModel = signal<{ email: string }>({ email: '' });
  forgotForm  = form(this.forgotModel, (s) => {
    required(s.email, { message: 'Email обязателен' });
    email(s.email,    { message: 'Введите корректный email' });
  });

  get forgotEmailField() { return this.forgotForm.email(); }
  showForgotEmailError(): boolean { return this.forgotEmailField.touched() && !this.forgotEmailField.valid(); }
  forgotEmailError(): string | null { return this.forgotEmailField.errors()?.[0]?.message ?? null; }

  isSendingCode = signal(false);
  pendingEmail  = signal('');

  openForgot() {
    this.screen.set('forgot');
    this.errorMessage.set(null);
    this.forgotModel.set({ email: this.loginModel().username.includes('@') ? this.loginModel().username : '' });
  }

  backToLogin() {
    this.screen.set('login');
    this.errorMessage.set(null);
    this.codeError.set(null);
    this.codeDigits.set(['', '', '', '', '', '']);
    this.stopCooldown();
  }

  submitForgot(event: Event) {
    event.preventDefault();
    this.forgotEmailField.markAsTouched();
    this.cdr.markForCheck();
    if (!this.forgotForm().valid()) return;
    this.isSendingCode.set(true);
    this.errorMessage.set(null);
    const mail = this.forgotModel().email;
    this.authService.forgotPassword(mail).subscribe({
      next: () => {
        this.isSendingCode.set(false);
        this.pendingEmail.set(mail);
        this.codeDigits.set(['', '', '', '', '', '']);
        this.resetModel.set({ passwordHash: '' });
        this.screen.set('reset');
        this.startResendCooldown();
        this.cdr.markForCheck();
        setTimeout(() => (document.getElementById('reset-code-0') as HTMLInputElement)?.focus(), 50);
      },
      error: (err) => {
        this.isSendingCode.set(false);
        this.errorMessage.set(err.error?.message || 'Не удалось отправить код. Попробуйте позже.');
        this.cdr.markForCheck();
      },
    });
  }

  // ───── Сброс пароля: код + новый пароль ─────
  codeDigits     = signal<string[]>(['', '', '', '', '', '']);
  codeError      = signal<string | null>(null);
  isResetting    = signal(false);
  isResending    = signal(false);
  resendCooldown = signal(0);
  private cooldownInterval: ReturnType<typeof setInterval> | null = null;

  resetModel = signal<{ passwordHash: string }>({ passwordHash: '' });
  resetForm  = form(this.resetModel, (s) => {
    required(s.passwordHash,       { message: 'Пароль обязателен' });
    minLength(s.passwordHash, 6,   { message: 'Пароль должен содержать минимум 6 символов' });
    maxLength(s.passwordHash, 128, { message: 'Пароль не должен превышать 128 символов' });
  });

  get resetPasswordField() { return this.resetForm.passwordHash(); }
  showResetPasswordError(): boolean { return this.resetPasswordField.touched() && !this.resetPasswordField.valid(); }
  resetPasswordError(): string | null { return this.resetPasswordField.errors()?.[0]?.message ?? null; }

  codeComplete = computed(() => this.codeDigits().join('').length === 6);

  onCodeInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const val   = input.value.replace(/\D/g, '').slice(-1);
    const digits = [...this.codeDigits()];
    digits[index] = val;
    this.codeDigits.set(digits);
    this.codeError.set(null);
    this.cdr.markForCheck();
    if (val && index < 5) {
      (document.getElementById(`reset-code-${index + 1}`) as HTMLInputElement)?.focus();
    }
  }

  onCodeKeydown(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace') {
      const digits = [...this.codeDigits()];
      if (!digits[index] && index > 0) {
        (document.getElementById(`reset-code-${index - 1}`) as HTMLInputElement)?.focus();
        digits[index - 1] = '';
        this.codeDigits.set(digits);
        this.cdr.markForCheck();
      }
    }
  }

  onCodePaste(event: ClipboardEvent) {
    event.preventDefault();
    const text   = event.clipboardData?.getData('text') ?? '';
    const digits = text.replace(/\D/g, '').slice(0, 6).split('');
    const filled = [...Array(6)].map((_, i) => digits[i] ?? '');
    this.codeDigits.set(filled);
    this.cdr.markForCheck();
    const lastIndex = Math.min(digits.length - 1, 5);
    (document.getElementById(`reset-code-${lastIndex}`) as HTMLInputElement)?.focus();
  }

  submitReset(event: Event) {
    event.preventDefault();
    this.resetPasswordField.markAsTouched();
    this.cdr.markForCheck();
    const code = this.codeDigits().join('');
    if (code.length !== 6) {
      this.codeError.set('Введите 6-значный код');
      return;
    }
    if (!this.resetForm().valid()) return;
    this.isResetting.set(true);
    this.codeError.set(null);
    this.errorMessage.set(null);
    this.authService.resetPassword(this.pendingEmail(), code, this.resetModel().passwordHash).subscribe({
      next: () => { this.isResetting.set(false); this.stopCooldown(); this.cdr.markForCheck(); },
      error: (err) => {
        this.isResetting.set(false);
        this.codeDigits.set(['', '', '', '', '', '']);
        this.codeError.set(err.error?.message || 'Неверный код. Попробуйте ещё раз.');
        this.cdr.markForCheck();
        setTimeout(() => (document.getElementById('reset-code-0') as HTMLInputElement)?.focus(), 50);
      },
    });
  }

  resendResetCode() {
    if (this.resendCooldown() > 0 || this.isResending()) return;
    this.isResending.set(true);
    this.cdr.markForCheck();
    this.authService.forgotPassword(this.pendingEmail()).subscribe({
      next: () => {
        this.isResending.set(false);
        this.codeDigits.set(['', '', '', '', '', '']);
        this.codeError.set(null);
        this.startResendCooldown();
        this.cdr.markForCheck();
        setTimeout(() => (document.getElementById('reset-code-0') as HTMLInputElement)?.focus(), 50);
      },
      error: (err) => {
        this.isResending.set(false);
        this.codeError.set(err.error?.message || 'Ошибка отправки. Попробуйте позже.');
        this.cdr.markForCheck();
      },
    });
  }

  ngOnDestroy() {
    this.stopCooldown();
  }

  private startResendCooldown() {
    this.stopCooldown();
    this.resendCooldown.set(60);
    this.cooldownInterval = setInterval(() => {
      const current = this.resendCooldown();
      if (current <= 1) {
        this.stopCooldown();
        this.resendCooldown.set(0);
      } else {
        this.resendCooldown.set(current - 1);
      }
      this.cdr.markForCheck();
    }, 1000);
  }

  private stopCooldown() {
    if (this.cooldownInterval !== null) {
      clearInterval(this.cooldownInterval);
      this.cooldownInterval = null;
    }
  }
}
