import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SideBar } from "./common-ui/side-bar/side-bar";
import { BackgroundService } from './services/background';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('infinity');
  private readonly bgService = inject(BackgroundService);
}
