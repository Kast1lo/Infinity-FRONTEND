import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
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
import { VideoPlayer } from '../../../common-ui/video-player/video-player';
import { AudioPlayer } from '../../../common-ui/audio-player/audio-player';

type SortField = 'name' | 'date' | 'size';

@Component({
  selector: 'app-starred',
  imports: [FormsModule, ProgressSpinner, DialogModule, ToastModule, DecodeURIComponentPipe, VideoPlayer, AudioPlayer],
  templateUrl: './starred.html',
  styleUrl: './starred.scss',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Starred implements OnInit {
  private readonly fileSystem = inject(FileSystem);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly langService = inject(LangService);

  t = computed(() => this.langService.t().pages.starred);

  private allFiles   = this.fileSystem.starredFiles;
  private allFolders = this.fileSystem.starredFolders;
  loading = this.fileSystem.starredLoading;

  search    = signal('');
  sortField = signal<SortField>('name');
  sortDir   = signal<'asc' | 'desc'>('asc');

  // Выбор для массовых действий — ключи вида "file:<id>" / "folder:<id>"
  selected = signal<Set<string>>(new Set());

  // Превью файла (картинка / видео / аудио / pdf)
  previewVisible = signal(false);
  previewUrl     = signal<string | null>(null);
  previewSafeUrl = signal<SafeResourceUrl | null>(null);
  previewKind    = signal<'image' | 'video' | 'audio' | 'pdf'>('image');
  previewTitle   = signal('');

  // Переименование
  renameVisible = signal(false);
  renameValue   = signal('');
  private renameTarget: { id: string; type: 'file' | 'folder' } | null = null;

  private sortFn<T extends { name: string; updatedAt: string; size?: string }>(list: T[]): T[] {
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    const field = this.sortField();
    return [...list].sort((a, b) => {
      let r = 0;
      if (field === 'size') r = (+(a.size ?? 0) || 0) - (+(b.size ?? 0) || 0);
      else if (field === 'date') r = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      else r = decodeURIComponent(a.name).localeCompare(decodeURIComponent(b.name));
      return r * dir;
    });
  }

  private match = (name: string) =>
    !this.search().trim() || decodeURIComponent(name).toLowerCase().includes(this.search().trim().toLowerCase());

  folders = computed(() => this.sortFn(this.allFolders().filter(f => this.match(f.name))));
  files   = computed(() => this.sortFn(this.allFiles().filter(f => this.match(f.name))));

  totalCount = computed(() => this.allFiles().length + this.allFolders().length);
  isEmpty    = computed(() => this.totalCount() === 0);
  noMatches  = computed(() => !this.isEmpty() && this.folders().length === 0 && this.files().length === 0);

  selectedCount = computed(() => this.selected().size);

  ngOnInit() {
    this.fileSystem.loadStarred();
  }

  setSort(field: SortField) {
    if (this.sortField() === field) this.sortDir.update(d => (d === 'asc' ? 'desc' : 'asc'));
    else { this.sortField.set(field); this.sortDir.set(field === 'name' ? 'asc' : 'desc'); }
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
  clearSelection() { this.selected.set(new Set()); }

  // Все ли видимые элементы выбраны.
  allSelected = computed(() => {
    const total = this.files().length + this.folders().length;
    return total > 0 && this.selected().size >= total;
  });

  toggleSelectAll() {
    if (this.allSelected()) { this.clearSelection(); return; }
    const set = new Set<string>();
    this.folders().forEach(f => set.add(this.key(f.id, 'folder')));
    this.files().forEach(f => set.add(this.key(f.id, 'file')));
    this.selected.set(set);
  }

  unstarSelected() {
    const keys = [...this.selected()];
    if (!keys.length) return;
    keys.forEach((k, i) => {
      const [type, id] = k.split(':') as ['file' | 'folder', string];
      this.fileSystem.toggleStar(id, type).subscribe({
        next: () => { if (i === keys.length - 1) { this.fileSystem.loadStarred(); this.toast(this.t().toastUnstarred); } },
        error: () => this.toast(this.t().toastError),
      });
    });
    this.clearSelection();
  }

  downloadSelected() {
    const files = this.allFiles().filter(f => this.selected().has(this.key(f.id, 'file')));
    files.forEach(f => this.fileSystem.downloadFile(f));
    const folders = this.allFolders().filter(f => this.selected().has(this.key(f.id, 'folder')));
    folders.forEach(f => this.fileSystem.downloadFolder(f.id, f.name));
  }

  // ── Действия ──
  isImage(f: FileItem): boolean { return (f.mimeType ?? '').startsWith('image/'); }
  isVideo(f: FileItem): boolean { return (f.mimeType ?? '').startsWith('video/'); }
  isAudio(f: FileItem): boolean {
    const m = f.mimeType ?? '';
    return m.startsWith('audio/') || /\.(mp3|wav|ogg|flac|aac|m4a|opus)$/i.test(f.name);
  }
  isPdf(f: FileItem): boolean {
    return (f.mimeType ?? '') === 'application/pdf' || /\.pdf$/i.test(f.name);
  }
  // Можно ли открыть файл во встроенном вьюере.
  canPreview(f: FileItem): boolean {
    return this.isImage(f) || this.isVideo(f) || this.isAudio(f) || this.isPdf(f);
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

  openFolder(folder: FolderItem) {
    this.router.navigate(['/file-system']).then(() => this.fileSystem.openFolder(folder.id));
  }

  openFile(file: FileItem) {
    const kind = this.isImage(file) ? 'image'
      : this.isVideo(file) ? 'video'
      : this.isAudio(file) ? 'audio'
      : this.isPdf(file)   ? 'pdf'
      : null;
    if (!kind) { this.openLocation(file); return; }
    this.previewKind.set(kind);
    this.previewUrl.set(file.downloadUrl);
    this.previewSafeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(file.downloadUrl));
    this.previewTitle.set(decodeURIComponent(file.name));
    this.previewVisible.set(true);
  }

  closePreview() {
    this.previewVisible.set(false);
    this.previewUrl.set(null);
    this.previewSafeUrl.set(null);
  }

  openLocation(file: FileItem) {
    this.router.navigate(['/file-system']).then(() => this.fileSystem.revealFolder(file.folderId));
  }

  download(file: FileItem) { this.fileSystem.downloadFile(file); }
  downloadFolder(folder: FolderItem) { this.fileSystem.downloadFolder(folder.id, folder.name); }

  unstar(item: FileItem | FolderItem, type: 'file' | 'folder') {
    this.fileSystem.toggleStar(item.id, type).subscribe({
      next: () => this.toast(this.t().toastUnstarred),
      error: () => this.toast(this.t().toastError),
    });
  }

  openRename(item: FileItem | FolderItem, type: 'file' | 'folder') {
    this.renameTarget = { id: item.id, type };
    this.renameValue.set(decodeURIComponent(item.name));
    this.renameVisible.set(true);
  }

  submitRename() {
    const tgt = this.renameTarget;
    const name = this.renameValue().trim();
    if (!tgt || !name) return;
    this.fileSystem.renameItem(tgt.id, tgt.type, name).subscribe({
      next: () => { this.renameVisible.set(false); this.fileSystem.loadStarred(); this.toast(this.t().toastRenamed); },
      error: () => this.toast(this.t().toastError),
    });
  }

  private toast(detail: string) {
    this.messageService.add({ severity: 'secondary', summary: detail, key: 'br', life: 1800 });
  }
}
