import { ChangeDetectionStrategy, Component, inject, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SplitButtonModule } from 'primeng/splitbutton';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { FileSystem, FileFilter } from '../../../../../services/file-system';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { MenuItem, PrimeIcons, MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { FileItem } from '../../../../../interfaces/file-system-interfeces/file-item.model';
import { MessageModule } from 'primeng/message';
import { ShareService } from '../../../../../services/share';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-toolbar',
  imports: [
    ToolbarModule, ButtonModule, IconFieldModule, InputIconModule,
    SplitButtonModule, InputTextModule, FileUploadModule,
    ToastModule, DialogModule, FormsModule, MessageModule, TooltipModule,
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

  visible         = signal(false);
  folderName      = signal<string>('');
  folderUploading = signal(false);

  files        = this.fileSystem.files;
  folder       = this.fileSystem.folders;
  selectedItem = this.fileSystem.selectedItem;
  loading      = this.fileSystem.loading;
  error        = this.fileSystem.error;

  searchQuery  = this.fileSystem.searchQuery;
  activeFilter = this.fileSystem.activeFilter;

  filters: { label: string; value: FileFilter; icon: string }[] = [
    { label: 'Все',       value: 'all',      icon: 'pi-list' },
    { label: 'Фото',      value: 'image',    icon: 'pi-image' },
    { label: 'Видео',     value: 'video',    icon: 'pi-video' },
    { label: 'Документы', value: 'document', icon: 'pi-file' },
    { label: 'Архивы',    value: 'archive',  icon: 'pi-box' },
    { label: 'Прочее',    value: 'other',    icon: 'pi-file' },
  ];

  items: MenuItem[] | undefined;

  ngOnInit() {
    this.items = [
      {
        label: 'скачать',
        icon: PrimeIcons.DOWNLOAD,
        command: () => {
          const item = this.selectedItem();
          if (item && 'downloadUrl' in item) this.fileSystem.downloadFile(item);
        },
      },
    ];
  }

  // ─── Поиск и фильтры ───

  setFilter(filter: FileFilter) {
    this.fileSystem.activeFilter.set(filter);
  }

  clearSearch() {
    this.fileSystem.searchQuery.set('');
  }

  onSearchInput(event: Event) {
    this.fileSystem.searchQuery.set((event.target as HTMLInputElement).value);
  }

  // ─── Загрузка файлов ───

  onFilesSelected(event: any) {
    const files: File[] = event.files;
    if (files?.length > 0) {
      this.fileSystem.uploadFiles(files, this.fileSystem.currentFolderId());
    }
  }

  // ─── Загрузка папки ───

  triggerFolderUpload() {
    this.folderInputRef.nativeElement.value = '';
    this.folderInputRef.nativeElement.click();
  }

  async onFolderSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const rootFolderId = this.fileSystem.currentFolderId();

    this.folderUploading.set(true);
    this.messageService.add({
      severity: 'secondary',
      summary: 'Загрузка',
      detail: `Загружаем папку (${fileArray.length} файлов)...`,
      life: 4000,
      key: 'br',
    });

    try {
      await this.fileSystem.uploadFolderStructure(fileArray, rootFolderId);
      this.messageService.add({
        severity: 'secondary',
        summary: 'Готово',
        detail: 'Папка успешно загружена',
        life: 2000,
        key: 'br',
      });
    } catch {
      this.messageService.add({
        severity: 'secondary',
        summary: 'Ошибка',
        detail: 'Не удалось загрузить папку',
        key: 'br',
      });
    } finally {
      this.folderUploading.set(false);
    }
  }

  // ─── Действия с выбранным элементом ───

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
    this.fileSystem.deleteItem(item.id, type);
    this.messageService.add({
      severity: 'secondary', summary: 'Готово',
      detail: `${isFile ? 'Файл' : 'Папка'} удалён(а)`, key: 'br',
    });
  }

  shareSelected() {
    const item = this.selectedItem();
    if (!item || !('name' in item)) {
      this.messageService.add({
        severity: 'secondary', summary: 'Внимание',
        detail: 'Выберите файл для пересылки', life: 1500, key: 'br',
      });
      return;
    }
    try {
      this.shareService.copyShareLink(item.name);
      this.messageService.add({
        severity: 'secondary', summary: 'Успешно',
        detail: `Ссылка на "${item.name}" скопирована`, life: 1500, key: 'br',
      });
    } catch {
      this.messageService.add({
        severity: 'secondary', summary: 'Ошибка',
        detail: 'Не удалось скопировать ссылку', key: 'br',
      });
    }
  }

  // ─── Создать папку ───

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