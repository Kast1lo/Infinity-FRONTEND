import { ChangeDetectionStrategy, Component, inject, OnInit, signal, viewChild } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SplitButtonModule } from 'primeng/splitbutton';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { FileSystem } from '../../../../../services/file-system';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { MenuItem, PrimeIcons, MessageService, } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { FileItem } from '../../../../../interfaces/file-system-interfeces/file-item.model';
import { MessageModule } from 'primeng/message';


@Component({
  selector: 'app-toolbar',
  imports: [ToolbarModule, ButtonModule, IconFieldModule, InputIconModule, SplitButtonModule, InputTextModule, FileUploadModule, ToastModule, DialogModule, FormsModule, MessageModule],
  templateUrl: './toolbar.html',
  styleUrl: './toolbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],

})
export class Toolbar {
  protected readonly messageService = inject(MessageService);
  protected readonly fileSystem = inject(FileSystem)

  visible = signal(false);
  folderName = signal<string>('');

  files = this.fileSystem.files;
  folder = this.fileSystem.folders;
  selectedItem = this.fileSystem.selectedItem;
  loading = this.fileSystem.loading;
  error = this.fileSystem.error;

  items: MenuItem[] | undefined;

  ngOnInit() {
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
      }
    ]
  }
  
  onUpload(event: any) {
    const files = event.files as File[];
    if (files.length > 0) {
    const currentFolderId = this.fileSystem.currentFolderId();
    this.fileSystem.uploadFiles(files, currentFolderId);
    this.messageService.add({ severity: 'secondary', summary: 'Успех', detail: 'Файл успешно загружен', key: 'br' });
    }
  }

  downloadFile(file: FileItem) {
    this.fileSystem.downloadFile(file);
  }

  deleteSelected() {
    const item = this.selectedItem();
    if (!item) return;
    const type = 'files' in item ? 'file' : 'folder';
    this.fileSystem.deleteItem(item.id, type);
    this.messageService.add({ severity: 'secondary', summary: 'Готово', detail: 'Файл(ы) успешно удален(ы)', key: 'br'  });
  }

  downloadSelected() {
    const item = this.selectedItem();
    if (!item || !('downloadUrl' in item)) return;
    this.messageService.add({ severity: 'secondary', summary: 'Успех', detail: 'Файл успешно загружен', key: 'br' });
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
    if (!name) {
      return;
    }
    const parentId = this.fileSystem.currentFolderId();
    this.fileSystem.createFolder(name, parentId);
    this.visible.set(false);
    this.folderName.set('');
  }
}
