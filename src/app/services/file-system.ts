import { computed, effect, Injectable, signal } from '@angular/core';
import { FileItem } from '../interfaces/file-system-interfeces/file-item.model';
import { FolderItem } from '../interfaces/file-system-interfeces/folder-item.model';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FileSystem {
  private apiUrl = 'http://localhost:4400/file-system';

  private _files = signal<FileItem[]>([]);
  private _folders = signal<FolderItem[]>([]);
  private _selectedItem = signal<FileItem | FolderItem | null>(null);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  files = computed(() => this._files());
  folders = computed(() => this._folders());
  selectedItem = computed(() => this._selectedItem());
  loading = computed(() => this._loading());
  error = computed(() => this._error());
  hasContent = computed(() => this._files().length > 0 || this._folders().length > 0);
  private _pathStack = signal<string[]>([]);

  readonly currentFolderId = computed(() => this._pathStack().length > 0 ? this._pathStack().slice(-1)[0] : null);

  readonly breadcrumbs = computed(() => {
  const stack = this._pathStack();
  return stack.map(id => ({ id, label: id }));
});

  constructor(
    private http: HttpClient,
  ) {
    effect(() => {
      const err = this._error();
    });
  }

openFolder(folderId: string) {
  this._pathStack.update(stack => [...stack, folderId]);
  this.loadFiles(folderId);
}

goBack() {
  this._pathStack.update(stack => {
    if (stack.length > 0) {
      const newStack = stack.slice(0, -1);
      const parentId = newStack.length > 0 ? newStack[newStack.length - 1] : null;
      this.loadFiles(parentId);
      return newStack;
    }
    return stack;
  });
}

  loadTree() {
    this._loading.set(true);
    this._error.set(null);
    this.http.get<FolderItem[]>(`${this.apiUrl}/tree`, {
      withCredentials: true
    }).subscribe({
      next: (folders) => {
        console.log('loadTree вернул папок:', folders.length, folders);
        this._folders.set(folders || []);
        this._files.set([]);
        this._loading.set(false);
      },
      error: (err) => {
        this._loading.set(false);
      }
    });
  }


loadFiles(folderId: string | null) {
  this._loading.set(true);
  this._error.set(null);
  const url = folderId ? `${this.apiUrl}/files/${folderId}` : `${this.apiUrl}/files`;
  this.http.get<FileItem[]>(url, {
    withCredentials: true  
  }).pipe(
    catchError(err => this.handleError(err, 'Ошибка загрузки файлов'))
  ).subscribe({
    next: (files) => {
      const decodedFiles = files.map(file => ({
      ...file,
      name: decodeURIComponent(file.name)
    }));
      this._files.set(files || []);
      this._loading.set(false);
    },
    error: (err) => {
      this._loading.set(false);
    }
  });
}

  uploadFiles(files: FileList | File[], folderId?: string | null) {
    this._loading.set(true);
    this._error.set(null);

    const formData = new FormData();
    if (folderId) {
      formData.append('folderId', folderId);
    }

    Array.from(files).forEach(file => formData.append('file', file));

    this.http.post(`${this.apiUrl}/uploadFile`, formData, {
      withCredentials: true
    }).pipe(
      catchError(err => this.handleError(err, 'Ошибка загрузки файлов'))
    ).subscribe({
      next: () => {
        setTimeout(() => {
          this.loadFiles(folderId ?? null);
          this._loading.set(false);
        }, 800);
      },
      error: (err) => {
        this._loading.set(false);
      }
    });
  }

  deleteItem(id: string, type: 'file' | 'folder') {
      this._loading.set(true);
      this._error.set(null);
      this.http.delete(`${this.apiUrl}/delete/${id}?type=file`, {
        withCredentials: true
      }).pipe(
        catchError(err => this.handleError(err, `Не удалось удалить ${type}`))
      ).subscribe({
        next: () => {
          this.loadTree();
          this.loadFiles(this.currentFolderId());
          this._loading.set(false);
        },
        error: (err) => {
          this._loading.set(false);
        }
      });
    }

  createFolder(name: string, parentId: string | null = null) {
    this._loading.set(true);
    this._error.set(null);
    const body = { name, parentId };
    this.http.post(`${this.apiUrl}/createFolder`, body, {
      withCredentials: true
    }).pipe(
      catchError(err => this.handleError(err, 'Ошибка создания папки'))
    ).subscribe({
      next: () => {
        this.loadTree();
        this.loadFiles(parentId);
        this._loading.set(false);
        this._folders.set(this._folders());
      },
      error: (err) => {
        this._loading.set(false);
      }
    });
  }
  
  selectItem(item: FileItem | FolderItem | null) {
    this._selectedItem.set(item);
  }

  clearSelection() {
    this._selectedItem.set(null);
  }

  private handleError(error: HttpErrorResponse, defaultMsg: string) {
    let message = defaultMsg;
    if (error.error instanceof ErrorEvent) {
      message = `Клиентская ошибка: ${error.error.message}`;
    } else {
      if (error.status === 400) {
        message = error.error?.message || 'Некорректный запрос';
      } else if (error.status === 401) {
        message = 'Требуется авторизация';
      } else if (error.status === 403) {
        message = 'Доступ запрещён';
      } else if (error.status === 404) {
        message = 'Ресурс не найден';
      } else if (error.status >= 500) {
        message = 'Ошибка сервера. Попробуйте позже.';
      } else {
        message = error.error?.message || `Ошибка ${error.status}`;
      }
    }

    this._error.set(message);
    console.error('FileService error:', error);
    return throwError(() => new Error(message));
  }

  downloadFile(file: FileItem) {
    fetch(`${this.apiUrl}/download/${file.id}`, {
    method: 'GET',
    credentials: 'include'
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Ошибка скачивания: ${response.status}`);
      }
      return response.blob();
    })
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    })
    .catch(err => {
      console.error('Ошибка скачивания:', err);
    });
  }

}
