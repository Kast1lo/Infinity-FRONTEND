import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { PasswordModule } from 'primeng/password';
import { InputTextModule } from 'primeng/inputtext';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [
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
})
export class Login {
  imagePath = 'logo.png';
}
