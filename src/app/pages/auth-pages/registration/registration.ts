import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
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
  imports: [FormField,
  RouterLink,
  ButtonModule, 
  FloatLabelModule,
  IconFieldModule,
  InputIconModule,
  PasswordModule, 
  InputTextModule
],
  templateUrl: './registration.html',
  styleUrl: './registration.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Registration {
  constructor(
    private readonly router: Router,
    private readonly AuthService: AuthService
  ){}
  imagePath = 'infinityLogo.svg';
    RegisterModel = signal<RegisterData>({
    username: '',
    email:'',
    passwordHash: '',
  });
  RegisterForm = form(this.RegisterModel, (schemaPath) => {
    minLength(schemaPath.username, 3, {message: 'Логин должен содержать минимум 3 символа'})
    maxLength(schemaPath.username, 30, {message: 'Логин не должен превышать 30 символов'})

    email(schemaPath.email, {message: 'Введите корректные данные'})

    minLength(schemaPath.passwordHash, 6, {message: 'Пароль должен содержать минимум 6 символов'})
    maxLength(schemaPath.passwordHash, 128, {message: 'Пароль не должен превышать 128 символов'})  
  });
  
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);
  onSubmit(event: Event){
    event.preventDefault();
    this.RegisterForm.username().markAsTouched();
    this.RegisterForm.email().markAsTouched();
    this.RegisterForm.passwordHash().markAsTouched();
    if(!this.RegisterForm().valid()){
      return;
    }
    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    const data = this.RegisterModel();
    this.AuthService.register(data).subscribe({
      next: () => {
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Ошибка регистрации. Попробуйте позже.');
      }
    })
  }
}
