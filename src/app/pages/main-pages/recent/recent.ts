import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileSystem } from '../../../services/file-system';
import { LangService } from '../../../services/lang';
import { FileItem } from '../../../interfaces/file-system-interfeces/file-item.model';
import { ProgressSpinner } from 'primeng/progressspinner';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DecodeURIComponentPipe } from '../../../pipes/decode-uri.pipe';

type SortField = 'date' | 'name' | 'size';

interface DateGroup {
  key:   string;
  label: string;
  items: FileItem[];
}

@Component({
  selector: 'app-recent',
  imports: [FormsModule, ProgressSpinner, DialogModule, ToastModule, DatePipe, DecodeURIComponentPipe],
  templateUrl: './recent.html',
  styleUrl: './recent.scss',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Recent implements OnInit {
  private readonly fileSystem = inject(FileSystem);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  protected readonly langService = inject(LangService);

  t = computed(() => this.langService.t().pages.recent);

  private all = this.fileSystem.recentFiles;
  loading = this.fileSystem.recentLoading;

  search    = signal('');
  sortField = signal<SortField>('date');
  sortDir   = signal<'asc' | 'desc'>('desc');

  // Превью изображения
  previewVisible = signal(false);
  previewUrl     = signal<string | null>(null);
  previewTitle   = signal('');

  // Переименование
  renameVisible = signal(false);
  renameValue   = signal('');
  private renameTarget: FileItem | null = null;

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    let list = this.all();
    if (q) list = list.filter(f => decodeURIComponent(f.name).toLowerCase().includes(q));
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    const field = this.sortField();
    return [...list].sort((a, b) => {
      let r = 0;
      if (field === 'name') r = decodeURIComponent(a.name).localeCompare(decodeURIComponent(b.name));
      else if (field === 'size') r = (+a.size || 0) - (+b.size || 0);
      else r = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      return r * dir;
    });
  });

  totalCount = computed(() => this.all().length);
  isEmpty    = computed(() => this.all().length === 0);
  noMatches  = computed(() => !this.isEmpty() && this.filtered().length === 0);

  /** Группировка по дате — только при сортировке по дате; иначе одна группа. */
  groups = computed<DateGroup[]>(() => {
    const items = this.filtered();
    if (this.sortField() !== 'date') {
      return items.length ? [{ key: 'all', label: this.t().filesLabel, items }] : [];
    }
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dayMs = 86400000;
    const buckets: Record<string, FileItem[]> = { today: [], yesterday: [], week: [], earlier: [] };
    for (const f of items) {
      const t = new Date(f.updatedAt).getTime();
      if (t >= startOfToday) buckets['today'].push(f);
      else if (t >= startOfToday - dayMs) buckets['yesterday'].push(f);
      else if (t >= startOfToday - 7 * dayMs) buckets['week'].push(f);
      else buckets['earlier'].push(f);
    }
    const labels = this.t();
    const order: { key: string; label: string }[] = [
      { key: 'today',     label: labels.groupToday },
      { key: 'yesterday', label: labels.groupYesterday },
      { key: 'week',      label: labels.groupWeek },
      { key: 'earlier',   label: labels.groupEarlier },
    ];
    return order
      .filter(o => buckets[o.key].length)
      .map(o => ({ key: o.key, label: o.label, items: buckets[o.key] }));
  });

  ngOnInit() {
    this.fileSystem.loadRecent();
  }

  setSort(field: SortField) {
    if (this.sortField() === field) this.sortDir.update(d => (d === 'asc' ? 'desc' : 'asc'));
    else { this.sortField.set(field); this.sortDir.set(field === 'name' ? 'asc' : 'desc'); }
  }

  clearSearch() { this.search.set(''); }

  isImage(f: FileItem): boolean { return (f.mimeType ?? '').startsWith('image/'); }

  getFileIcon(mimeType: string | null | undefined): string {
    const m = mimeType ?? '';
    if (m.startsWith('image/')) return 'pi-image';
    if (m === 'application/pdf') return 'pi-file-pdf';
    if (m.includes('word') || m.includes('document')) return 'pi-file-word';
    if (m.includes('excel') || m.includes('spreadsheet')) return 'pi-file-excel';
    if (m.startsWith('video/')) return 'pi-video';
    if (m.startsWith('audio/')) return 'pi-volume-up';
    if (m.includes('zip')) return 'pi-box';
    return 'pi-file';
  }

  formatSize(size: string | number): string {
    const bytes = typeof size === 'string' ? parseInt(size, 10) : size;
    if (isNaN(bytes)) return '';
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} МБ`;
    return `${(bytes / 1024 ** 3).toFixed(1)} ГБ`;
  }

  /** Клик по строке: изображение → лайтбокс, иначе → открыть расположение. */
  open(file: FileItem) {
    if (this.isImage(file)) {
      this.previewUrl.set(file.downloadUrl);
      this.previewTitle.set(decodeURIComponent(file.name));
      this.previewVisible.set(true);
    } else {
      this.openLocation(file);
    }
  }

  closePreview() { this.previewVisible.set(false); this.previewUrl.set(null); }

  openLocation(file: FileItem) {
    this.router.navigate(['/file-system']).then(() => this.fileSystem.revealFolder(file.folderId));
  }

  download(file: FileItem) { this.fileSystem.downloadFile(file); }

  toggleStar(file: FileItem) {
    this.fileSystem.toggleStar(file.id, 'file').subscribe({
      next: () => this.toast(file.isStarred ? this.t().toastUnstarred : this.t().toastStarred),
      error: () => this.toast(this.t().toastError),
    });
  }

  openRename(file: FileItem) {
    this.renameTarget = file;
    this.renameValue.set(decodeURIComponent(file.name));
    this.renameVisible.set(true);
  }

  submitRename() {
    const file = this.renameTarget;
    const name = this.renameValue().trim();
    if (!file || !name) return;
    this.fileSystem.renameItem(file.id, 'file', name).subscribe({
      next: () => { this.renameVisible.set(false); this.fileSystem.loadRecent(); this.toast(this.t().toastRenamed); },
      error: () => this.toast(this.t().toastError),
    });
  }

  deleteToTrash(file: FileItem) {
    this.fileSystem.deleteItem(file.id, 'file').subscribe({
      next: () => { this.fileSystem.loadRecent(); this.toast(this.t().toastTrashed); },
      error: () => this.toast(this.t().toastError),
    });
  }

  private toast(detail: string) {
    this.messageService.add({ severity: 'secondary', summary: detail, key: 'br', life: 1800 });
  }
}
