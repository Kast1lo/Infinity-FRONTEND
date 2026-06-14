import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FileSystem } from '../../../services/file-system';
import { ShareService } from '../../../services/share';
import { LangService } from '../../../services/lang';
import { SharedFileItem, SharedFolderItem } from '../../../interfaces/file-system-interfeces/shared-file.model';
import { ProgressSpinner } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DecodeURIComponentPipe } from '../../../pipes/decode-uri.pipe';

@Component({
  selector: 'app-shared',
  imports: [ProgressSpinner, ToastModule, DatePipe, DecodeURIComponentPipe],
  templateUrl: './shared.html',
  styleUrl: './shared.scss',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shared implements OnInit {
  private readonly fileSystem = inject(FileSystem);
  private readonly shareService = inject(ShareService);
  private readonly messageService = inject(MessageService);
  protected readonly langService = inject(LangService);

  t = computed(() => this.langService.t().pages.shared);

  files   = this.fileSystem.sharedFiles;
  folders = this.fileSystem.sharedFolders;
  loading = this.fileSystem.sharedLoading;
  isEmpty = computed(() => this.files().length === 0 && this.folders().length === 0);

  ngOnInit() {
    this.fileSystem.loadSharedFiles();
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

  async copy(file: SharedFileItem) {
    try {
      await this.shareService.copyShareLink(file.name);
      this.toast(this.t().copied);
    } catch {
      this.toast(this.t().toastError);
    }
  }

  revoke(file: SharedFileItem) {
    this.fileSystem.revokeShare(file.id).subscribe({
      next: () => this.toast(this.t().revoked),
      error: () => this.toast(this.t().toastError),
    });
  }

  async copyFolder(folder: SharedFolderItem) {
    if (!folder.slug) { this.toast(this.t().toastError); return; }
    try {
      await this.shareService.copyFolderShareLink(folder.slug);
      this.toast(this.t().copied);
    } catch {
      this.toast(this.t().toastError);
    }
  }

  revokeFolder(folder: SharedFolderItem) {
    this.fileSystem.revokeFolderShare(folder.id).subscribe({
      next: () => this.toast(this.t().revoked),
      error: () => this.toast(this.t().toastError),
    });
  }

  private toast(detail: string) {
    this.messageService.add({ severity: 'secondary', summary: detail, key: 'br', life: 1800 });
  }
}
