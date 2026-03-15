import { ChangeDetectionStrategy, Component, effect, inject, OnInit } from '@angular/core';
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


@Component({
  selector: 'app-list-files',
  imports: [ScrollPanelModule, TableModule, ToastModule, ButtonModule, MenuModule, CardModule, ProgressSpinner, TieredMenuModule, DecodeURIComponentPipe, BreadcrumbModule],
  templateUrl: './list-files.html',
  styleUrl: './list-files.scss',
  providers: [MessageService, TieredMenuModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListFiles implements OnInit{

  protected readonly fileSystem = inject(FileSystem)

  files = this.fileSystem.files;
  folders = this.fileSystem.folders;
  selectedItem = this.fileSystem.selectedItem;
  loading = this.fileSystem.loading;
  error = this.fileSystem.error;

  constructor(){}
  items: MenuItem[] | undefined;
  ngOnInit() {
    this.fileSystem.loadTree();
    this.fileSystem.loadFiles(null);
    
    console.log('Папки загружены:', this.folders().length);
    console.log('Файлы загружены:', this.files().length);

    this.items = [
      {
        label: 'скачать',
        icon: PrimeIcons.DOWNLOAD,
        command: () => {
          const item = this.selectedItem();
          if (item && 'downloadUrl' in item) {
            this.fileSystem.downloadFile(item);
          }
        }
      },
      {
        label: 'удалить',
        icon: PrimeIcons.TRASH,
        command: () => this.deleteSelected()
      },
      {
        label: 'переслать',
        icon: PrimeIcons.SEND,
        command: () => this.shareFile()
      } 
    ]
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

  // ... твои импорты и класс

  // Метод для клика по папке
  openFolder(folder: FolderItem) {
    this.fileSystem.openFolder(folder.id);
  }

  // Кнопка "Назад" (если хочешь оставить)
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

  shareFile() {
  const item = this.selectedItem();
    if (!item || !('downloadUrl' in item)) {
      alert('Выберите файл для пересылки');
      return;
    }
    const shareUrl = (item as FileItem).downloadUrl;
    navigator.clipboard.writeText(shareUrl)
  }

  downloadFile(file: FileItem) {
    this.fileSystem.downloadFile(file);
  }

  deleteSelected() {
    const item = this.selectedItem();
    if (!item) return;
    const type = 'files' in item ? 'file' : 'folder';
    this.fileSystem.deleteItem(item.id, type);
  }

  downloadSelected() {
    const item = this.selectedItem();
    if (!item || !('downloadUrl' in item)) return;
  }
}