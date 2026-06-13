import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FileSystem } from '../../../services/file-system';
import { LangService } from '../../../services/lang';
import { FileItem } from '../../../interfaces/file-system-interfeces/file-item.model';
import { FolderItem } from '../../../interfaces/file-system-interfeces/folder-item.model';
import { ProgressSpinner } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DecodeURIComponentPipe } from '../../../pipes/decode-uri.pipe';

@Component({
  selector: 'app-starred',
  imports: [ProgressSpinner, ToastModule, DecodeURIComponentPipe],
  templateUrl: './starred.html',
  styleUrl: './starred.scss',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Starred implements OnInit {
  private readonly fileSystem = inject(FileSystem);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  protected readonly langService = inject(LangService);

  t = computed(() => this.langService.t().pages.starred);

  files   = this.fileSystem.starredFiles;
  folders = this.fileSystem.starredFolders;
  loading = this.fileSystem.starredLoading;
  isEmpty = computed(() => this.files().length === 0 && this.folders().length === 0);

  ngOnInit() {
    this.fileSystem.loadStarred();
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

  download(file: FileItem) {
    this.fileSystem.downloadFile(file);
  }

  unstar(item: FileItem | FolderItem, type: 'file' | 'folder') {
    this.fileSystem.toggleStar(item.id, type).subscribe({
      next: () => this.toast(this.t().toastUnstarred),
      error: () => this.toast(this.t().toastError),
    });
  }

  private toast(detail: string) {
    this.messageService.add({ severity: 'secondary', summary: detail, key: 'br', life: 1800 });
  }
}
