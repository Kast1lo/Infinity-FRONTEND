import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FileSystem } from '../../../services/file-system';
import { LangService } from '../../../services/lang';
import {
  SharedWithMeFolder,
  SharedFolderContents,
  SharedFolderEntry,
  SharedFolderFile,
} from '../../../interfaces/file-system-interfeces/folder-collab.model';
import { ProgressSpinner } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DecodeURIComponentPipe } from '../../../pipes/decode-uri.pipe';

@Component({
  selector: 'app-shared-with-me',
  imports: [FormsModule, ProgressSpinner, ButtonModule, DialogModule, InputTextModule, ToastModule, DecodeURIComponentPipe],
  templateUrl: './shared-with-me.html',
  styleUrl: './shared-with-me.scss',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SharedWithMe implements OnInit {
  private readonly fileSystem = inject(FileSystem);
  private readonly messageService = inject(MessageService);
  protected readonly langService = inject(LangService);

  t = computed(() => this.langService.t().pages.sharedWithMe);

  roots   = this.fileSystem.sharedWithMe;
  loading = this.fileSystem.sharedWithMeLoading;

  // null → показываем список общих папок; иначе — содержимое открытой папки
  contents = signal<SharedFolderContents | null>(null);
  contentsLoading = signal(false);
  // Хлебные крошки: цепочка {id,name} от корня шары до текущей папки
  pathStack = signal<{ id: string; name: string }[]>([]);

  rootId = signal<string | null>(null);

  showNewFolder = signal(false);
  newFolderName = signal('');
  busy = signal(false);

  showRename   = signal(false);
  renameName   = signal('');
  renameTarget = signal<{ id: string; type: 'file' | 'folder' } | null>(null);

  isEmpty   = computed(() => this.roots().length === 0);
  canEdit   = computed(() => { const r = this.contents()?.role; return r === 'EDITOR' || r === 'OWNER'; });
  currentId = computed(() => this.pathStack().at(-1)?.id ?? null);

  ngOnInit() {
    this.fileSystem.loadSharedWithMe();
  }

  openRoot(folder: SharedWithMeFolder) {
    this.rootId.set(folder.id);
    this.pathStack.set([{ id: folder.id, name: folder.name }]);
    this.load(folder.id);
  }

  openSubfolder(entry: SharedFolderEntry) {
    this.pathStack.update(s => [...s, { id: entry.id, name: entry.name }]);
    this.load(entry.id);
  }

  navigateToIndex(index: number) {
    const stack = this.pathStack().slice(0, index + 1);
    this.pathStack.set(stack);
    this.load(stack[stack.length - 1].id);
  }

  backToList() {
    this.contents.set(null);
    this.pathStack.set([]);
    this.rootId.set(null);
  }

  private load(folderId: string) {
    this.contentsLoading.set(true);
    this.fileSystem.getFolderContents(folderId).subscribe({
      next: (c) => { this.contents.set(c); this.contentsLoading.set(false); },
      error: () => { this.contentsLoading.set(false); this.toast(this.t().openFailed); },
    });
  }

  private reload() {
    const id = this.currentId();
    if (id) this.load(id);
  }

  download(file: SharedFolderFile) {
    const link = document.createElement('a');
    link.href = file.downloadUrl;
    link.download = file.name;
    link.target = '_blank';
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  downloadZip() {
    const c = this.contents();
    if (c) this.fileSystem.downloadSharedFolderZip(c.id, c.name);
  }

  onUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    const id = this.currentId();
    if (!files || files.length === 0 || !id) return;
    this.busy.set(true);
    this.fileSystem.uploadToSharedFolder(id, files).subscribe({
      next: () => { this.busy.set(false); input.value = ''; this.toast(this.t().uploaded, true); this.reload(); },
      error: (err) => { this.busy.set(false); input.value = ''; this.toast(err?.message ?? this.t().uploadFailed); },
    });
  }

  openNewFolder() { this.newFolderName.set(''); this.showNewFolder.set(true); }

  createFolder() {
    const id = this.currentId();
    const name = this.newFolderName().trim();
    if (!id || !name) return;
    this.busy.set(true);
    this.fileSystem.createSubfolderInShared(id, name).subscribe({
      next: () => { this.busy.set(false); this.showNewFolder.set(false); this.toast(this.t().folderCreated, true); this.reload(); },
      error: (err) => { this.busy.set(false); this.toast(err?.message ?? this.t().folderCreateFailed); },
    });
  }

  openRename(id: string, type: 'file' | 'folder', name: string) {
    this.renameTarget.set({ id, type });
    this.renameName.set(name);
    this.showRename.set(true);
  }

  submitRename() {
    const tgt = this.renameTarget();
    const name = this.renameName().trim();
    if (!tgt || !name || this.busy()) return;
    this.busy.set(true);
    this.fileSystem.renameSharedItem(tgt.id, tgt.type, name).subscribe({
      next: () => { this.busy.set(false); this.showRename.set(false); this.toast(this.t().renamed, true); this.reload(); },
      error: (err) => { this.busy.set(false); this.toast(err?.message ?? this.t().renameFailed); },
    });
  }

  deleteFile(file: SharedFolderFile) {
    this.fileSystem.deleteSharedItem(file.id, 'file').subscribe({
      next: () => { this.toast(this.t().deleted, true); this.reload(); },
      error: (err) => this.toast(err?.message ?? this.t().deleteFailed),
    });
  }

  deleteFolder(entry: SharedFolderEntry) {
    this.fileSystem.deleteSharedItem(entry.id, 'folder').subscribe({
      next: () => { this.toast(this.t().deleted, true); this.reload(); },
      error: (err) => this.toast(err?.message ?? this.t().deleteFailed),
    });
  }

  leave() {
    const id = this.rootId();
    if (!id) return;
    this.fileSystem.leaveSharedFolder(id).subscribe({
      next: () => { this.toast(this.t().left, true); this.backToList(); this.fileSystem.loadSharedWithMe(); },
      error: (err) => this.toast(err?.message ?? this.t().openFailed),
    });
  }

  getFileIcon(mimeType: string | null): string {
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

  formatSize(size: string): string {
    const bytes = parseInt(size, 10);
    if (isNaN(bytes)) return '';
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} МБ`;
    return `${(bytes / 1024 ** 3).toFixed(1)} ГБ`;
  }

  private toast(detail: string, success = false) {
    this.messageService.add({ severity: 'secondary', summary: success ? this.t().toastDone : this.t().toastError, detail, key: 'br', life: 1800 });
  }
}
