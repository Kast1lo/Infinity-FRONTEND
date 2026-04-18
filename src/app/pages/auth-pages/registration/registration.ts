import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { TooltipModule } from 'primeng/tooltip';
import { RegisterData } from '../../../interfaces/auth-interfaces/register-data.model';
import { email, form, FormField, maxLength, minLength, required } from '@angular/forms/signals';
import { AuthService } from '../../../services/auth';
import { ThemeService } from '../../../services/theme';

@Component({
  selector: 'app-registration',
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
  templateUrl: './registration.html',
  styleUrl:    './registration.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Registration {
  private readonly router      = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly cdr         = inject(ChangeDetectorRef);
  readonly themeService        = inject(ThemeService);

  isDark    = computed(() => this.themeService.theme() === 'dark');
  imagePath = computed(() => this.isDark() ? 'infinityLogo.svg' : 'infinity.svg');

  screen       = signal<'register' | 'verify'>('register');
  pendingEmail = signal('');

  codeDigits     = signal<string[]>(['', '', '', '', '', '']);
  codeError      = signal<string | null>(null);
  isVerifying    = signal(false);
  isResending    = signal(false);
  resendCooldown = signal(0);

  registerModel = signal<RegisterData>({
    username:     '',
    email:        '',
    passwordHash: '',
  });

  registerForm = form(this.registerModel, (s) => {
    required(s.username,      { message: 'Логин обязателен' });
    minLength(s.username, 3,  { message: 'Логин должен содержать минимум 3 символа' });
    maxLength(s.username, 30, { message: 'Логин не должен превышать 30 символов' });

    required(s.email, { message: 'Email обязателен' });
    email(s.email,    { message: 'Введите корректный email' });

    required(s.passwordHash,       { message: 'Пароль обязателен' });
    minLength(s.passwordHash, 6,   { message: 'Пароль должен содержать минимум 6 символов' });
    maxLength(s.passwordHash, 128, { message: 'Пароль не должен превышать 128 символов' });
  });

  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);

  get usernameField() { return this.registerForm.username(); }
  get emailField()    { return this.registerForm.email(); }
  get passwordField() { return this.registerForm.passwordHash(); }

  showUsernameError(): boolean { return this.usernameField.touched() && !this.usernameField.valid(); }
  showEmailError():    boolean { return this.emailField.touched()    && !this.emailField.valid(); }
  showPasswordError(): boolean { return this.passwordField.touched() && !this.passwordField.valid(); }

  usernameError(): string | null { return this.usernameField.errors()?.[0]?.message ?? null; }
  emailError():    string | null { return this.emailField.errors()?.[0]?.message    ?? null; }
  passwordError(): string | null { return this.passwordField.errors()?.[0]?.message ?? null; }

  onSubmit(event: Event) {
    event.preventDefault();
    this.usernameField.markAsTouched();
    this.emailField.markAsTouched();
    this.passwordField.markAsTouched();
    this.cdr.markForCheck();
    if (!this.registerForm().valid()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.authService.register(this.registerModel()).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.pendingEmail.set(res.email);
        this.screen.set('verify');
        this.startResendCooldown();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Ошибка регистрации. Попробуйте позже.');
        this.cdr.markForCheck();
      },
    });
  }

  onDigitInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const val   = input.value.replace(/\D/g, '').slice(-1);
    const digits = [...this.codeDigits()];
    digits[index] = val;
    this.codeDigits.set(digits);
    this.codeError.set(null);
    this.cdr.markForCheck();
    if (val && index < 5) {
      (document.getElementById(`code-${index + 1}`) as HTMLInputElement)?.focus();
    }
    if (digits.every(d => d !== '')) this.submitCode();
  }

  onDigitKeydown(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace') {
      const digits = [...this.codeDigits()];
      if (!digits[index] && index > 0) {
        (document.getElementById(`code-${index - 1}`) as HTMLInputElement)?.focus();
        digits[index - 1] = '';
        this.codeDigits.set(digits);
        this.cdr.markForCheck();
      }
    }
  }

  onDigitPaste(event: ClipboardEvent) {
    event.preventDefault();
    const text   = event.clipboardData?.getData('text') ?? '';
    const digits = text.replace(/\D/g, '').slice(0, 6).split('');
    const filled = [...Array(6)].map((_, i) => digits[i] ?? '');
    this.codeDigits.set(filled);
    this.cdr.markForCheck();
    const lastIndex = Math.min(digits.length - 1, 5);
    (document.getElementById(`code-${lastIndex}`) as HTMLInputElement)?.focus();
    if (filled.every(d => d !== '')) this.submitCode();
  }

  submitCode() {
    const code = this.codeDigits().join('');
    if (code.length !== 6) return;
    this.isVerifying.set(true);
    this.codeError.set(null);
    this.cdr.markForCheck();
    this.authService.verifyEmail(this.pendingEmail(), code).subscribe({
      next: () => { this.isVerifying.set(false); this.cdr.markForCheck(); },
      error: (err) => {
        this.isVerifying.set(false);
        this.codeDigits.set(['', '', '', '', '', '']);
        this.codeError.set(err.error?.message || 'Неверный код. Попробуйте ещё раз.');
        this.cdr.markForCheck();
        setTimeout(() => (document.getElementById('code-0') as HTMLInputElement)?.focus(), 50);
      },
    });
  }

  resendCode() {
    if (this.resendCooldown() > 0) return;
    this.isResending.set(true);
    this.cdr.markForCheck();
    this.authService.resendCode(this.pendingEmail()).subscribe({
      next: () => {
        this.isResending.set(false);
        this.codeDigits.set(['', '', '', '', '', '']);
        this.codeError.set(null);
        this.startResendCooldown();
        this.cdr.markForCheck();
        setTimeout(() => (document.getElementById('code-0') as HTMLInputElement)?.focus(), 50);
      },
      error: (err) => {
        this.isResending.set(false);
        this.codeError.set(err.error?.message || 'Ошибка отправки. Попробуйте позже.');
        this.cdr.markForCheck();
      },
    });
  }

  private startResendCooldown() {
    this.resendCooldown.set(60);
    const interval = setInterval(() => {
      const current = this.resendCooldown();
      if (current <= 1) { clearInterval(interval); this.resendCooldown.set(0); }
      else this.resendCooldown.set(current - 1);
      this.cdr.markForCheck();
    }, 1000);
  }

  goBack() {
    this.screen.set('register');
    this.codeDigits.set(['', '', '', '', '', '']);
    this.codeError.set(null);
  }
}