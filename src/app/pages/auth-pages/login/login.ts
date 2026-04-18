import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
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
import { form, FormField, maxLength, minLength, required } from '@angular/forms/signals';
import { AuthService } from '../../../services/auth';
import { TooltipModule } from 'primeng/tooltip';
import { ThemeService } from '../../../services/theme';

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
export class Login {
  private readonly router      = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly cdr         = inject(ChangeDetectorRef);
  readonly themeService        = inject(ThemeService);

  isDark    = computed(() => this.themeService.theme() === 'dark');
  imagePath = computed(() => this.isDark() ? 'infinityLogo.svg' : 'infinity.svg');

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
    this.authService.login(this.loginModel()).subscribe({
      next:  () => { this.isSubmitting.set(false); },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Ошибка входа. Попробуйте позже.');
      },
    });
  }
}