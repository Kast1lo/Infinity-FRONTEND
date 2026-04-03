import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SideBar } from "../../../common-ui/side-bar/side-bar";
import { Toolbar } from "./components/toolbar/toolbar";
import { ListFiles } from "./components/list-files/list-files";

@Component({
  selector: 'app-file-system',
  imports: [SideBar, Toolbar, ListFiles],
  templateUrl: './file-system.html',
  styleUrl: './file-system.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FileSystem {

}
