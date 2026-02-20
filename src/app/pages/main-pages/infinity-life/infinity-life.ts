import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SideBar } from "../../../common-ui/side-bar/side-bar";
import { CreateTask } from "./create-task/create-task";
import { TreeTasks } from "./tree-tasks/tree-tasks";

@Component({
  selector: 'app-infinity-life',
  imports: [SideBar, CreateTask, TreeTasks],
  templateUrl: './infinity-life.html',
  styleUrl: './infinity-life.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InfinityLife {

}
