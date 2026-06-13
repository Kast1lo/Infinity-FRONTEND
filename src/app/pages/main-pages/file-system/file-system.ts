import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Toolbar } from "./components/toolbar/toolbar";
import { ListFiles } from "./components/list-files/list-files";

@Component({
  selector: 'app-file-system',
  imports: [Toolbar, ListFiles],
  templateUrl: './file-system.html',
  styleUrl: './file-system.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FileSystem {
 
}
