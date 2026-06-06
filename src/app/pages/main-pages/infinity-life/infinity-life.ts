import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SideBar } from '../../../common-ui/side-bar/side-bar';
import { KanbanBoard } from './kanban-board/kanban-board';
import { ProjectService } from '../../../services/project';

@Component({
  selector: 'app-infinity-life',
  imports: [CommonModule, SideBar, KanbanBoard],
  templateUrl: './infinity-life.html',
  styleUrl: './infinity-life.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InfinityLife implements OnInit {
  private route          = inject(ActivatedRoute);
  private router         = inject(Router);
  private projectService = inject(ProjectService);

  readonly projectId   = signal<string | null>(null);
  readonly projectName = signal<string>('');

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('projectId');
      if (!id) {
        this.router.navigate(['/projects']);
        return;
      }
      this.projectId.set(id);
      this.projectService.loadProject(id).subscribe({
        next: (p) => this.projectName.set(p?.name ?? ''),
        error: () => this.router.navigate(['/projects']),
      });
    });
  }
}
