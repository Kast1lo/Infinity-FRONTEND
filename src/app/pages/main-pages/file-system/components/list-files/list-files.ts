import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { Table, TableModule } from 'primeng/table';
import { FileSystem } from '../../../../../services/file-system';
import { FileItem } from '../../../../../interfaces/file-system-interfeces/file-item.model';
import { MenuItem, MessageService, PrimeIcons } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinner } from "primeng/progressspinner";
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { MenuModule, MenuItemContent } from 'primeng/menu';
import { CardModule } from 'primeng/card';
import { FolderItem } from '../../../../../interfaces/file-system-interfeces/folder-item.model';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { DecodeURIComponentPipe } from "../../../../../pipes/decode-uri.pipe";
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { RippleModule } from 'primeng/ripple';
import { ImageModule } from 'primeng/image';
import { ShareService } from '../../../../../services/share';

@Component({
  selector: 'app-list-files',
  imports: [ScrollPanelModule,
  TableModule, 
  ToastModule, 
  ButtonModule, 
  MenuModule, 
  CardModule, 
  ProgressSpinner, 
  TieredMenuModule, 
  DecodeURIComponentPipe, 
  BreadcrumbModule, RippleModule
  , ImageModule],
  templateUrl: './list-files.html',
  styleUrl: './list-files.scss',
  providers: [MessageService, TieredMenuModule, RippleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListFiles implements OnInit{
  protected readonly messageService = inject(MessageService);
  protected readonly fileSystem = inject(FileSystem)
  protected readonly shareService = inject(ShareService)

  files = this.fileSystem.files;
  folders = this.fileSystem.folders;
  selectedItem = this.fileSystem.selectedItem;
  loading = this.fileSystem.loading;
  error = this.fileSystem.error;
  
  constructor(){}

  items = computed<MenuItem[]>(() => {
    const selected = this.selectedItem();

    if (!selected) return [];

    const isFile = 'downloadUrl' in selected && 'mimeType' in selected;

    const common = [
      {
        label: 'удалить',
        icon: PrimeIcons.TRASH,
        command: () => this.deleteSelected()
      }
    ];

    if ('downloadUrl' in selected) {
      return [
        {
          label: 'скачать',
          icon: PrimeIcons.DOWNLOAD,
          command: () => this.fileSystem.downloadFile(selected)
        },
        ...common,
        {
          label: 'переслать',
          icon: PrimeIcons.SEND,
          command: () => this.shareFile()
        }
      ];
    } else {
      return [
        {
          label: 'скачать',
          icon: PrimeIcons.DOWNLOAD,
          command: () => this.fileSystem.downloadFolder(selected.id, selected.name)
        },
        ...common
      ];
    }
  });

  ngOnInit() {    
    this.fileSystem.loadTree();
    this.fileSystem.loadFiles(null);
  }

  getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'pi pi-image';
    if (mimeType === 'application/pdf') return 'pi pi-file-pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'pi pi-file-word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'pi pi-file-excel';
    if (mimeType.startsWith('video/')) return 'pi pi-video';
    return 'pi pi-file';
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
  
  isImage(file: FileItem): boolean {
    return file.mimeType.startsWith('image/');
  }
  
  onFileDropped(files: FileList){
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
      key: 'br' 
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
      key: 'br' 
    });
  } catch (error) {
    this.messageService.add({
      severity: 'secondary',
      summary: 'Ошибка',
      detail: 'Не удалось скопировать ссылку',
      life: 1000,
      key: 'br' 
    });
  }
}

  deleteSelected() {
    const item = this.selectedItem();
    if (!item) return;
    const isFile = 'downloadUrl' in item && 'mimeType' in item;
    const type: 'file' | 'folder' = isFile ? 'file' : 'folder';
    console.log(`🗑 Удаляем ${type.toUpperCase()}:`, item.id, item.name);
    this.fileSystem.deleteItem(item.id, type);
    this.messageService.add({ 
      severity: 'secondary', 
      summary: 'Готово', 
      detail: `${isFile ? 'Файл' : 'Папка'} удалён(а)`, 
      key: 'br' 
    });
  }
  downloadSelected() {
    const item = this.selectedItem();
    if (!item || !('downloadUrl' in item)) return;
  }
}