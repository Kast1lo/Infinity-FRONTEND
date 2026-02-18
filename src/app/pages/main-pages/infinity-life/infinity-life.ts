import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SideBar } from "../../../common-ui/side-bar/side-bar";

@Component({
  selector: 'app-infinity-life',
  imports: [SideBar],
  templateUrl: './infinity-life.html',
  styleUrl: './infinity-life.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InfinityLife {

}
