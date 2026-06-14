import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  HostListener,
  inject,
  OnInit,
  signal,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SecurityContext } from '@angular/core';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { TableModule } from 'primeng/table';
import { FileSystem } from '../../../../../services/file-system';
import { FileItem } from '../../../../../interfaces/file-system-interfeces/file-item.model';
import { MenuItem, MessageService, PrimeIcons } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinner } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { CardModule } from 'primeng/card';
import { FolderItem } from '../../../../../interfaces/file-system-interfeces/folder-item.model';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { DecodeURIComponentPipe } from '../../../../../pipes/decode-uri.pipe';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { RippleModule } from 'primeng/ripple';
import { ImageModule } from 'primeng/image';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { ShareService } from '../../../../../services/share';
import { UploadQueueService } from '../../../../../services/upload-queue';
import { ZipEntry } from '../../../../../interfaces/file-system-interfeces/zip-entry.model';
import { LangService } from '../../../../../services/lang';
import { FolderMember } from '../../../../../interfaces/file-system-interfeces/folder-collab.model';

@Component({
  selector: 'app-list-files',
  imports: [
    ScrollPanelModule, TableModule, ToastModule, ButtonModule, MenuModule,
    CardModule, ProgressSpinner, TieredMenuModule, DecodeURIComponentPipe,
    BreadcrumbModule, RippleModule, ImageModule, DialogModule,
    InputTextModule, FormsModule, NgTemplateOutlet,
  ],
  templateUrl: './list-files.html',
  styleUrl: './list-files.scss',
  providers: [MessageService, TieredMenuModule, RippleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListFiles implements OnInit {
  @ViewChild('videoPlayer') videoPlayerRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('audioPlayer') audioPlayerRef?: ElementRef<HTMLAudioElement>;

  protected readonly messageService = inject(MessageService);
  protected readonly fileSystem = inject(FileSystem);
  protected readonly shareService = inject(ShareService);
  protected readonly uploadQueue = inject(UploadQueueService);
  protected readonly langService = inject(LangService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);

  t = computed(() => this.langService.t().pages.listFiles);
  tp = computed(() => this.langService.t().pages.projects);

  files = this.fileSystem.filteredFiles;
  folders = this.fileSystem.filteredFolders;

  // Папки, видимые в текущей директории (по parentId)
  visibleFolders = computed(() =>
    this.fileSystem.filteredFolders().filter(
      (f) => f.parentId === this.fileSystem.currentFolderId(),
    ),
  );

  selectedItem = this.fileSystem.selectedItem;
  loading = this.fileSystem.loading;
  error = this.fileSystem.error;

  renameDialogVisible = signal(false);
  renameValue = signal('');
  private renameTarget: { id: string; type: 'file' | 'folder' } | null = null;

  moveDialogVisible = signal(false);
  moveTargetFile    = signal<FileItem | null>(null);
  moveTargetFolder  = signal<FolderItem | null>(null);
  moveKind          = signal<'file' | 'folder'>('file');
  selectedFolderId  = signal<string | null>(null);

  // Имя/иконка перемещаемого объекта (файл или папка)
  moveTargetName = computed(() => {
    const f = this.moveTargetFile();
    return f ? f.name : (this.moveTargetFolder()?.name ?? '');
  });
  moveTargetIcon = computed(() => {
    const f = this.moveTargetFile();
    return f ? 'pi ' + this.getFileIcon(f.mimeType) : 'pi pi-folder';
  });
  // Текущий родитель (откуда перемещаем) — для пометки и блокировки
  moveCurrentParentId = computed(() =>
    this.moveKind() === 'file'
      ? (this.moveTargetFile()?.folderId ?? null)
      : (this.moveTargetFolder()?.parentId ?? null)
  );
  // Запрещённые цели при перемещении папки: сама папка и всё её поддерево
  moveForbiddenIds = computed<Set<string>>(() => {
    if (this.moveKind() !== 'folder') return new Set();
    const root = this.moveTargetFolder();
    if (!root) return new Set();
    const all = this.fileSystem.folders();
    const forbidden = new Set<string>([root.id]);
    const queue = [root.id];
    while (queue.length) {
      const current = queue.shift()!;
      for (const f of all) {
        if (f.parentId === current && !forbidden.has(f.id)) { forbidden.add(f.id); queue.push(f.id); }
      }
    }
    return forbidden;
  });

  isMoveTargetSelectable(folderId: string): boolean {
    return !this.moveForbiddenIds().has(folderId) && folderId !== this.moveCurrentParentId();
  }

  videoDialogVisible = false;
  videoUrl: string | null = null;
  videoTitle = '';

  audioDialogVisible = signal(false);
  audioUrl           = signal<string | null>(null);
  audioTitle         = signal('');
  audioIsPlaying     = signal(false);
  audioIsMuted       = signal(false);
  audioVolume        = signal(1);
  audioProgress      = signal(0);
  audioCurrentTime   = signal('0:00');
  audioDuration      = signal('0:00');
  private audioRafId: any;

  imagePreviewVisible = false;
  imagePreviewUrl: string | null = null;
  imagePreviewTitle = '';

  docDialogVisible = false;
  docTitle = '';
  docLoading = false;
  docHtml = signal<string>('');
  docType: 'word' | 'excel' | 'ppt' | 'pdf' | null = null;

  pdfDialogVisible = false;
  pdfTitle = '';
  pdfLoading = false;
  pdfPages = signal<string[]>([]);

  zipDialogVisible = false;
  zipTitle = '';
  zipLoading = false;
  zipEntries = signal<ZipEntry[]>([]);
  private zipRef: any = null;

  isPlaying = false;
  isMuted = false;
  volume = 1;
  progress = 0;
  currentTimeStr = '0:00';
  durationStr = '0:00';
  controlsHidden = false;
  private controlsTimer: any;
  private clickTimer: any;
  private rafId: any;
  isDragging = signal(false);
  private dragCounter = 0;

  private static readonly INTERNAL_FILE_MIME = 'application/x-infinity-file';
  draggingFileId      = signal<string | null>(null);
  draggedOverFolderId = signal<string | null>(null);

  // Множественное выделение файлов (для группового перетаскивания)
  selectedFileIds = signal<Set<string>>(new Set());
  draggingFileIds = signal<Set<string>>(new Set());
  private lastClickedFileId: string | null = null;

  // Выделение рамкой (lasso / marquee)
  private readonly hostEl = inject(ElementRef);
  marqueeBox = signal<{ left: number; top: number; width: number; height: number } | null>(null);
  private marqueeStart: { x: number; y: number } | null = null;
  private marqueeBaseIds = new Set<string>();
  private marqueeMoved = false;
  private suppressNextClickClear = false;
  private static readonly MARQUEE_THRESHOLD = 5;
  private static readonly MARQUEE_SKIP_SELECTOR =
    '.file-card, .folder-card, .card-menu-btn, button, a, input, ' +
    '.p-tieredmenu, .p-menu, .p-overlay, .p-overlay-mask, ' +
    '.p-dialog, .p-dialog-mask, .fs-selbar, .fs-crumbs, .p-breadcrumb, ' +
    '.p-scrollpanel-bar, .p-scrollpanel-bar-x, .p-scrollpanel-bar-y';

  uploadConfirmVisible = signal(false);
  uploadConfirmTitle   = signal('');
  uploadConfirmMessage = signal('');
  private pendingUpload: (() => void) | null = null;

  homeItem: MenuItem = {
    icon: 'pi pi-home',
    command: () => this.fileSystem.navigateToRoot(),
  };

  breadcrumbModel = computed<MenuItem[]>(() => {
    const items = this.fileSystem.breadcrumbItems();
    return items.map((item: { id: string; label: string }, index: number) => ({
      label: item.label,
      command: () => this.fileSystem.navigateToIndex(index),
    }));
  });

  constructor() {}

  items = computed<MenuItem[]>(() => {
    const selected = this.selectedItem();
    if (!selected) return [];

    const isFile = 'downloadUrl' in selected;
    const type: 'file' | 'folder' = isFile ? 'file' : 'folder';
    const lf = this.langService.t().pages.listFiles;

    const renameItem: MenuItem = {
      label: lf.menuRename,
      icon: PrimeIcons.PENCIL,
      command: () => this.openRenameDialog(selected, type),
    };

    const deleteItem: MenuItem = {
      label: lf.menuDelete,
      icon: PrimeIcons.TRASH,
      command: () => this.deleteSelected(),
    };

    const starItem: MenuItem = {
      label: selected.isStarred ? lf.menuUnstar : lf.menuStar,
      icon: selected.isStarred ? PrimeIcons.STAR_FILL : PrimeIcons.STAR,
      command: () => this.fileSystem.toggleStar(selected.id, type).subscribe({ error: () => {} }),
    };

    if (isFile) {
      const file = selected as FileItem;
      const menuItems: MenuItem[] = [
        { label: lf.menuDownload, icon: PrimeIcons.DOWNLOAD, command: () => this.fileSystem.downloadFile(file) },
        starItem,
        renameItem,
        { label: lf.menuMove, icon: PrimeIcons.ARROW_RIGHT_ARROW_LEFT, command: () => this.openMoveDialog(file) },
        deleteItem,
        { label: lf.menuShare, icon: PrimeIcons.SEND, command: () => this.openShareDialog(file) },
      ];

      if (this.isAudio(file)) {
        menuItems.unshift({ label: lf.clickToListen, icon: PrimeIcons.VOLUME_UP, command: () => this.openAudio(file) });
      } else if (this.isVideo(file)) {
        menuItems.unshift({ label: lf.clickToView, icon: PrimeIcons.PLAY, command: () => this.openVideo(file) });
      }
      if (this.isPdf(file)) {
        menuItems.unshift({ label: lf.clickToView, icon: PrimeIcons.EYE, command: () => this.openPdf(file) });
      } else if (this.isZip(file)) {
        menuItems.unshift({ label: lf.clickToView, icon: PrimeIcons.EYE, command: () => this.openZip(file) });
      } else if (this.isDocument(file)) {
        menuItems.unshift({ label: lf.clickToView, icon: PrimeIcons.EYE, command: () => this.openDocument(file) });
      }

      return menuItems;
    } else {
      const folder = selected as FolderItem;
      return [
        { label: lf.menuDownload, icon: PrimeIcons.DOWNLOAD, command: () => this.fileSystem.downloadFolder(selected.id, selected.name) },
        starItem,
        renameItem,
        { label: lf.menuMove, icon: PrimeIcons.ARROW_RIGHT_ARROW_LEFT, command: () => this.openMoveFolderDialog(folder) },
        { label: lf.menuShare, icon: PrimeIcons.SEND, command: () => this.openFolderShareDialog(folder) },
        { label: lf.menuFolderAccess, icon: PrimeIcons.USERS, command: () => this.openFolderAccessDialog(folder) },
        deleteItem,
      ];
    }
  });

  ngOnInit() {
    this.fileSystem.loadTree();
    this.fileSystem.loadFiles(null);
  }

  private static readonly KEEP_SELECTION_SELECTOR =
    '.file-card, .folder-card, .p-card, .p-toolbar, .fs-selbar, ' +
    '.p-tieredmenu, .p-menu, .p-overlay, .p-overlay-mask, ' +
    '.p-dialog, .p-dialog-mask, .p-toast';

  @HostListener('document:click', ['$event'])
  onDocumentClickClearSelection(event: MouseEvent) {
    if (this.suppressNextClickClear) { this.suppressNextClickClear = false; return; }
    if (!this.selectedItem() && this.selectedFileIds().size === 0) return;
    const target = event.target as HTMLElement | null;
    if (!target || !target.isConnected) return;
    if (target.closest(ListFiles.KEEP_SELECTION_SELECTOR)) return;
    this.clearAllSelection();
  }

  isImage(file: FileItem): boolean { return file.mimeType.startsWith('image/'); }
  isVideo(file: FileItem): boolean { return file.mimeType.startsWith('video/'); }
  isPdf(file: FileItem):   boolean { return file.mimeType === 'application/pdf'; }

  isAudio(file: FileItem): boolean {
    const name = file.name.toLowerCase();
    return (
      file.mimeType.startsWith('audio/') ||
      /\.(mp3|wav|ogg|flac|aac|m4a|wma|opus)$/.test(name)
    );
  }

  isZip(file: FileItem): boolean {
    return (
      file.mimeType === 'application/zip' ||
      file.mimeType === 'application/x-zip-compressed' ||
      file.mimeType === 'application/x-zip' ||
      file.name.toLowerCase().endsWith('.zip')
    );
  }

  isDocument(file: FileItem): boolean {
    const m = file.mimeType;
    return (
      m.includes('word') || m.includes('document') ||
      m.includes('excel') || m.includes('spreadsheet') ||
      m.includes('powerpoint') || m.includes('presentation') ||
      m === 'application/vnd.ms-excel' ||
      m === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      m === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      m === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    );
  }

  getDocType(mimeType: string): 'word' | 'excel' | 'ppt' | 'pdf' | null {
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'excel';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'ppt';
    return null;
  }

  openAudio(file: FileItem) {
    this.audioUrl.set(file.downloadUrl);
    this.audioTitle.set(decodeURIComponent(file.name));
    this.audioIsPlaying.set(false);
    this.audioProgress.set(0);
    this.audioCurrentTime.set('0:00');
    this.audioDuration.set('0:00');
    this.audioDialogVisible.set(true);
    this.cdr.markForCheck();
  }

  closeAudio() {
    const audio = this.audioPlayerRef?.nativeElement;
    if (audio) { audio.pause(); audio.currentTime = 0; }
    this.audioIsPlaying.set(false);
    this.audioDialogVisible.set(false);
    this.audioUrl.set(null);
    this.stopAudioLoop();
    this.cdr.markForCheck();
  }

  toggleAudioPlay() {
    const audio = this.audioPlayerRef?.nativeElement;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
      this.audioIsPlaying.set(true);
      this.startAudioLoop();
    } else {
      audio.pause();
      this.audioIsPlaying.set(false);
      this.stopAudioLoop();
    }
    this.cdr.markForCheck();
  }

  toggleAudioMute() {
    const audio = this.audioPlayerRef?.nativeElement;
    if (!audio) return;
    audio.muted = !audio.muted;
    this.audioIsMuted.set(audio.muted);
    this.cdr.markForCheck();
  }

  onAudioVolumeChange(event: Event) {
    const audio = this.audioPlayerRef?.nativeElement;
    if (!audio) return;
    const input = event.target as HTMLInputElement;
    const val = parseFloat(input.value);
    audio.volume = val;
    this.audioVolume.set(val);
    this.audioIsMuted.set(val === 0);
    input.style.setProperty('--volume-pct', `${val * 100}%`);
    this.cdr.markForCheck();
  }

  onAudioMetaLoaded() {
    const audio = this.audioPlayerRef?.nativeElement;
    if (!audio) return;
    this.audioDuration.set(this.formatTime(audio.duration));
    this.cdr.markForCheck();
  }

  onAudioEnded() {
    this.audioIsPlaying.set(false);
    this.audioProgress.set(0);
    this.stopAudioLoop();
    this.cdr.markForCheck();
  }

  seekAudio(event: MouseEvent) {
    const audio = this.audioPlayerRef?.nativeElement;
    const bar = event.currentTarget as HTMLElement;
    if (!audio || !bar) return;
    const rect = bar.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * audio.duration;
    this.cdr.markForCheck();
  }

  private startAudioLoop() {
    this.stopAudioLoop();
    const audio = this.audioPlayerRef?.nativeElement;
    if (!audio) return;
    const tick = () => {
      if (!audio.paused && !audio.ended) {
        this.audioProgress.set(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
        this.audioCurrentTime.set(this.formatTime(audio.currentTime));
        this.cdr.markForCheck();
        this.audioRafId = requestAnimationFrame(tick);
      }
    };
    this.audioRafId = requestAnimationFrame(tick);
  }

  private stopAudioLoop() {
    if (this.audioRafId) { cancelAnimationFrame(this.audioRafId); this.audioRafId = null; }
  }

  openRenameDialog(item: FileItem | FolderItem, type: 'file' | 'folder') {
    this.renameValue.set(decodeURIComponent(item.name));
    this.renameTarget = { id: item.id, type };
    this.renameDialogVisible.set(true);
  }

  submitRename() {
    const newName = this.renameValue().trim();
    if (!newName || !this.renameTarget) return;
    const { id, type } = this.renameTarget;
    const lf = this.langService.t().pages.listFiles;
    this.fileSystem.renameItem(id, type, newName).subscribe({
      next: () => {
        this.messageService.add({ severity: 'secondary', summary: lf.toastDone, detail: lf.menuRename, key: 'br' });
        this.closeRenameDialog();
      },
      error: (err) => this.messageService.add({ severity: 'secondary', summary: lf.toastError, detail: err?.message || lf.menuRename, key: 'br' }),
    });
  }

  closeRenameDialog() {
    this.renameDialogVisible.set(false);
    this.renameValue.set('');
    this.renameTarget = null;
  }

  openMoveDialog(file: FileItem) {
    this.moveKind.set('file');
    this.moveTargetFile.set(file);
    this.moveTargetFolder.set(null);
    this.selectedFolderId.set(file.folderId ?? null);
    this.moveDialogVisible.set(true);
  }

  openMoveFolderDialog(folder: FolderItem) {
    this.moveKind.set('folder');
    this.moveTargetFolder.set(folder);
    this.moveTargetFile.set(null);
    this.selectedFolderId.set(folder.parentId ?? null);
    this.moveDialogVisible.set(true);
  }

  closeMoveDialog() {
    this.moveDialogVisible.set(false);
    this.moveTargetFile.set(null);
    this.moveTargetFolder.set(null);
    this.selectedFolderId.set(null);
  }

  submitMove() {
    const folderId = this.selectedFolderId();
    const lf = this.langService.t().pages.listFiles;
    const done = () => { this.messageService.add({ severity: 'secondary', summary: lf.toastDone, detail: lf.menuMove, key: 'br' }); this.closeMoveDialog(); };
    const fail = (err?: any) => this.messageService.add({ severity: 'secondary', summary: lf.toastError, detail: err?.message || lf.menuMove, key: 'br' });

    if (this.moveKind() === 'folder') {
      const folder = this.moveTargetFolder();
      if (!folder) return;
      this.fileSystem.moveFolder(folder.id, folderId).subscribe({ next: done, error: fail });
    } else {
      const file = this.moveTargetFile();
      if (!file) return;
      this.fileSystem.moveFile(file.id, folderId).subscribe({ next: done, error: fail });
    }
  }

  getFolderTree(): FolderItem[] { return this.fileSystem.folders().filter(f => f.id !== this.moveTargetFile()?.folderId); }
  getRootFolders(): FolderItem[] { return this.fileSystem.folders().filter(f => !f.parentId); }
  getChildFolders(parentId: string): FolderItem[] { return this.fileSystem.folders().filter(f => f.parentId === parentId); }

  openImagePreview(file: FileItem) {
    this.imagePreviewUrl = file.downloadUrl;
    this.imagePreviewTitle = decodeURIComponent(file.name);
    this.imagePreviewVisible = true;
    this.cdr.markForCheck();
  }

  closeImagePreview() {
    this.imagePreviewVisible = false;
    this.imagePreviewUrl = null;
    this.imagePreviewTitle = '';
    this.cdr.markForCheck();
  }

  async openPdf(file: FileItem) {
    this.pdfTitle = decodeURIComponent(file.name);
    this.pdfPages.set([]);
    this.pdfLoading = true;
    this.pdfDialogVisible = true;
    this.cdr.detectChanges();
    try {
      const arrayBuffer = await this.fileSystem.fetchFileAsArrayBuffer(file.id);
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) throw new Error('pdf.js not loaded');
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pages: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
        pages.push(canvas.toDataURL('image/png'));
        this.pdfPages.set([...pages]);
        this.cdr.detectChanges();
      }
    } catch (e) { console.error('PDF error:', e); this.pdfPages.set([]); }
    this.pdfLoading = false;
    this.cdr.detectChanges();
  }

  closePdf() { this.pdfDialogVisible = false; this.pdfPages.set([]); this.pdfTitle = ''; this.pdfLoading = false; }

  async openZip(file: FileItem) {
    this.zipTitle = decodeURIComponent(file.name);
    this.zipEntries.set([]);
    this.zipLoading = true;
    this.zipDialogVisible = true;
    this.zipRef = null;
    this.cdr.detectChanges();
    try {
      const arrayBuffer = await this.fileSystem.fetchFileAsArrayBuffer(file.id);
      const JSZip = (window as any).JSZip;
      if (!JSZip) throw new Error('JSZip not loaded');
      const zip = await JSZip.loadAsync(arrayBuffer);
      this.zipRef = zip;
      const entries: ZipEntry[] = [];
      zip.forEach((relativePath: string, zipEntry: any) => {
        const parts = relativePath.split('/').filter((p: string) => p.length > 0);
        entries.push({ name: parts[parts.length - 1] || relativePath, path: relativePath, isDir: zipEntry.dir, size: zipEntry._data?.uncompressedSize ?? 0, depth: parts.length - 1, expanded: parts.length - 1 === 0 });
      });
      entries.sort((a, b) => { if (a.depth !== b.depth) return a.depth - b.depth; if (a.isDir !== b.isDir) return a.isDir ? -1 : 1; return a.path.localeCompare(b.path); });
      this.zipEntries.set(entries);
    } catch (e) { console.error('ZIP error:', e); this.zipEntries.set([]); }
    this.zipLoading = false;
    this.cdr.detectChanges();
  }

  closeZip() { this.zipDialogVisible = false; this.zipEntries.set([]); this.zipTitle = ''; this.zipLoading = false; this.zipRef = null; }

  async downloadZipEntry(entry: ZipEntry) {
    if (!this.zipRef || entry.isDir) return;
    try {
      const blob = await this.zipRef.file(entry.path).async('blob');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = entry.name; link.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error('ZIP entry error:', e); }
  }

  getZipIcon(entry: ZipEntry): string {
    if (entry.isDir) return 'pi-folder';
    const n = entry.name.toLowerCase();
    if (/\.(jpg|jpeg|png|gif|webp|svg)$/.test(n)) return 'pi-image';
    if (/\.(mp4|mov|avi|mkv|webm)$/.test(n)) return 'pi-video';
    if (/\.(mp3|wav|ogg|flac|aac|m4a)$/.test(n)) return 'pi-volume-up';
    if (/\.(pdf)$/.test(n)) return 'pi-file-pdf';
    if (/\.(doc|docx)$/.test(n)) return 'pi-file-word';
    if (/\.(xls|xlsx)$/.test(n)) return 'pi-file-excel';
    if (/\.(zip|rar|7z|tar|gz)$/.test(n)) return 'pi-box';
    return 'pi-file';
  }

  formatZipSize(bytes: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  }

  async openDocument(file: FileItem) {
    this.docTitle = decodeURIComponent(file.name);
    this.docType = this.getDocType(file.mimeType) ?? this.getDocTypeByName(file.name);
    this.docHtml.set('');
    this.docLoading = true;
    this.docDialogVisible = true;
    this.cdr.detectChanges();
    try {
      const name = file.name.toLowerCase();
      if (this.docType === 'word' && name.endsWith('.doc')) {
        throw new Error('Старый формат .doc не поддерживается в предпросмотре. Скачайте файл и откройте в Word.');
      }
      if (this.docType === 'excel' && name.endsWith('.xls')) {
        throw new Error('Старый формат .xls не поддерживается в предпросмотре. Скачайте файл и откройте в Excel.');
      }

      const arrayBuffer = await this.fileSystem.fetchFileAsArrayBuffer(file.id);

      const bytes = new Uint8Array(arrayBuffer);
      const sig = Array.from(bytes.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join(' ');
      console.log(`[doc] получено ${bytes.length} байт, ожидалось ${file.size}, сигнатура: ${sig}`);
      const realFormat = this.detectFormat(bytes);

      if (this.docType === 'word') {
        if (realFormat === 'rtf') {
          this.docHtml.set(this.renderRtf(bytes));
          return;
        }
        if (realFormat === 'ole') {
          throw new Error('Файл сохранён в старом формате .doc (OLE). Скачайте и откройте в Word.');
        }
        if (realFormat !== 'zip') {
          throw new Error(`Файл не похож на .docx. Сигнатура: ${sig}, размер: ${bytes.length}.`);
        }
        const mammoth = (window as any).mammoth;
        if (!mammoth) throw new Error('Библиотека mammoth не загружена (CDN недоступен?)');
        const result = await mammoth.convertToHtml({ arrayBuffer });
        this.docHtml.set(result.value || '<p style="opacity:.6">Документ пуст</p>');
      } else if (this.docType === 'excel') {
        if (realFormat === 'ole') {
          throw new Error('Файл сохранён в старом формате .xls (OLE). Скачайте и откройте в Excel.');
        }
        const XLSX = (window as any).XLSX;
        if (!XLSX) throw new Error('Библиотека XLSX не загружена (CDN недоступен?)');
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        let html = '';
        wb.SheetNames.forEach((name: string) => { const ws = wb.Sheets[name]; html += `<div class="sheet-tab">${name}</div>` + XLSX.utils.sheet_to_html(ws, { editable: false }); });
        this.docHtml.set(html);
      } else if (this.docType === 'ppt') {
        this.docHtml.set('<div class="doc-ppt-msg"><i class="pi pi-info-circle"></i><p>Предпросмотр PowerPoint ограничен.<br>Скачайте файл для полного просмотра.</p></div>');
      } else {
        throw new Error(`Неизвестный тип документа (mimeType=${file.mimeType})`);
      }
    } catch (e: any) {
      console.error('Document load error:', e);
      const msg = this.escapeHtml(e?.message || 'Неизвестная ошибка');
      this.docHtml.set(
        `<div class="doc-error"><i class="pi pi-exclamation-circle"></i><p>Не удалось загрузить документ</p><small style="opacity:.7;margin-top:8px;display:block;">${msg}</small></div>`
      );
    }
    this.docLoading = false;
    this.cdr.detectChanges();
  }

  private getDocTypeByName(name: string): 'word' | 'excel' | 'ppt' | 'pdf' | null {
    const n = name.toLowerCase();
    if (n.endsWith('.pdf')) return 'pdf';
    if (n.endsWith('.docx') || n.endsWith('.doc') || n.endsWith('.rtf')) return 'word';
    if (n.endsWith('.xlsx') || n.endsWith('.xls')) return 'excel';
    if (n.endsWith('.pptx') || n.endsWith('.ppt')) return 'ppt';
    return null;
  }

  private detectFormat(b: Uint8Array): 'zip' | 'ole' | 'rtf' | 'pdf' | 'unknown' {
    if (b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) return 'zip';
    if (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) return 'ole';
    if (b[0] === 0x7b && b[1] === 0x5c && b[2] === 0x72 && b[3] === 0x74) return 'rtf';
    if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'pdf';
    return 'unknown';
  }

  private renderRtf(bytes: Uint8Array): string {
    const text = new TextDecoder('latin1').decode(bytes);
    let s = text;
    s = s.replace(/\\u(-?\d+)\??/g, (_m, n) => {
      let code = parseInt(n, 10);
      if (code < 0) code += 65536;
      return String.fromCharCode(code);
    });
    const cp1251 = (h: string) => {
      const code = parseInt(h, 16);
      if (code < 0x80) return String.fromCharCode(code);
      const map: Record<number, number> = {
        0xa8: 0x0401, 0xb8: 0x0451, 0xaa: 0x0404, 0xba: 0x0454,
        0xaf: 0x0407, 0xbf: 0x0457, 0xa1: 0x040e, 0xa2: 0x045e,
      };
      if (map[code]) return String.fromCharCode(map[code]);
      if (code >= 0xc0) return String.fromCharCode(0x0410 + (code - 0xc0));
      return '';
    };
    s = s.replace(/\\'([0-9a-fA-F]{2})/g, (_m, h) => cp1251(h));
    s = s.replace(/\{\\\*?[^{}]*\}/g, '');
    s = s.replace(/\\par[d ]?/g, '\n').replace(/\\line ?/g, '\n');
    s = s.replace(/\\[a-zA-Z]+-?\d* ?/g, '');
    s = s.replace(/[{}]/g, '');
    s = s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    const escaped = this.escapeHtml(s);
    return `<div class="doc-rtf-notice" style="opacity:.6;font-size:.85em;margin-bottom:12px;"><i class="pi pi-info-circle"></i> RTF-файл — отображается без форматирования. Для полного просмотра скачайте.</div><pre style="white-space:pre-wrap;font-family:inherit;margin:0;">${escaped}</pre>`;
  }

  private escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  }

  closeDocument() { this.docDialogVisible = false; this.docHtml.set(''); this.docTitle = ''; this.docType = null; this.docLoading = false; }
  getSafeHtml(html: string): SafeHtml {
    const cleaned = this.sanitizer.sanitize(SecurityContext.HTML, html) ?? '';
    return this.sanitizer.bypassSecurityTrustHtml(cleaned);
  }

  openVideo(file: FileItem) { this.videoUrl = file.downloadUrl; this.videoTitle = decodeURIComponent(file.name); this.videoDialogVisible = true; this.cdr.markForCheck(); }

  closeVideo() {
    const video = this.videoPlayerRef?.nativeElement;
    if (video) { video.pause(); video.currentTime = 0; }
    this.isPlaying = false; this.progress = 0; this.currentTimeStr = '0:00'; this.durationStr = '0:00';
    this.videoUrl = null; this.videoTitle = ''; this.videoDialogVisible = false;
    clearTimeout(this.controlsTimer); this.stopProgressLoop();
    this.cdr.markForCheck();
  }

  togglePlay() {
    const video = this.videoPlayerRef?.nativeElement;
    if (!video) return;
    if (video.paused) { video.play(); this.isPlaying = true; this.startProgressLoop(); }
    else { video.pause(); this.isPlaying = false; this.stopProgressLoop(); }
    this.cdr.markForCheck();
  }

  toggleMute() { const video = this.videoPlayerRef?.nativeElement; if (!video) return; video.muted = !video.muted; this.isMuted = video.muted; this.cdr.markForCheck(); }

  onVolumeChange(event: Event) {
    const video = this.videoPlayerRef?.nativeElement; if (!video) return;
    const input = event.target as HTMLInputElement;
    const val = parseFloat(input.value);
    video.volume = val; this.volume = val; this.isMuted = val === 0;
    input.style.setProperty('--volume-pct', `${val * 100}%`);
    this.cdr.markForCheck();
  }

  onTimeUpdate() { const video = this.videoPlayerRef?.nativeElement; if (!video) return; this.progress = video.duration ? (video.currentTime / video.duration) * 100 : 0; this.currentTimeStr = this.formatTime(video.currentTime); this.cdr.markForCheck(); }

  onMetaLoaded() { const video = this.videoPlayerRef?.nativeElement; if (!video) return; this.durationStr = this.formatTime(video.duration); video.play(); this.isPlaying = true; this.startProgressLoop(); this.cdr.markForCheck(); }

  onEnded() { this.isPlaying = false; this.progress = 0; this.stopProgressLoop(); this.cdr.markForCheck(); }

  seek(event: MouseEvent) {
    const video = this.videoPlayerRef?.nativeElement; const bar = event.currentTarget as HTMLElement;
    if (!video || !bar) return;
    const rect = bar.getBoundingClientRect();
    video.currentTime = ((event.clientX - rect.left) / rect.width) * video.duration;
  }

  toggleFullscreen() { const video = this.videoPlayerRef?.nativeElement; if (!video) return; document.fullscreenElement ? document.exitFullscreen() : video.requestFullscreen(); }

  onPlayerMouseMove() {
    this.controlsHidden = false;
    this.cdr.markForCheck();
    clearTimeout(this.controlsTimer);
    this.controlsTimer = setTimeout(() => { if (this.isPlaying) { this.controlsHidden = true; this.cdr.markForCheck(); } }, 2500);
  }

  onPlayerMouseLeave() {
    if (this.isPlaying) {
      clearTimeout(this.controlsTimer);
      this.controlsTimer = setTimeout(() => { this.controlsHidden = true; this.cdr.markForCheck(); }, 800);
    }
  }

  private startProgressLoop() {
    this.stopProgressLoop();
    const video = this.videoPlayerRef?.nativeElement; if (!video) return;
    const tick = () => {
      if (!video.paused && !video.ended) {
        this.progress = video.duration ? (video.currentTime / video.duration) * 100 : 0;
        this.currentTimeStr = this.formatTime(video.currentTime);
        this.cdr.markForCheck();
        this.rafId = requestAnimationFrame(tick);
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopProgressLoop() { if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; } }

  private formatTime(sec: number): string {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60); const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'pi-image';
    if (mimeType === 'application/pdf') return 'pi-file-pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'pi-file-word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'pi-file-excel';
    if (mimeType.startsWith('video/')) return 'pi-video';
    if (mimeType.startsWith('audio/')) return 'pi-volume-up';
    if (mimeType.includes('zip')) return 'pi-box';
    return 'pi-file';
  }

  formatSize(size: string): string {
    const bytes = parseInt(size, 10); if (isNaN(bytes)) return size;
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} ГБ`;
  }

  goBack() { this.fileSystem.goBack(); }

  private isExternalFileDrag(event: DragEvent): boolean {
    return Array.from(event.dataTransfer?.types ?? []).includes('Files');
  }

  private isInternalFileDrag(event: DragEvent): boolean {
    return Array.from(event.dataTransfer?.types ?? []).includes(ListFiles.INTERNAL_FILE_MIME);
  }

  onDragEnter(event: DragEvent) {
    if (!this.isExternalFileDrag(event)) return;
    event.preventDefault();
    this.dragCounter++;
    this.isDragging.set(true);
  }

  onDragOver(event: DragEvent) {
    if (!this.isExternalFileDrag(event)) return;
    event.preventDefault();
  }

  onDragLeave(event: DragEvent) {
    if (!this.isExternalFileDrag(event)) return;
    this.dragCounter--;
    if (this.dragCounter === 0) this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    if (!this.isExternalFileDrag(event)) return;
    event.preventDefault();
    this.dragCounter = 0; this.isDragging.set(false);
    const items = event.dataTransfer?.items;
    const folderId = this.fileSystem.currentFolderId();
    if (!items || items.length === 0) return;
    const entries: FileSystemEntry[] = [];
    for (let i = 0; i < items.length; i++) { const entry = items[i].webkitGetAsEntry(); if (entry) entries.push(entry); }
    const hasFolder = entries.some(e => e.isDirectory);
    if (hasFolder) {
      const folderNames = entries.filter(e => e.isDirectory).map(e => `«${e.name}»`).join(', ');
      const lf = this.langService.t().pages.listFiles;
      const tb = this.langService.t().pages.toolbar;
      this.uploadConfirmTitle.set(tb.uploadFolderDialogTitle);
      this.uploadConfirmMessage.set(`${tb.uploadFolderDialogDesc}: ${folderNames}`);
      this.pendingUpload = async () => {
        try {
          const allFiles = await this.readEntriesRecursive(entries);
          await this.fileSystem.uploadFolderStructure(allFiles, folderId);
          this.messageService.add({ severity: 'secondary', summary: tb.toastDone, detail: tb.folderUploaded, life: 2000, key: 'br' });
        } catch { this.messageService.add({ severity: 'secondary', summary: tb.toastError, detail: tb.folderUploadFailed, key: 'br' }); }
      };
      this.uploadConfirmVisible.set(true);
    } else {
      const files = event.dataTransfer!.files;
      this.uploadQueue.open(files);
    }
  }

  onUploadConfirmAccept() { this.uploadConfirmVisible.set(false); if (this.pendingUpload) { this.pendingUpload(); this.pendingUpload = null; } }
  onUploadConfirmReject() { this.uploadConfirmVisible.set(false); this.pendingUpload = null; }

  private async readEntriesRecursive(entries: FileSystemEntry[], basePath = ''): Promise<File[]> {
    const result: File[] = [];
    for (const entry of entries) {
      if (entry.isFile) {
        const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
        const path = basePath ? `${basePath}/${entry.name}` : entry.name;
        const fileWithPath = new File([file], file.name, { type: file.type });
        Object.defineProperty(fileWithPath, 'webkitRelativePath', { value: path });
        result.push(fileWithPath);
      } else if (entry.isDirectory) {
        const dirPath = basePath ? `${basePath}/${entry.name}` : entry.name;
        const children = await this.readDirectoryEntries(entry as FileSystemDirectoryEntry);
        result.push(...await this.readEntriesRecursive(children, dirPath));
      }
    }
    return result;
  }

  private readDirectoryEntries(dir: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
    return new Promise((resolve, reject) => {
      const reader = dir.createReader(); const entries: FileSystemEntry[] = [];
      const readBatch = () => reader.readEntries(batch => { if (batch.length === 0) resolve(entries); else { entries.push(...batch); readBatch(); } }, reject);
      readBatch();
    });
  }

  onFileDropped(files: FileList) { this.uploadQueue.open(files); }

  onFileDragStart(event: DragEvent, file: FileItem) {
    if (!event.dataTransfer) return;

    // Если перетаскиваемый файл не входит в выделение — делаем его единственным выбранным
    let ids = this.selectedFileIds();
    if (!ids.has(file.id)) {
      ids = new Set([file.id]);
      this.selectedFileIds.set(ids);
      this.lastClickedFileId = file.id;
      this.syncSingleSelection(ids);
    }

    const idArr = Array.from(ids);
    event.dataTransfer.setData(ListFiles.INTERNAL_FILE_MIME, idArr.join(','));
    event.dataTransfer.effectAllowed = 'move';

    const ghost = this.buildDragGhost(file, idArr.length);
    document.body.appendChild(ghost);
    event.dataTransfer.setDragImage(ghost, 18, 18);
    setTimeout(() => ghost.remove(), 0);

    this.draggingFileId.set(file.id);
    this.draggingFileIds.set(new Set(ids));
  }

  private buildDragGhost(file: FileItem, count = 1): HTMLElement {
    const ghost = document.createElement('div');
    ghost.className = 'file-drag-ghost';

    if (count > 1) {
      ghost.classList.add('file-drag-ghost--multi');
      const icon = document.createElement('i');
      icon.className = 'pi pi-copy';
      const name = document.createElement('span');
      name.textContent = `${count}`;
      const badge = document.createElement('span');
      badge.className = 'file-drag-ghost-count';
      badge.textContent = `${count}`;
      ghost.append(icon, name, badge);
    } else {
      const icon = document.createElement('i');
      icon.className = 'pi ' + this.getFileIcon(file.mimeType);
      const name = document.createElement('span');
      name.textContent = decodeURIComponent(file.name);
      ghost.append(icon, name);
    }
    return ghost;
  }

  onFileDragEnd() {
    this.draggingFileId.set(null);
    this.draggingFileIds.set(new Set());
    this.draggedOverFolderId.set(null);
  }

  onFolderDragOver(event: DragEvent, folder: FolderItem) {
    if (!this.isInternalFileDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    if (this.draggedOverFolderId() !== folder.id) {
      this.draggedOverFolderId.set(folder.id);
    }
  }

  onFolderDragLeave(event: DragEvent, folder: FolderItem) {
    if (!this.isInternalFileDrag(event)) return;
    const related = event.relatedTarget as Node | null;
    const target  = event.currentTarget as HTMLElement;
    if (related && target.contains(related)) return;
    if (this.draggedOverFolderId() === folder.id) {
      this.draggedOverFolderId.set(null);
    }
  }

  onFolderDrop(event: DragEvent, folder: FolderItem) {
    if (!this.isInternalFileDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    this.draggedOverFolderId.set(null);
    this.draggingFileId.set(null);
    this.draggingFileIds.set(new Set());

    const raw = event.dataTransfer!.getData(ListFiles.INTERNAL_FILE_MIME);
    if (!raw) return;

    // Перемещаем только те файлы, что ещё не лежат в целевой папке
    const ids = raw.split(',').filter(Boolean).filter(id => {
      const file = this.fileSystem.files().find(f => f.id === id);
      return file ? file.folderId !== folder.id : false;
    });
    if (ids.length === 0) return;

    const lf = this.langService.t().pages.listFiles;
    this.clearAllSelection();
    this.fileSystem.moveFiles(ids, folder.id).subscribe({
      next: () => this.messageService.add({
        severity: 'secondary', summary: lf.toastDone,
        detail: ids.length > 1 ? lf.moveMany : lf.menuMove, life: 2000, key: 'br',
      }),
      error: () => this.messageService.add({
        severity: 'secondary', summary: lf.toastError,
        detail: lf.menuMove, life: 2000, key: 'br',
      }),
    });
  }

  selectFile(file: FileItem, event: MouseEvent) {
    const ids = new Set(this.selectedFileIds());
    const additive = event.ctrlKey || event.metaKey;
    const range = event.shiftKey;

    if (range && this.lastClickedFileId) {
      const list = this.files();
      const a = list.findIndex(f => f.id === this.lastClickedFileId);
      const b = list.findIndex(f => f.id === file.id);
      if (a !== -1 && b !== -1) {
        const [lo, hi] = a < b ? [a, b] : [b, a];
        for (let i = lo; i <= hi; i++) ids.add(list[i].id);
      } else {
        ids.add(file.id);
      }
    } else if (additive) {
      if (ids.has(file.id)) ids.delete(file.id);
      else ids.add(file.id);
      this.lastClickedFileId = file.id;
    } else {
      // Обычный клик: повторный по единственному выделенному — снять
      if (ids.size === 1 && ids.has(file.id)) {
        ids.clear();
        this.lastClickedFileId = null;
      } else {
        ids.clear();
        ids.add(file.id);
        this.lastClickedFileId = file.id;
      }
    }

    this.selectedFileIds.set(ids);
    this.syncSingleSelection(ids);
  }

  // Синхронизирует одиночное выделение сервиса (для контекстного меню/диалогов)
  private syncSingleSelection(ids: Set<string>) {
    this.fileSystem.clearSelection();
    if (ids.size === 1) {
      const only = this.files().find(f => ids.has(f.id));
      if (only) this.fileSystem.selectItem(only);
    }
  }

  private clearFileSelection() {
    if (this.selectedFileIds().size > 0) this.selectedFileIds.set(new Set());
    this.lastClickedFileId = null;
  }

  clearAllSelection() {
    this.clearFileSelection();
    this.fileSystem.clearSelection();
  }

  // ─── Групповые действия над выделением ───

  private selectedFiles(): FileItem[] {
    const ids = this.selectedFileIds();
    return this.fileSystem.files().filter(f => ids.has(f.id));
  }

  downloadSelected() {
    const files = this.selectedFiles();
    if (files.length === 0) return;
    // Браузер может ограничить пачку загрузок — разносим по времени
    files.forEach((file, i) => setTimeout(() => this.fileSystem.downloadFile(file), i * 350));
  }

  starSelected() {
    const ids = Array.from(this.selectedFileIds());
    if (ids.length === 0) return;
    const lf = this.langService.t().pages.listFiles;
    this.fileSystem.starFiles(ids).subscribe({
      next: () => this.messageService.add({ severity: 'secondary', summary: lf.toastDone, detail: lf.menuStar, life: 1600, key: 'br' }),
      error: () => this.messageService.add({ severity: 'secondary', summary: lf.toastError, detail: lf.menuStar, life: 1600, key: 'br' }),
    });
  }

  deleteSelectedFiles() {
    const ids = Array.from(this.selectedFileIds());
    if (ids.length === 0) return;
    const lf = this.langService.t().pages.listFiles;
    this.clearAllSelection();
    this.fileSystem.deleteFiles(ids).subscribe({
      next: () => this.messageService.add({ severity: 'secondary', summary: lf.toastDone, detail: lf.menuDelete, life: 1600, key: 'br' }),
      error: () => this.messageService.add({ severity: 'secondary', summary: lf.toastError, detail: lf.menuDelete, life: 1600, key: 'br' }),
    });
  }

  // ─── Выделение рамкой ───

  onBoardMouseDown(event: MouseEvent) {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (!target || target.closest(ListFiles.MARQUEE_SKIP_SELECTOR)) return;
    this.marqueeStart = { x: event.clientX, y: event.clientY };
    // Ctrl/⌘ — добавляем к текущему выделению, иначе начинаем с чистого листа
    this.marqueeBaseIds = (event.ctrlKey || event.metaKey)
      ? new Set(this.selectedFileIds())
      : new Set();
    this.marqueeMoved = false;
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent) {
    if (!this.marqueeStart) return;
    const dx = event.clientX - this.marqueeStart.x;
    const dy = event.clientY - this.marqueeStart.y;
    if (!this.marqueeMoved && Math.hypot(dx, dy) < ListFiles.MARQUEE_THRESHOLD) return;
    this.marqueeMoved = true;
    event.preventDefault();

    const left = Math.min(event.clientX, this.marqueeStart.x);
    const top = Math.min(event.clientY, this.marqueeStart.y);
    const width = Math.abs(dx);
    const height = Math.abs(dy);
    this.marqueeBox.set({ left, top, width, height });
    this.applyMarqueeSelection(left, top, left + width, top + height);
  }

  @HostListener('document:mouseup')
  onDocumentMouseUp() {
    if (this.marqueeStart && this.marqueeMoved) {
      // Подавляем клик-сброс, который придёт сразу после mouseup
      this.suppressNextClickClear = true;
    }
    this.marqueeStart = null;
    this.marqueeMoved = false;
    this.marqueeBox.set(null);
  }

  private applyMarqueeSelection(l: number, t: number, r: number, b: number) {
    const cards = (this.hostEl.nativeElement as HTMLElement)
      .querySelectorAll<HTMLElement>('.file-card[data-file-id]');
    const ids = new Set(this.marqueeBaseIds);
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const hit = !(rect.right < l || rect.left > r || rect.bottom < t || rect.top > b);
      if (hit) {
        const id = card.getAttribute('data-file-id');
        if (id) ids.add(id);
      }
    });
    this.selectedFileIds.set(ids);
    this.syncSingleSelection(ids);
  }

  selectFolder(folder: FolderItem) {
    clearTimeout(this.clickTimer);
    this.clickTimer = setTimeout(() => {
      this.clearFileSelection();
      const current = this.selectedItem();
      if (current && current.id === folder.id) this.fileSystem.selectItem(null);
      else this.fileSystem.selectItem(folder);
    }, 200);
  }

  openFolder(folder: FolderItem) { clearTimeout(this.clickTimer); this.fileSystem.openFolder(folder.id); }

  openFileMenu(file: FileItem, menu: any, event: Event) {
    event.stopPropagation();
    if (this.selectedItem()?.id !== file.id) {
      this.fileSystem.selectItem(file);
    }
    this.cdr.detectChanges();
    menu.toggle(event);
  }

  openFolderMenu(folder: FolderItem, menu: any, event: Event) {
    event.stopPropagation();
    if (this.selectedItem()?.id !== folder.id) {
      this.fileSystem.selectItem(folder);
    }
    this.cdr.detectChanges();
    menu.toggle(event);
  }

  // ─── Диалог настройки публичной ссылки ───

  shareDialogVisible = signal(false);
  shareTarget   = signal<FileItem | null>(null);
  shareExpiry   = signal<number | null>(7);   // дней; null — без срока
  sharePassword = signal('');
  shareSaving   = signal(false);

  readonly shareExpiryOptions: { value: number | null; key: 'shareNoExpiry' | 'shareDay' | 'shareWeek' | 'shareMonth' }[] = [
    { value: 7,    key: 'shareWeek' },
    { value: 1,    key: 'shareDay' },
    { value: 30,   key: 'shareMonth' },
    { value: null, key: 'shareNoExpiry' },
  ];

  openShareDialog(file: FileItem) {
    this.shareTarget.set(file);
    this.shareExpiry.set(7);
    this.sharePassword.set('');
    this.shareDialogVisible.set(true);
  }

  closeShareDialog() {
    this.shareDialogVisible.set(false);
    this.shareTarget.set(null);
    this.sharePassword.set('');
  }

  setShareExpiry(value: number | null) { this.shareExpiry.set(value); }

  onSharePasswordInput(event: Event) {
    this.sharePassword.set((event.target as HTMLInputElement).value);
  }

  async submitShare() {
    const file = this.shareTarget();
    if (!file || this.shareSaving()) return;
    const lf = this.langService.t().pages.listFiles;
    this.shareSaving.set(true);
    try {
      await this.fileSystem.setShare(file.id, {
        isShared: true,
        expiresInDays: this.shareExpiry(),
        password: this.sharePassword().trim() || null,
      });
      await this.shareService.copyShareLink(file.name);
      this.messageService.add({ severity: 'secondary', summary: lf.toastDone, detail: lf.shareCopied, life: 1600, key: 'br' });
      this.closeShareDialog();
    } catch {
      this.messageService.add({ severity: 'secondary', summary: lf.toastError, detail: lf.shareFailed, life: 1600, key: 'br' });
    } finally {
      this.shareSaving.set(false);
    }
  }

  async revokeShareFromDialog() {
    const file = this.shareTarget();
    if (!file || this.shareSaving()) return;
    const lf = this.langService.t().pages.listFiles;
    this.shareSaving.set(true);
    try {
      await this.fileSystem.setShare(file.id, { isShared: false });
      this.messageService.add({ severity: 'secondary', summary: lf.toastDone, detail: lf.shareRevoked, life: 1600, key: 'br' });
      this.closeShareDialog();
    } catch {
      this.messageService.add({ severity: 'secondary', summary: lf.toastError, detail: lf.shareFailed, life: 1600, key: 'br' });
    } finally {
      this.shareSaving.set(false);
    }
  }

  // ─── Диалог настройки публичной ссылки на папку ───

  folderShareDialogVisible = signal(false);
  folderShareTarget   = signal<FolderItem | null>(null);
  folderShareExpiry   = signal<number | null>(7);
  folderSharePassword = signal('');
  folderShareSaving   = signal(false);

  openFolderShareDialog(folder: FolderItem) {
    this.folderShareTarget.set(folder);
    this.folderShareExpiry.set(7);
    this.folderSharePassword.set('');
    this.folderShareDialogVisible.set(true);
  }

  closeFolderShareDialog() {
    this.folderShareDialogVisible.set(false);
    this.folderShareTarget.set(null);
    this.folderSharePassword.set('');
  }

  setFolderShareExpiry(value: number | null) { this.folderShareExpiry.set(value); }

  onFolderSharePasswordInput(event: Event) {
    this.folderSharePassword.set((event.target as HTMLInputElement).value);
  }

  async submitFolderShare() {
    const folder = this.folderShareTarget();
    if (!folder || this.folderShareSaving()) return;
    const lf = this.langService.t().pages.listFiles;
    this.folderShareSaving.set(true);
    try {
      const res = await this.fileSystem.setFolderShare(folder.id, {
        isShared: true,
        expiresInDays: this.folderShareExpiry(),
        password: this.folderSharePassword().trim() || null,
      });
      if (res.slug) await this.shareService.copyFolderShareLink(res.slug);
      this.messageService.add({ severity: 'secondary', summary: lf.toastDone, detail: lf.shareCopied, life: 1600, key: 'br' });
      this.closeFolderShareDialog();
    } catch {
      this.messageService.add({ severity: 'secondary', summary: lf.toastError, detail: lf.shareFailed, life: 1600, key: 'br' });
    } finally {
      this.folderShareSaving.set(false);
    }
  }

  async revokeFolderShareFromDialog() {
    const folder = this.folderShareTarget();
    if (!folder || this.folderShareSaving()) return;
    const lf = this.langService.t().pages.listFiles;
    this.folderShareSaving.set(true);
    try {
      await this.fileSystem.setFolderShare(folder.id, { isShared: false });
      this.messageService.add({ severity: 'secondary', summary: lf.toastDone, detail: lf.shareRevoked, life: 1600, key: 'br' });
      this.closeFolderShareDialog();
    } catch {
      this.messageService.add({ severity: 'secondary', summary: lf.toastError, detail: lf.shareFailed, life: 1600, key: 'br' });
    } finally {
      this.folderShareSaving.set(false);
    }
  }

  // ─── Доступ к папке для пользователей ───

  folderAccessVisible = signal(false);
  folderAccessTarget  = signal<FolderItem | null>(null);
  folderMembers       = signal<FolderMember[]>([]);
  folderMembersLoading = signal(false);
  faInviteEmail = signal('');
  faInviteRole  = signal<'VIEWER' | 'EDITOR'>('EDITOR');
  faInviting    = signal(false);

  openFolderAccessDialog(folder: FolderItem) {
    this.folderAccessTarget.set(folder);
    this.folderMembers.set([]);
    this.faInviteEmail.set('');
    this.faInviteRole.set('EDITOR');
    this.folderAccessVisible.set(true);
    this.loadFolderMembers(folder.id);
  }

  private loadFolderMembers(folderId: string) {
    this.folderMembersLoading.set(true);
    this.fileSystem.listFolderMembers(folderId).subscribe({
      next: (m) => { this.folderMembers.set(m); this.folderMembersLoading.set(false); this.cdr.markForCheck(); },
      error: () => { this.folderMembersLoading.set(false); },
    });
  }

  faInvite() {
    const folder = this.folderAccessTarget();
    const email = this.faInviteEmail().trim();
    if (!folder || !email || this.faInviting()) return;
    this.faInviting.set(true);
    this.fileSystem.inviteFolderMember(folder.id, email, this.faInviteRole()).subscribe({
      next: () => {
        this.faInviting.set(false);
        this.faInviteEmail.set('');
        this.messageService.add({ severity: 'secondary', summary: this.tp().toastDone, detail: this.tp().memberAdded, key: 'br', life: 1600 });
        this.loadFolderMembers(folder.id);
      },
      error: (err) => {
        this.faInviting.set(false);
        this.messageService.add({ severity: 'secondary', summary: this.tp().toastError, detail: err?.message ?? this.tp().inviteFailed, key: 'br', life: 1600 });
      },
    });
  }

  faChangeRole(member: FolderMember, role: 'VIEWER' | 'EDITOR') {
    const folder = this.folderAccessTarget();
    if (!folder || member.isOwner || member.role === role) return;
    this.fileSystem.updateFolderMemberRole(folder.id, member.userId, role).subscribe({
      next: () => this.loadFolderMembers(folder.id),
      error: () => {},
    });
  }

  faRemove(member: FolderMember) {
    const folder = this.folderAccessTarget();
    if (!folder || member.isOwner) return;
    this.fileSystem.removeFolderMember(folder.id, member.userId).subscribe({
      next: () => { this.messageService.add({ severity: 'secondary', summary: this.tp().toastDone, detail: this.tp().memberRemoved, key: 'br', life: 1600 }); this.loadFolderMembers(folder.id); },
      error: () => {},
    });
  }

  deleteSelected() {
    const item = this.selectedItem(); if (!item) return;
    const isFile = 'downloadUrl' in item && 'mimeType' in item;
    const type: 'file' | 'folder' = isFile ? 'file' : 'folder';
    const lf = this.langService.t().pages.listFiles;
    this.fileSystem.deleteItem(item.id, type).subscribe({
      next: () => this.messageService.add({ severity: 'secondary', summary: lf.toastDone, detail: lf.menuDelete, key: 'br' }),
      error: () => this.messageService.add({ severity: 'secondary', summary: lf.toastError, detail: lf.menuDelete, key: 'br' }),
    });
  }
}