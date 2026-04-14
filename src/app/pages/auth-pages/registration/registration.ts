import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RegisterData } from '../../../interfaces/auth-interfaces/register-data.model';
import { email, form, FormField, maxLength, minLength, required } from '@angular/forms/signals';
import { AuthService } from '../../../services/auth';

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
  ],
  templateUrl: './registration.html',
  styleUrl: './registration.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Registration {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  imagePath = 'infinityLogo.svg';

  registerModel = signal<RegisterData>({
    username: '',
    email: '',
    passwordHash: '',
  });

  registerForm = form(this.registerModel, (s) => {
    required(s.username, { message: 'Логин обязателен' });
    minLength(s.username, 3, { message: 'Логин должен содержать минимум 3 символа' });
    maxLength(s.username, 30, { message: 'Логин не должен превышать 30 символов' });

    required(s.email, { message: 'Email обязателен' });
    email(s.email, { message: 'Введите корректный email' });

    required(s.passwordHash, { message: 'Пароль обязателен' });
    minLength(s.passwordHash, 6, { message: 'Пароль должен содержать минимум 6 символов' });
    maxLength(s.passwordHash, 128, { message: 'Пароль не должен превышать 128 символов' });
  });

  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);

  get usernameField() { return this.registerForm.username(); }
  get emailField()    { return this.registerForm.email(); }
  get passwordField() { return this.registerForm.passwordHash(); }

  showUsernameError(): boolean {
    return this.usernameField.touched() && !this.usernameField.valid();
  }

  showEmailError(): boolean {
    return this.emailField.touched() && !this.emailField.valid();
  }

  showPasswordError(): boolean {
    return this.passwordField.touched() && !this.passwordField.valid();
  }

  usernameError(): string | null {
    const errors = this.usernameField.errors();
    return errors?.[0]?.message ?? null;
  }

  emailError(): string | null {
    const errors = this.emailField.errors();
    return errors?.[0]?.message ?? null;
  }

  passwordError(): string | null {
    const errors = this.passwordField.errors();
    return errors?.[0]?.message ?? null;
  }

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
      next: () => {
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Ошибка регистрации. Попробуйте позже.');
      },
    });
  }
}