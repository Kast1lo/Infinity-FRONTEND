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
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-toolbar',
  imports: [ToolbarModule, ButtonModule, IconFieldModule, InputIconModule, SplitButtonModule, InputTextModule, FileUploadModule, ToastModule, DialogModule, FormsModule],
  templateUrl: './toolbar.html',
  styleUrl: './toolbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],

})
export class Toolbar {

  protected readonly fileSystem = inject(FileSystem)

  visible = signal(false);
  folderName = signal<string>('');

  files = this.fileSystem.files;
  folder = this.fileSystem.folders;
  selectedItem = this.fileSystem.selectedItem;
  loading = this.fileSystem.loading;
  error = this.fileSystem.error;

  
  onUpload(event: any) {
    const files = event.files as File[];
    if (files.length > 0) {
    const currentFolderId = this.fileSystem.currentFolderId();
    this.fileSystem.uploadFiles(files, currentFolderId);
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
    if (!name) {
      return;
    }
    const parentId = this.fileSystem.currentFolderId();
    this.fileSystem.createFolder(name, parentId);
    this.visible.set(false);
    this.folderName.set('');
  }

}
