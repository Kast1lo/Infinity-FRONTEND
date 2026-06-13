import { ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { FileSystem } from '../../services/file-system';
import { InfinityLife } from '../../services/infinity-life';
import { LangService } from '../../services/lang';
import { FileItem } from '../../interfaces/file-system-interfeces/file-item.model';
import { FolderItem } from '../../interfaces/file-system-interfeces/folder-item.model';
import { SearchTask } from '../../interfaces/search/search-results.model';

@Component({
  selector: 'app-search-bar',
  imports: [],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchBar {
  private readonly fileSystem  = inject(FileSystem);
  private readonly infinityLife = inject(InfinityLife);
  private readonly router       = inject(Router);
  private readonly hostEl       = inject(ElementRef);
  readonly langService = inject(LangService);

  t = computed(() => this.langService.t().sidebar);

  value      = signal('');
  loading    = signal(false);
  open       = signal(false);
  resFiles   = signal<FileItem[]>([]);
  resFolders = signal<FolderItem[]>([]);
  resTasks   = signal<SearchTask[]>([]);

  hasResults  = computed(() => this.resFiles().length + this.resFolders().length + this.resTasks().length > 0);
  searchEmpty = computed(() => this.value().trim().length >= 2 && !this.loading() && !this.hasResults());

  private timer: ReturnType<typeof setTimeout> | null = null;
  private seq = 0;

  onInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.value.set(value);
    this.open.set(true);
    if (this.timer) clearTimeout(this.timer);
    const q = value.trim();
    if (q.length < 2) {
      this.loading.set(false);
      this.resFiles.set([]); this.resFolders.set([]); this.resTasks.set([]);
      return;
    }
    this.loading.set(true);
    this.timer = setTimeout(() => this.run(q), 280);
  }

  onFocus() {
    if (this.value().trim().length >= 2) this.open.set(true);
  }

  private run(q: string) {
    const seq = ++this.seq;
    forkJoin({
      fs:    this.fileSystem.searchAll(q),
      tasks: this.infinityLife.searchTasks(q),
    }).subscribe({
      next: ({ fs, tasks }) => {
        if (seq !== this.seq) return;
        this.resFiles.set(fs?.files ?? []);
        this.resFolders.set(fs?.folders ?? []);
        this.resTasks.set(tasks ?? []);
        this.loading.set(false);
      },
      error: () => { if (seq === this.seq) this.loading.set(false); },
    });
  }

  clear() {
    this.value.set('');
    this.open.set(false);
    this.loading.set(false);
    this.resFiles.set([]); this.resFolders.set([]); this.resTasks.set([]);
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
  }

  openFolderResult(folder: FolderItem) {
    this.clear();
    this.router.navigate(['/file-system']).then(() => this.fileSystem.openFolder(folder.id));
  }

  openFileResult(file: FileItem) {
    this.clear();
    this.router.navigate(['/file-system']).then(() => {
      if (file.folderId) this.fileSystem.openFolder(file.folderId);
      else this.fileSystem.loadFiles(null);
    });
  }

  openTaskResult(task: SearchTask) {
    this.clear();
    this.router.navigate(['/projects', task.projectId]);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent) {
    if (!this.open()) return;
    if (!this.hostEl.nativeElement.contains(event.target)) this.open.set(false);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      const input = this.hostEl.nativeElement.querySelector('#app-search-input') as HTMLInputElement | null;
      input?.focus();
      input?.select();
      return;
    }
    if (event.key === 'Escape' && this.open()) this.open.set(false);
  }
}
