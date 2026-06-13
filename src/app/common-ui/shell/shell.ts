import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopBar } from '../top-bar/top-bar';
import { SideBar } from '../side-bar/side-bar';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, TopBar, SideBar],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {}
