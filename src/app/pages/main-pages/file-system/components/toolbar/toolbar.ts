import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SplitButtonModule } from 'primeng/splitbutton';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { FileSystem } from '../../../../../services/file-system';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { MenuItem, PrimeIcons, MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { FileItem } from '../../../../../interfaces/file-system-interfeces/file-item.model';
import { MessageModule } from 'primeng/message';
import { ShareService } from '../../../../../services/share';

@Component({
  selector: 'app-toolbar',
  imports: [
    ToolbarModule, ButtonModule, IconFieldModule, InputIconModule,
    SplitButtonModule, InputTextModule, FileUploadModule,
    ToastModule, DialogModule, FormsModule, MessageModule
  ],
  templateUrl: './toolbar.html',
  styleUrl: './toolbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
})
export class Toolbar implements OnInit {
  protected readonly messageService = inject(MessageService);
  protected readonly fileSystem   = inject(FileSystem);
  protected readonly shareService = inject(ShareService);

  visible    = signal(false);
  folderName = signal<string>('');

  files        = this.fileSystem.files;
  folder       = this.fileSystem.folders;
  selectedItem = this.fileSystem.selectedItem;
  loading      = this.fileSystem.loading;
  error        = this.fileSystem.error;

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
    ];
  }

  onFilesSelected(event: any) {
    const files: File[] = event.files;
    if (files && files.length > 0) {
      const currentFolderId = this.fileSystem.currentFolderId();
      this.fileSystem.uploadFiles(files, currentFolderId);
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
    this.fileSystem.deleteItem(item.id, type);
    this.messageService.add({
      severity: 'secondary', summary: 'Готово',
      detail: `${isFile ? 'Файл' : 'Папка'} удалён(а)`, key: 'br'
    });
  }

  shareSelected() {
    const item = this.selectedItem();
    if (!item || !('name' in item)) {
      this.messageService.add({
        severity: 'secondary', summary: 'Внимание',
        detail: 'Выберите файл для пересылки', life: 1500, key: 'br'
      });
      return;
    }
    try {
      this.shareService.copyShareLink(item.name);
      this.messageService.add({
        severity: 'secondary', summary: 'Успешно',
        detail: `Ссылка на "${item.name}" скопирована`, life: 1500, key: 'br'
      });
    } catch {
      this.messageService.add({
        severity: 'secondary', summary: 'Ошибка',
        detail: 'Не удалось скопировать ссылку', key: 'br'
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
    const parentId = this.fileSystem.currentFolderId();
    this.fileSystem.createFolder(name, parentId);
    this.visible.set(false);
    this.folderName.set('');
  }
}