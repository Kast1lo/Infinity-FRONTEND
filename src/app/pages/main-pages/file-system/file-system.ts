import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SideBar } from "../../../common-ui/side-bar/side-bar";

@Component({
  selector: 'app-file-system',
  imports: [SideBar],
  templateUrl: './file-system.html',
  styleUrl: './file-system.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FileSystem {

}
