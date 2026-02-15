import { Component, inject } from '@angular/core';
import { UserService } from '../../services/user-service';
import { AuthService } from '../../services/auth';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { Button } from "primeng/button";


@Component({
  selector: 'app-side-bar',
  imports: [AvatarModule,
    AvatarGroupModule, Button],
  templateUrl: './side-bar.html',
  styleUrl: './side-bar.scss',
})
export class SideBar {
  public authService = inject(AuthService)
  

  logout(){
    this.authService.logout();
  }
}
