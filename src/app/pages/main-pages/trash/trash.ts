import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileSystem } from '../../../services/file-system';
import { LangService } from '../../../services/lang';
import { FileItem } from '../../../interfaces/file-system-interfeces/file-item.model';
import { FolderItem } from '../../../interfaces/file-system-interfeces/folder-item.model';
import { ProgressSpinner } from 'primeng/progressspinner';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DecodeURIComponentPipe } from '../../../pipes/decode-uri.pipe';

const RETENTION_DAYS = 30;

type Row =
  | ({ kind: 'folder' } & FolderItem)
  | ({ kind: 'file' } & FileItem);

type ConfirmAction =
  | { kind: 'delete'; id: string; type: 'file' | 'folder'; name: string }
  | { kind: 'empty' }
  | { kind: 'bulkDelete'; keys: string[] };

@Component({
  selector: 'app-trash',
  imports: [FormsModule, ProgressSpinner, DialogModule, ToastModule, DatePipe, DecodeURIComponentPipe],
  templateUrl: './trash.html',
  styleUrl: './trash.scss',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Trash implements OnInit {
  private readonly fileSystem = inject(FileSystem);
  private readonly messageService = inject(MessageService);
  protected readonly langService = inject(LangService);

  t = computed(() => this.langService.t().pages.trash);

  private allFiles   = this.fileSystem.trashFiles;
  private allFolders = this.fileSystem.trashFolders;
  loading = this.fileSystem.trashLoading;

  search   = signal('');
  selected = signal<Set<string>>(new Set());

  confirmVisible = signal(false);
  private confirmAction: ConfirmAction | null = null;

  private match = (name: string) =>
    !this.search().trim() || decodeURIComponent(name).toLowerCase().includes(this.search().trim().toLowerCase());

  rows = computed<Row[]>(() => {
    const folders: Row[] = this.allFolders().filter(f => this.match(f.name)).map(f => ({ kind: 'folder', ...f }));
    const files:   Row[] = this.allFiles().filter(f => this.match(f.name)).map(f => ({ kind: 'file', ...f }));
    return [...folders, ...files];
  });

  totalCount = computed(() => this.allFiles().length + this.allFolders().length);
  isEmpty    = computed(() => this.totalCount() === 0);
  noMatches  = computed(() => !this.isEmpty() && this.rows().length === 0);

  selectedCount = computed(() => this.selected().size);
  allSelected   = computed(() => this.rows().length > 0 && this.rows().every(r => this.selected().has(this.key(r.id, r.kind))));

  ngOnInit() {
    this.fileSystem.loadTrash();
  }

  clearSearch() { this.search.set(''); }

  // ── Выбор ──
  key(id: string, type: 'file' | 'folder') { return `${type}:${id}`; }
  isSelected(id: string, type: 'file' | 'folder') { return this.selected().has(this.key(id, type)); }
  toggleSelect(id: string, type: 'file' | 'folder') {
    const set = new Set(this.selected());
    const k = this.key(id, type);
    set.has(k) ? set.delete(k) : set.add(k);
    this.selected.set(set);
  }
  toggleSelectAll() {
    if (this.allSelected()) { this.selected.set(new Set()); return; }
    this.selected.set(new Set(this.rows().map(r => this.key(r.id, r.kind))));
  }
  clearSelection() { this.selected.set(new Set()); }

  // ── Срок хранения ──
  daysLeft(deletedAt: string | null | undefined): number | null {
    if (!deletedAt) return null;
    const expires = new Date(deletedAt).getTime() + RETENTION_DAYS * 86400000;
    return Math.max(0, Math.ceil((expires - Date.now()) / 86400000));
  }
  expiryClass(deletedAt: string | null | undefined): string {
    const d = this.daysLeft(deletedAt);
    return d !== null && d <= 3 ? 'tr-expiry--soon' : '';
  }

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

  // ── Действия ──
  restore(id: string, type: 'file' | 'folder') {
    this.fileSystem.restoreItem(id, type).subscribe({
      next: () => this.toast(this.t().toastRestored),
      error: () => this.toast(this.t().toastError),
    });
  }

  restoreSelected() {
    const keys = [...this.selected()];
    if (!keys.length) return;
    keys.forEach((k, i) => {
      const [type, id] = k.split(':') as ['file' | 'folder', string];
      this.fileSystem.restoreItem(id, type).subscribe({
        next: () => { if (i === keys.length - 1) this.toast(this.t().toastRestored); },
        error: () => this.toast(this.t().toastError),
      });
    });
    this.clearSelection();
  }

  askDelete(item: FileItem | FolderItem, type: 'file' | 'folder') {
    this.confirmAction = { kind: 'delete', id: item.id, type, name: item.name };
    this.confirmVisible.set(true);
  }
  askEmpty() { this.confirmAction = { kind: 'empty' }; this.confirmVisible.set(true); }
  askBulkDelete() {
    const keys = [...this.selected()];
    if (!keys.length) return;
    this.confirmAction = { kind: 'bulkDelete', keys };
    this.confirmVisible.set(true);
  }

  confirmTitle = computed(() => {
    const a = this.confirmAction?.kind;
    if (a === 'empty') return this.t().confirmEmptyTitle;
    if (a === 'bulkDelete') return this.t().confirmBulkTitle;
    return this.t().confirmDeleteTitle;
  });
  confirmMessage = computed(() => {
    const a = this.confirmAction?.kind;
    if (a === 'empty') return this.t().confirmEmptyMsg;
    if (a === 'bulkDelete') return this.t().confirmBulkMsg;
    return this.t().confirmDeleteMsg;
  });

  confirmYes() {
    const action = this.confirmAction;
    if (!action) return;
    if (action.kind === 'empty') {
      this.fileSystem.emptyTrash().subscribe({
        next: () => this.toast(this.t().toastEmptied),
        error: () => this.toast(this.t().toastError),
      });
    } else if (action.kind === 'bulkDelete') {
      action.keys.forEach((k, i) => {
        const [type, id] = k.split(':') as ['file' | 'folder', string];
        this.fileSystem.permanentDelete(id, type).subscribe({
          next: () => { if (i === action.keys.length - 1) this.toast(this.t().toastDeleted); },
          error: () => this.toast(this.t().toastError),
        });
      });
      this.clearSelection();
    } else {
      this.fileSystem.permanentDelete(action.id, action.type).subscribe({
        next: () => this.toast(this.t().toastDeleted),
        error: () => this.toast(this.t().toastError),
      });
    }
    this.closeConfirm();
  }

  closeConfirm() { this.confirmVisible.set(false); this.confirmAction = null; }

  private toast(detail: string) {
    this.messageService.add({ severity: 'secondary', summary: detail, key: 'br', life: 1800 });
  }
}
