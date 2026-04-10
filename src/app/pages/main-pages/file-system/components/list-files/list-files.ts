import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
  ViewChild,
  ElementRef,
} from '@angular/core';
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

  files = this.fileSystem.files;
  folders = this.fileSystem.folders;
  selectedItem = this.fileSystem.selectedItem;
  loading = this.fileSystem.loading;
  error = this.fileSystem.error;

  // ─── Видео плеер ───
  videoDialogVisible = false;
  videoUrl: string | null = null;
  videoTitle = '';

  // состояние плеера
  isPlaying = false;
  isMuted = false;
  volume = 1;
  progress = 0;
  currentTimeStr = '0:00';
  durationStr = '0:00';
  controlsHidden = false;
  private controlsTimer: any;

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

      // Добавляем "смотреть" для видео
      if (this.isVideo(selected as FileItem)) {
        menuItems.unshift({
          label: 'смотреть',
          icon: PrimeIcons.PLAY,
          command: () => this.openVideo(selected as FileItem),
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
  }

  togglePlay() {
    const video = this.videoPlayerRef?.nativeElement;
    if (!video) return;
    if (video.paused) {
      video.play();
      this.isPlaying = true;
    } else {
      video.pause();
      this.isPlaying = false;
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
  }

  onEnded() {
    this.isPlaying = false;
    this.progress = 0;
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

  onFileDropped(files: FileList) {
    this.fileSystem.uploadFiles(files);
  }

  selectFile(file: FileItem) {
    this.fileSystem.selectItem(file);
  }

  openFolder(folder: FolderItem) {
    this.fileSystem.openFolder(folder.id);
  }

  selectFolder(folder: FolderItem) {
    const current = this.selectedItem();
    if (current && current.id === folder.id) {
      this.fileSystem.selectItem(null);
    } else {
      this.fileSystem.selectItem(folder);
    }
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