import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SideBar } from '../../../common-ui/side-bar/side-bar';
import { FileSystem } from '../../../services/file-system';
import { LangService } from '../../../services/lang';
import { FileItem } from '../../../interfaces/file-system-interfeces/file-item.model';
import { FolderItem } from '../../../interfaces/file-system-interfeces/folder-item.model';
import { ProgressSpinner } from 'primeng/progressspinner';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DecodeURIComponentPipe } from '../../../pipes/decode-uri.pipe';

type ConfirmAction =
  | { kind: 'delete'; id: string; type: 'file' | 'folder'; name: string }
  | { kind: 'empty' };

@Component({
  selector: 'app-trash',
  imports: [SideBar, ProgressSpinner, DialogModule, ToastModule, DatePipe, DecodeURIComponentPipe],
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

  files   = this.fileSystem.trashFiles;
  folders = this.fileSystem.trashFolders;
  loading = this.fileSystem.trashLoading;
  isEmpty = computed(() => this.files().length === 0 && this.folders().length === 0);

  confirmVisible = signal(false);
  private confirmAction: ConfirmAction | null = null;

  ngOnInit() {
    this.fileSystem.loadTrash();
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

  restore(id: string, type: 'file' | 'folder') {
    this.fileSystem.restoreItem(id, type).subscribe({
      next: () => this.toast(this.t().toastRestored),
      error: () => this.toast(this.t().toastError),
    });
  }

  askDelete(item: FileItem | FolderItem, type: 'file' | 'folder') {
    this.confirmAction = { kind: 'delete', id: item.id, type, name: item.name };
    this.confirmVisible.set(true);
  }

  askEmpty() {
    this.confirmAction = { kind: 'empty' };
    this.confirmVisible.set(true);
  }

  confirmTitle = computed(() =>
    this.confirmAction?.kind === 'empty' ? this.t().confirmEmptyTitle : this.t().confirmDeleteTitle,
  );
  confirmMessage = computed(() =>
    this.confirmAction?.kind === 'empty' ? this.t().confirmEmptyMsg : this.t().confirmDeleteMsg,
  );

  confirmYes() {
    const action = this.confirmAction;
    if (!action) return;
    if (action.kind === 'empty') {
      this.fileSystem.emptyTrash().subscribe({
        next: () => this.toast(this.t().toastEmptied),
        error: () => this.toast(this.t().toastError),
      });
    } else {
      this.fileSystem.permanentDelete(action.id, action.type).subscribe({
        next: () => this.toast(this.t().toastDeleted),
        error: () => this.toast(this.t().toastError),
      });
    }
    this.closeConfirm();
  }

  closeConfirm() {
    this.confirmVisible.set(false);
    this.confirmAction = null;
  }

  private toast(detail: string) {
    this.messageService.add({ severity: 'secondary', summary: detail, key: 'br', life: 1800 });
  }
}
