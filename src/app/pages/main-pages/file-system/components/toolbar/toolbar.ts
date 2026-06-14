import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SplitButtonModule } from 'primeng/splitbutton';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { FileSystem, FileFilter, SortKey } from '../../../../../services/file-system';
import { FileUploadModule } from 'primeng/fileupload';
import { MenuModule } from 'primeng/menu';
import { ToastModule } from 'primeng/toast';
import { MenuItem, PrimeIcons, MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { FileItem } from '../../../../../interfaces/file-system-interfeces/file-item.model';
import { MessageModule } from 'primeng/message';
import { ShareService } from '../../../../../services/share';
import { TooltipModule } from 'primeng/tooltip';
import { UploadQueueService } from '../../../../../services/upload-queue';
import { LangService } from '../../../../../services/lang';

@Component({
  selector: 'app-toolbar',
  imports: [
    ToolbarModule, ButtonModule, IconFieldModule, InputIconModule,
    SplitButtonModule, InputTextModule, FileUploadModule,
    ToastModule, DialogModule, FormsModule, MessageModule, TooltipModule, MenuModule,
  ],
  templateUrl: './toolbar.html',
  styleUrl: './toolbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
})
export class Toolbar implements OnInit {
  @ViewChild('folderInput') folderInputRef!: ElementRef<HTMLInputElement>;

  protected readonly messageService = inject(MessageService);
  protected readonly fileSystem     = inject(FileSystem);
  protected readonly shareService   = inject(ShareService);
  protected readonly uploadQueue    = inject(UploadQueueService);
  protected readonly langService    = inject(LangService);

  t = computed(() => this.langService.t().pages.toolbar);

  visible         = signal(false);
  folderName      = signal<string>('');
  folderUploading        = signal(false);
  folderConfirmVisible   = signal(false);
  private pendingFolderInput: HTMLInputElement | null = null;

  readonly isFolderNameValid = computed(() => this.folderName().trim().length > 0);

  readonly currentFolderName = computed(() => {
    const items = this.fileSystem.breadcrumbItems();
    return items.length > 0 ? items[items.length - 1].label : this.langService.t().pages.toolbar.rootFolder;
  });

  files        = this.fileSystem.files;
  folder       = this.fileSystem.folders;
  selectedItem = this.fileSystem.selectedItem;
  loading      = this.fileSystem.loading;
  error        = this.fileSystem.error;

  searchQuery  = this.fileSystem.searchQuery;
  activeFilter = this.fileSystem.activeFilter;
  sortKey      = this.fileSystem.sortKey;
  sortDir      = this.fileSystem.sortDir;

  filters = computed(() => this.langService.t().pages.toolbar.filters as unknown as { label: string; value: FileFilter; icon: string }[]);

  private readonly sortOptions: { key: SortKey; icon: string; labelKey: 'sortName' | 'sortDate' | 'sortSize' | 'sortType' }[] = [
    { key: 'name', icon: 'pi pi-sort-alpha-down', labelKey: 'sortName' },
    { key: 'date', icon: 'pi pi-calendar',        labelKey: 'sortDate' },
    { key: 'size', icon: 'pi pi-database',         labelKey: 'sortSize' },
    { key: 'type', icon: 'pi pi-tag',              labelKey: 'sortType' },
  ];

  sortMenuItems = computed<MenuItem[]>(() => {
    const t = this.langService.t().pages.toolbar;
    const active = this.sortKey();
    return this.sortOptions.map(o => ({
      label: t[o.labelKey],
      icon: active === o.key ? 'pi pi-check' : o.icon,
      command: () => this.fileSystem.setSortKey(o.key),
    }));
  });

  sortLabel = computed(() => {
    const t = this.langService.t().pages.toolbar;
    const opt = this.sortOptions.find(o => o.key === this.sortKey());
    return opt ? t[opt.labelKey] : t.sortName;
  });

  toggleSortDir() { this.fileSystem.toggleSortDir(); }

  items: MenuItem[] | undefined;

  ngOnInit() {
    this.items = [
      {
        label: this.langService.t().pages.toolbar.downloadTooltip,
        icon: PrimeIcons.DOWNLOAD,
        command: () => {
          const item = this.selectedItem();
          if (item && 'downloadUrl' in item) this.fileSystem.downloadFile(item);
        },
      },
    ];
  }

  setFilter(filter: FileFilter) {
    this.fileSystem.activeFilter.set(filter);
  }

  clearSearch() {
    this.fileSystem.searchQuery.set('');
  }

  onSearchInput(event: Event) {
    this.fileSystem.searchQuery.set((event.target as HTMLInputElement).value);
  }

  onFilesSelected(event: any) {
    const files: File[] = event.files;
    if (!files || files.length === 0) return;
    this.uploadQueue.open(files);
  }

  confirmUpload() {
    const result = this.uploadQueue.confirm(this.fileSystem.currentFolderId());
    if (!result) return;
    const t = this.langService.t().pages.toolbar;
    this.messageService.add({
      severity: 'secondary',
      summary: t.toastUploadTitle,
      detail: `${t.uploadingFilesMsg} ${result.count} ${this.uploadQueue.pluralFile(result.count)}...`,
      life: 2500,
      key: 'br',
    });
  }

  triggerFolderUpload() {
    this.folderConfirmVisible.set(true);
  }

  onFolderConfirmAccept() {
    this.folderConfirmVisible.set(false);
    this.folderInputRef.nativeElement.value = '';
    this.folderInputRef.nativeElement.click();
  }

  onFolderConfirmReject() {
    this.folderConfirmVisible.set(false);
  }

  async onFolderSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const rootFolderId = this.fileSystem.currentFolderId();

    const t = this.langService.t().pages.toolbar;
    this.folderUploading.set(true);
    this.messageService.add({
      severity: 'secondary',
      summary: t.toastUploadTitle,
      detail: `${t.uploadingFolderMsg} (${fileArray.length} ${t.filesWord})...`,
      life: 4000,
      key: 'br',
    });

    try {
      await this.fileSystem.uploadFolderStructure(fileArray, rootFolderId);
      this.messageService.add({
        severity: 'secondary',
        summary: t.toastDone,
        detail: t.folderUploaded,
        life: 2000,
        key: 'br',
      });
    } catch {
      this.messageService.add({
        severity: 'secondary',
        summary: t.toastError,
        detail: t.folderUploadFailed,
        key: 'br',
      });
    } finally {
      this.folderUploading.set(false);
    }
  }


  downloadSelected() {
    const item = this.selectedItem();
    if (!item) return;
    if ('downloadUrl' in item) {
      this.fileSystem.downloadFile(item as FileItem);
    } else {
      this.fileSystem.downloadFolder(item.id, item.name);
    }
  }

  deleteSelected() {
    const item = this.selectedItem();
    if (!item) return;
    const isFile = 'downloadUrl' in item && 'mimeType' in item;
    const type: 'file' | 'folder' = isFile ? 'file' : 'folder';
    const t = this.langService.t().pages.toolbar;
    this.fileSystem.deleteItem(item.id, type).subscribe({
      next: () => this.messageService.add({ severity: 'secondary', summary: t.toastDone, detail: isFile ? t.fileDeleted : t.folderDeleted, key: 'br' }),
      error: () => this.messageService.add({ severity: 'secondary', summary: t.toastError, detail: t.deleteFailed, key: 'br' }),
    });
  }

  async shareSelected() {
    const item = this.selectedItem();
    const t = this.langService.t().pages.toolbar;
    if (!item || !('name' in item)) {
      this.messageService.add({
        severity: 'secondary', summary: t.shareWarningTitle,
        detail: t.shareSelectFile, life: 1500, key: 'br',
      });
      return;
    }
    try {
      await this.fileSystem.publishShare(item.id);
      await this.shareService.copyShareLink(item.name);
      this.messageService.add({
        severity: 'secondary', summary: t.shareSuccessTitle,
        detail: `${t.shareCopied} "${item.name}" ${t.shareLinkSuffix}`, life: 1500, key: 'br',
      });
    } catch {
      this.messageService.add({
        severity: 'secondary', summary: t.toastError,
        detail: t.shareFailed, key: 'br',
      });
    }
  }


  openDialog() {
    this.folderName.set('');
    this.visible.set(true);
  }

  closeDialog() {
    this.folderName.set('');
    this.visible.set(false);
  }

  createFolder() {
    const name = this.folderName().trim();
    if (!name) return;
    this.fileSystem.createFolder(name, this.fileSystem.currentFolderId());
    this.visible.set(false);
    this.folderName.set('');
  }
}