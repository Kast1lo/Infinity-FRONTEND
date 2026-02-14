import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { PasswordModule } from 'primeng/password';
import { InputTextModule } from 'primeng/inputtext';
import { Router, RouterLink } from '@angular/router';
import { LoginRequest } from '../../../interfaces/auth-interfaces/login-request.model';
import { form, FormField, maxLength, minLength, required, submit, } from '@angular/forms/signals';
import { AuthService } from '../../../services/auth';

@Component({
  selector: 'app-login',
  imports: [FormField,
  RouterLink,
  ButtonModule, 
  FloatLabelModule,
  IconFieldModule,
  InputIconModule,
  PasswordModule, 
  InputTextModule
],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Login {
  constructor(
    private router: Router,
    private readonly AuthService: AuthService
  ){}
  imagePath = 'infinityLogo.svg';
  loginModel = signal<LoginRequest>({
    username: '',
    passwordHash: '',
  });
  loginForm = form(this.loginModel, (schemaPath) => {
    
    minLength(schemaPath.username, 3, {message: 'Логин должен содержать минимум 3 символа'})
    maxLength(schemaPath.username, 30, {message: 'Логин не должен превышать 30 символов'})

    minLength(schemaPath.passwordHash, 6, {message: 'Пароль должен содержать минимум 6 символов'})
    maxLength(schemaPath.passwordHash, 128, {message: 'Пароль не должен превышать 128 символов'})  
  });
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);
  onSubmit(event: Event) {
    event.preventDefault();
    this.loginForm.username().markAsTouched();
    this.loginForm.passwordHash().markAsTouched();
    if (!this.loginForm().valid()) {
      return;
    }
    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    const credentials = this.loginModel();
    this.AuthService.login(credentials).subscribe({
      next: () => {
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Ошибка входа. Попробуйте позже.');
      }
    })
  }

}
