import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SideBar } from "../../../common-ui/side-bar/side-bar";
import { KanbanBoard } from "./kanban-board/kanban-board";



@Component({
  selector: 'app-infinity-life',
  imports: [SideBar, KanbanBoard],
  templateUrl: './infinity-life.html',
  styleUrl: './infinity-life.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InfinityLife {

}
