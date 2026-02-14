import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';



@Component({
  selector: 'app-registration',
  imports: [
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
  imagePath = 'infinityLogo.svg';
}
