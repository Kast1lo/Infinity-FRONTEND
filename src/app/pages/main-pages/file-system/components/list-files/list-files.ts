import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  OnInit,
  signal,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
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
import { ShareService } from '../../../../../services/share';

export interface ZipEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  depth: number;
  expanded?: boolean;
  children?: ZipEntry[];
}

@Component({
  selector: 'app-list-files',
  imports: [
    ScrollPanelModule,
    TableModule,
    ToastModule,
    ButtonModule,
    MenuModule,
    CardModule,
    ProgressSpinner,
    TieredMenuModule,
    DecodeURIComponentPipe,
    BreadcrumbModule,
    RippleModule,
    ImageModule,
    DialogModule,
  ],
  templateUrl: './list-files.html',
  styleUrl: './list-files.scss',
  providers: [MessageService, TieredMenuModule, RippleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListFiles implements OnInit {
  @ViewChild('videoPlayer') videoPlayerRef?: ElementRef<HTMLVideoElement>;

  protected readonly messageService = inject(MessageService);
  protected readonly fileSystem = inject(FileSystem);
  protected readonly shareService = inject(ShareService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);

  files = this.fileSystem.files;
  folders = this.fileSystem.folders;
  selectedItem = this.fileSystem.selectedItem;
  loading = this.fileSystem.loading;
  error = this.fileSystem.error;

  // ─── Видео плеер ───
  videoDialogVisible = false;
  videoUrl: string | null = null;
  videoTitle = '';

  // ─── Превью изображений ───
  imagePreviewVisible = false;
  imagePreviewUrl: string | null = null;
  imagePreviewTitle = '';

  // ─── Просмотрщик документов ───
  docDialogVisible = false;
  docTitle = '';
  docLoading = false;
  docHtml = signal<string>('');
  docType: 'word' | 'excel' | 'ppt' | 'pdf' | null = null;

  // ─── PDF ───
  pdfDialogVisible = false;
  pdfTitle = '';
  pdfLoading = false;
  pdfPages = signal<string[]>([]);

  // ─── ZIP ───
  zipDialogVisible = false;
  zipTitle = '';
  zipLoading = false;
  zipEntries = signal<ZipEntry[]>([]);
  private zipRef: any = null;

  // ─── Плеер ───
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

    const common = [
      {
        label: 'удалить',
        icon: PrimeIcons.TRASH,
        command: () => this.deleteSelected(),
      },
    ];

    if ('downloadUrl' in selected) {
      const menuItems: MenuItem[] = [
        {
          label: 'скачать',
          icon: PrimeIcons.DOWNLOAD,
          command: () => this.fileSystem.downloadFile(selected),
        },
        ...common,
        {
          label: 'переслать',
          icon: PrimeIcons.SEND,
          command: () => this.shareFile(),
        },
      ];

      if (this.isVideo(selected as FileItem)) {
        menuItems.unshift({
          label: 'смотреть',
          icon: PrimeIcons.PLAY,
          command: () => this.openVideo(selected as FileItem),
        });
      }

      if (this.isPdf(selected as FileItem)) {
        menuItems.unshift({
          label: 'открыть',
          icon: PrimeIcons.EYE,
          command: () => this.openPdf(selected as FileItem),
        });
      } else if (this.isZip(selected as FileItem)) {
        menuItems.unshift({
          label: 'открыть',
          icon: PrimeIcons.EYE,
          command: () => this.openZip(selected as FileItem),
        });
      } else if (this.isDocument(selected as FileItem)) {
        menuItems.unshift({
          label: 'открыть',
          icon: PrimeIcons.EYE,
          command: () => this.openDocument(selected as FileItem),
        });
      }

      return menuItems;
    } else {
      return [
        {
          label: 'скачать',
          icon: PrimeIcons.DOWNLOAD,
          command: () =>
            this.fileSystem.downloadFolder(selected.id, selected.name),
        },
        ...common,
      ];
    }
  });

  ngOnInit() {
    this.fileSystem.loadTree();
    this.fileSystem.loadFiles(null);
  }

  isImage(file: FileItem): boolean {
    return file.mimeType.startsWith('image/');
  }

  isVideo(file: FileItem): boolean {
    return file.mimeType.startsWith('video/');
  }

  isPdf(file: FileItem): boolean {
    return file.mimeType === 'application/pdf';
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

  // ─── Превью изображений ───
  openImagePreview(file: FileItem) {
    this.imagePreviewUrl = file.downloadUrl;
    this.imagePreviewTitle = decodeURIComponent(file.name);
    this.imagePreviewVisible = true;
  }

  closeImagePreview() {
    this.imagePreviewVisible = false;
    this.imagePreviewUrl = null;
    this.imagePreviewTitle = '';
  }

  // ─── PDF ───
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
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        pages.push(canvas.toDataURL('image/png'));
        this.pdfPages.set([...pages]);
        this.cdr.detectChanges();
      }
    } catch (e) {
      console.error('Ошибка загрузки PDF:', e);
      this.pdfPages.set([]);
    }

    this.pdfLoading = false;
    this.cdr.detectChanges();
  }

  closePdf() {
    this.pdfDialogVisible = false;
    this.pdfPages.set([]);
    this.pdfTitle = '';
    this.pdfLoading = false;
  }

  // ─── ZIP ───
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
        const parts = relativePath.split('/').filter(p => p.length > 0);
        const depth = parts.length - 1;
        const isDir = zipEntry.dir;
        const size = zipEntry._data?.uncompressedSize ?? 0;

        entries.push({
          name: parts[parts.length - 1] || relativePath,
          path: relativePath,
          isDir,
          size,
          depth,
          expanded: depth === 0,
        });
      });

      // Сортируем: папки вверху, потом файлы, по алфавиту
      entries.sort((a, b) => {
        if (a.depth !== b.depth) return a.depth - b.depth;
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.path.localeCompare(b.path);
      });

      this.zipEntries.set(entries);
    } catch (e) {
      console.error('Ошибка загрузки ZIP:', e);
      this.zipEntries.set([]);
    }

    this.zipLoading = false;
    this.cdr.detectChanges();
  }

  closeZip() {
    this.zipDialogVisible = false;
    this.zipEntries.set([]);
    this.zipTitle = '';
    this.zipLoading = false;
    this.zipRef = null;
  }

  async downloadZipEntry(entry: ZipEntry) {
    if (!this.zipRef || entry.isDir) return;
    try {
      const zipFile = this.zipRef.file(entry.path);
      if (!zipFile) return;
      const blob = await zipFile.async('blob');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = entry.name;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Ошибка извлечения файла:', e);
    }
  }

  getZipIcon(entry: ZipEntry): string {
    if (entry.isDir) return 'pi-folder';
    const name = entry.name.toLowerCase();
    if (/\.(jpg|jpeg|png|gif|webp|svg)$/.test(name)) return 'pi-image';
    if (/\.(mp4|mov|avi|mkv|webm)$/.test(name)) return 'pi-video';
    if (/\.(pdf)$/.test(name)) return 'pi-file-pdf';
    if (/\.(doc|docx)$/.test(name)) return 'pi-file-word';
    if (/\.(xls|xlsx)$/.test(name)) return 'pi-file-excel';
    if (/\.(zip|rar|7z|tar|gz)$/.test(name)) return 'pi-box';
    return 'pi-file';
  }

  formatZipSize(bytes: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  }

  // ─── Документы ───
  async openDocument(file: FileItem) {
    this.docTitle = decodeURIComponent(file.name);
    this.docType = this.getDocType(file.mimeType);
    this.docHtml.set('');
    this.docLoading = true;
    this.docDialogVisible = true;
    this.cdr.detectChanges();

    try {
      const arrayBuffer = await this.fileSystem.fetchFileAsArrayBuffer(file.id);

      if (this.docType === 'word') {
        const mammoth = (window as any).mammoth;
        if (!mammoth) throw new Error('mammoth not loaded');
        const result = await mammoth.convertToHtml({ arrayBuffer });
        this.docHtml.set(result.value);

      } else if (this.docType === 'excel') {
        const XLSX = (window as any).XLSX;
        if (!XLSX) throw new Error('XLSX not loaded');
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        let html = '';
        wb.SheetNames.forEach((name: string) => {
          const ws = wb.Sheets[name];
          html += `<div class="sheet-tab">${name}</div>`;
          html += XLSX.utils.sheet_to_html(ws, { editable: false });
        });
        this.docHtml.set(html);

      } else if (this.docType === 'ppt') {
        this.docHtml.set('<div class="doc-ppt-msg"><i class="pi pi-info-circle"></i><p>Предпросмотр PowerPoint ограничен.<br>Скачайте файл для полного просмотра.</p></div>');
      }

    } catch (e) {
      console.error('Ошибка загрузки документа:', e);
      this.docHtml.set('<div class="doc-error"><i class="pi pi-exclamation-circle"></i><p>Не удалось загрузить документ</p></div>');
    }

    this.docLoading = false;
    this.cdr.detectChanges();
  }

  closeDocument() {
    this.docDialogVisible = false;
    this.docHtml.set('');
    this.docTitle = '';
    this.docType = null;
    this.docLoading = false;
  }

  getSafeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  // ─── Видео ───
  openVideo(file: FileItem) {
    this.videoUrl = file.downloadUrl;
    this.videoTitle = decodeURIComponent(file.name);
    this.videoDialogVisible = true;
  }

  closeVideo() {
    const video = this.videoPlayerRef?.nativeElement;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    this.isPlaying = false;
    this.progress = 0;
    this.currentTimeStr = '0:00';
    this.durationStr = '0:00';
    this.videoUrl = null;
    this.videoTitle = '';
    this.videoDialogVisible = false;
    clearTimeout(this.controlsTimer);
    this.stopProgressLoop();
  }

  togglePlay() {
    const video = this.videoPlayerRef?.nativeElement;
    if (!video) return;
    if (video.paused) {
      video.play();
      this.isPlaying = true;
      this.startProgressLoop();
    } else {
      video.pause();
      this.isPlaying = false;
      this.stopProgressLoop();
    }
  }

  toggleMute() {
    const video = this.videoPlayerRef?.nativeElement;
    if (!video) return;
    video.muted = !video.muted;
    this.isMuted = video.muted;
  }

  onVolumeChange(event: Event) {
    const video = this.videoPlayerRef?.nativeElement;
    if (!video) return;
    const val = parseFloat((event.target as HTMLInputElement).value);
    video.volume = val;
    this.volume = val;
    this.isMuted = val === 0;
  }

  onTimeUpdate() {
    const video = this.videoPlayerRef?.nativeElement;
    if (!video) return;
    this.progress = video.duration ? (video.currentTime / video.duration) * 100 : 0;
    this.currentTimeStr = this.formatTime(video.currentTime);
  }

  onMetaLoaded() {
    const video = this.videoPlayerRef?.nativeElement;
    if (!video) return;
    this.durationStr = this.formatTime(video.duration);
    video.play();
    this.isPlaying = true;
    this.startProgressLoop();
  }

  onEnded() {
    this.isPlaying = false;
    this.progress = 0;
    this.stopProgressLoop();
  }

  seek(event: MouseEvent) {
    const video = this.videoPlayerRef?.nativeElement;
    const bar = event.currentTarget as HTMLElement;
    if (!video || !bar) return;
    const rect = bar.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    video.currentTime = ratio * video.duration;
  }

  toggleFullscreen() {
    const video = this.videoPlayerRef?.nativeElement;
    if (!video) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
  }

  onPlayerMouseMove() {
    this.controlsHidden = false;
    clearTimeout(this.controlsTimer);
    this.controlsTimer = setTimeout(() => {
      if (this.isPlaying) this.controlsHidden = true;
    }, 2500);
  }

  onPlayerMouseLeave() {
    if (this.isPlaying) {
      clearTimeout(this.controlsTimer);
      this.controlsTimer = setTimeout(() => { this.controlsHidden = true; }, 800);
    }
  }

  private startProgressLoop() {
    this.stopProgressLoop();
    const video = this.videoPlayerRef?.nativeElement;
    if (!video) return;
    const tick = () => {
      if (!video.paused && !video.ended) {
        this.progress = video.duration ? (video.currentTime / video.duration) * 100 : 0;
        this.currentTimeStr = this.formatTime(video.currentTime);
        this.rafId = requestAnimationFrame(tick);
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopProgressLoop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private formatTime(sec: number): string {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'pi-image';
    if (mimeType === 'application/pdf') return 'pi-file-pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'pi-file-word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'pi-file-excel';
    if (mimeType.startsWith('video/')) return 'pi-video';
    if (mimeType.includes('zip')) return 'pi-box';
    return 'pi-file';
  }

  formatSize(size: string): string {
    const bytes = parseInt(size, 10);
    if (isNaN(bytes)) return size;
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} ГБ`;
  }

  goBack() {
    this.fileSystem.goBack();
  }

  onDragEnter(event: DragEvent) {
    event.preventDefault();
    this.dragCounter++;
    this.isDragging.set(true);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDragLeave(event: DragEvent) {
    this.dragCounter--;
    if (this.dragCounter === 0) {
      this.isDragging.set(false);
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragCounter = 0;
    this.isDragging.set(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const folderId = this.fileSystem.currentFolderId();
      this.fileSystem.uploadFiles(files, folderId);
      this.messageService.add({
        severity: 'secondary',
        summary: 'Загрузка',
        detail: `${files.length} файл(ов) отправлено`,
        life: 2000,
        key: 'br',
      });
    }
  }

  onFileDropped(files: FileList) {
    this.fileSystem.uploadFiles(files);
  }

  selectFile(file: FileItem) {
    this.fileSystem.selectItem(file);
  }

  selectFolder(folder: FolderItem) {
    clearTimeout(this.clickTimer);
    this.clickTimer = setTimeout(() => {
      const current = this.selectedItem();
      if (current && current.id === folder.id) {
        this.fileSystem.selectItem(null);
      } else {
        this.fileSystem.selectItem(folder);
      }
    }, 200);
  }

  openFolder(folder: FolderItem) {
    clearTimeout(this.clickTimer);
    this.fileSystem.openFolder(folder.id);
  }

  shareFile() {
    const item = this.selectedItem();
    if (!item || !('name' in item)) {
      this.messageService.add({
        severity: 'secondary',
        summary: 'Внимание',
        detail: 'Выберите файл для пересылки',
        life: 1000,
        key: 'br',
      });
      return;
    }
    try {
      this.shareService.copyShareLink(item.name);
      this.messageService.add({
        severity: 'secondary',
        summary: 'Успешно',
        detail: `Ссылка на "${item.name}" скопирована`,
        life: 1000,
        key: 'br',
      });
    } catch (error) {
      this.messageService.add({
        severity: 'secondary',
        summary: 'Ошибка',
        detail: 'Не удалось скопировать ссылку',
        life: 1000,
        key: 'br',
      });
    }
  }

  deleteSelected() {
    const item = this.selectedItem();
    if (!item) return;
    const isFile = 'downloadUrl' in item && 'mimeType' in item;
    const type: 'file' | 'folder' = isFile ? 'file' : 'folder';
    this.fileSystem.deleteItem(item.id, type);
    this.messageService.add({
      severity: 'secondary',
      summary: 'Готово',
      detail: `${isFile ? 'Файл' : 'Папка'} удалён(а)`,
      key: 'br',
    });
  }

  downloadSelected() {
    const item = this.selectedItem();
    if (!item || !('downloadUrl' in item)) return;
  }
}