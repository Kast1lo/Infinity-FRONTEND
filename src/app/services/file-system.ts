import { computed, effect, Injectable, signal } from '@angular/core';
import { FileItem } from '../interfaces/file-system-interfeces/file-item.model';
import { FolderItem } from '../interfaces/file-system-interfeces/folder-item.model';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, firstValueFrom, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment.prod';

export type FileFilter = 'all' | 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other';

@Injectable({
  providedIn: 'root',
})
export class FileSystem {
  private readonly apiUrl = environment.apiUrl;

  private _files   = signal<FileItem[]>([]);
  private _folders = signal<FolderItem[]>([]);
  private _selectedItem = signal<FileItem | FolderItem | null>(null);
  private _loading = signal<boolean>(false);
  private _error   = signal<string | null>(null);

  readonly searchQuery  = signal<string>('');
  readonly activeFilter = signal<FileFilter>('all');

  files        = computed(() => this._files());
  folders      = computed(() => this._folders());
  selectedItem = computed(() => this._selectedItem());
  loading      = computed(() => this._loading());
  error        = computed(() => this._error());
  hasContent   = computed(() => this._files().length > 0 || this._folders().length > 0);

  readonly filteredFiles = computed(() => {
    const files  = this._files();
    const query  = this.searchQuery().toLowerCase().trim();
    const filter = this.activeFilter();

    return files.filter(file => {
      const name = decodeURIComponent(file.name).toLowerCase();
      const matchesQuery = !query || name.includes(query);

      let matchesFilter = true;
      if (filter === 'image')    matchesFilter = file.mimeType.startsWith('image/');
      if (filter === 'video')    matchesFilter = file.mimeType.startsWith('video/');
      if (filter === 'audio')    matchesFilter =
        file.mimeType.startsWith('audio/') ||
        /\.(mp3|wav|ogg|flac|aac|m4a|wma|opus)$/i.test(file.name);
      if (filter === 'document') matchesFilter =
        file.mimeType.includes('word') || file.mimeType.includes('document') ||
        file.mimeType.includes('excel') || file.mimeType.includes('spreadsheet') ||
        file.mimeType.includes('powerpoint') || file.mimeType.includes('presentation') ||
        file.mimeType === 'application/pdf';
      if (filter === 'archive')  matchesFilter =
        file.mimeType.includes('zip') || file.mimeType.includes('rar') ||
        file.name.toLowerCase().endsWith('.zip') || file.name.toLowerCase().endsWith('.rar');
      if (filter === 'other')    matchesFilter =
        !file.mimeType.startsWith('image/') &&
        !file.mimeType.startsWith('video/') &&
        !file.mimeType.startsWith('audio/') &&
        !/\.(mp3|wav|ogg|flac|aac|m4a|wma|opus)$/i.test(file.name) &&
        !file.mimeType.includes('word') && !file.mimeType.includes('document') &&
        !file.mimeType.includes('excel') && !file.mimeType.includes('spreadsheet') &&
        !file.mimeType.includes('powerpoint') && !file.mimeType.includes('presentation') &&
        file.mimeType !== 'application/pdf' &&
        !file.mimeType.includes('zip') && !file.mimeType.includes('rar');

      return matchesQuery && matchesFilter;
    });
  });

  readonly filteredFolders = computed(() => {
    const folders = this._folders();
    const query   = this.searchQuery().toLowerCase().trim();
    if (!query) return folders;
    return folders.filter(f => f.name.toLowerCase().includes(query));
  });

  private _pathStack = signal<string[]>([]);

  readonly currentFolderId = computed(() =>
    this._pathStack().length > 0 ? this._pathStack().slice(-1)[0] : null
  );

  readonly breadcrumbs = computed(() =>
    this._pathStack().map(id => ({ id, label: id }))
  );

  readonly breadcrumbItems = computed(() => {
    const stack   = this._pathStack();
    const folders = this._folders();
    return stack.map(id => {
      const folder = folders.find(f => f.id === id);
      return { id, label: folder?.name ?? '...' };
    });
  });

  constructor(private http: HttpClient) {
    effect(() => { const err = this._error(); });
  }

  navigateToRoot() {
    this._pathStack.set([]);
    this.loadFiles(null);
  }

  navigateToIndex(index: number) {
    const newStack = this._pathStack().slice(0, index + 1);
    this._pathStack.set(newStack);
    this.loadFiles(newStack[newStack.length - 1]);
  }

  openFolder(folderId: string) {
    this._pathStack.update(stack => [...stack, folderId]);
    this.loadFiles(folderId);
    this.searchQuery.set('');
    this.activeFilter.set('all');
  }

  goBack() {
    this._pathStack.update(stack => {
      if (stack.length === 0) return stack;
      const newStack = stack.slice(0, -1);
      const parentId = newStack.length > 0 ? newStack[newStack.length - 1] : null;
      this.loadFiles(parentId);
      return newStack;
    });
    this.searchQuery.set('');
    this.activeFilter.set('all');
  }

  loadTree() {
    this._error.set(null);
    this.http.get<FolderItem[]>(`${this.apiUrl}/file-system/tree`, { withCredentials: true }).subscribe({
      next: (folders) => {
        this._folders.set(this.flattenFolders(folders));
      },
      error: () => {},
    });
  }

  private flattenFolders(folders: FolderItem[]): FolderItem[] {
    const result: FolderItem[] = [];
    const traverse = (items: any[]) => {
      for (const folder of items) {
        const { children, files, ...folderData } = folder;
        result.push(folderData as FolderItem);
        if (children?.length > 0) traverse(children);
      }
    };
    traverse(folders);
    return result;
  }

  loadFiles(folderId: string | null) {
    this._loading.set(true);
    this._error.set(null);
    const url = folderId ? `${this.apiUrl}/file-system/files/${folderId}` : `${this.apiUrl}/file-system/files`;
    this.http.get<FileItem[]>(url, { withCredentials: true }).pipe(
      catchError(err => this.handleError(err, 'Ошибка загрузки файлов'))
    ).subscribe({
      next: (files) => {
        this._files.set(files || []);
        this._loading.set(false);
      },
      error: () => { this._loading.set(false); },
    });
  }

  async fetchFileAsArrayBuffer(fileId: string): Promise<ArrayBuffer> {
    const response = await fetch(`${this.apiUrl}/file-system/proxy/${fileId}`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) throw new Error(`Ошибка загрузки: ${response.status}`);
    return response.arrayBuffer();
  }

  uploadFiles(files: FileList | File[], folderId?: string | null) {
    this._loading.set(true);
    this._error.set(null);
    const fileArray = Array.from(files);
    const uploads = fileArray.map(file => {
      const formData = new FormData();
      formData.append('file', file);
      if (folderId) formData.append('folderId', folderId);
      return this.http.post(`${this.apiUrl}/file-system/uploadFile`, formData, {
        withCredentials: true,
      }).pipe(catchError(err => this.handleError(err, 'Ошибка загрузки файлов')));
    });

    import('rxjs').then(({ forkJoin }) => {
      forkJoin(uploads).subscribe({
        next: () => {
          setTimeout(() => {
            this.loadFiles(folderId ?? null);
            this._loading.set(false);
          }, 800);
        },
        error: () => { this._loading.set(false); },
      });
    });
  }

  async uploadFolderStructure(files: File[], rootFolderId: string | null): Promise<void> {
    const folderCache = new Map<string, string>();

    const getOrCreateFolder = async (pathParts: string[]): Promise<string> => {
      const pathKey = pathParts.join('/');
      if (folderCache.has(pathKey)) return folderCache.get(pathKey)!;

      let parentId: string | null = rootFolderId;
      if (pathParts.length > 1) {
        parentId = await getOrCreateFolder(pathParts.slice(0, -1));
      }

      const name = pathParts[pathParts.length - 1];

      const existing = this._folders().find(
        f => f.name === name && f.parentId === parentId
      );
      if (existing) {
        folderCache.set(pathKey, existing.id);
        return existing.id;
      }

      const created = await firstValueFrom(
        this.http.post<FolderItem>(
          `${this.apiUrl}/file-system/createFolder`,
          { name, parentId },
          { withCredentials: true }
        )
      );

      this._folders.update(folders => [...folders, created]);
      folderCache.set(pathKey, created.id);
      return created.id;
    };

    for (const file of files) {
      const parts = file.webkitRelativePath.split('/');
      const folderParts = parts.slice(0, -1);

      let targetFolderId: string | null = rootFolderId;

      if (folderParts.length > 0) {
        targetFolderId = await getOrCreateFolder(folderParts);
      }

      const formData = new FormData();
      formData.append('file', file);
      if (targetFolderId) formData.append('folderId', targetFolderId);

      await firstValueFrom(
        this.http.post(`${this.apiUrl}/file-system/uploadFile`, formData, { withCredentials: true })
      );
    }

    await this.refreshAfterUpload(this.currentFolderId());
  }

  deleteItem(id: string, type: 'file' | 'folder') {
    this._loading.set(true);
    this._error.set(null);
    this.http.delete(`${this.apiUrl}/file-system/delete/${id}?type=${type}`, { withCredentials: true }).pipe(
      catchError(err => this.handleError(err, `Не удалось удалить ${type}`))
    ).subscribe({
      next: () => {
        this.loadTree();
        this.loadFiles(this.currentFolderId());
        this._loading.set(false);
      },
      error: () => { this._loading.set(false); },
    });
  }

  createFolder(name: string, parentId: string | null = null) {
    this._loading.set(true);
    this._error.set(null);
    this.http.post(`${this.apiUrl}/file-system/createFolder`, { name, parentId }, { withCredentials: true }).pipe(
      catchError(err => this.handleError(err, 'Ошибка создания папки'))
    ).subscribe({
      next: () => {
        this.loadTree();
        this.loadFiles(parentId);
        this._loading.set(false);
      },
      error: () => { this._loading.set(false); },
    });
  }

  selectItem(item: FileItem | FolderItem | null) {
    const current = this._selectedItem();
    if (current && item && current.id === item.id) {
      this._selectedItem.set(null);
    } else {
      this._selectedItem.set(item);
    }
  }

  clearSelection() {
    this._selectedItem.set(null);
  }

  moveFile(fileId: string, targetFolderId: string | null) {
    return this.http.patch(
      `${this.apiUrl}/file-system/move/${fileId}`,
      { folderId: targetFolderId },
      { withCredentials: true }
    ).pipe(
      catchError(err => this.handleError(err, 'Не удалось переместить файл')),
      tap({
        next: () => this.refreshAfterUpload(this.currentFolderId()),
      }),
    );
  }

  renameItem(id: string, type: 'file' | 'folder', name: string) {
    this._loading.set(true);
    this._error.set(null);
    return this.http.patch(
      `${this.apiUrl}/file-system/rename/${id}?type=${type}`,
      { name },
      { withCredentials: true }
    ).pipe(
      catchError(err => this.handleError(err, 'Не удалось переименовать')),
      tap(() => {
        this.loadTree();
        this.loadFiles(this.currentFolderId());
        this._loading.set(false);
      }),
    );
  }

  downloadFile(file: FileItem) {
    fetch(`${this.apiUrl}/file-system/download/${file.id}`, { method: 'GET', credentials: 'include' })
      .then(r => { if (!r.ok) throw new Error(); return r.blob(); })
      .then(blob => {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = file.name;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      })
      .catch(err => console.error('Ошибка скачивания:', err));
  }

  downloadFolder(folderId: string, name: string) {
    this._loading.set(true);
    this._error.set(null);
    this.http.get(`${this.apiUrl}/file-system/download-folder/${folderId}`, {
      responseType: 'blob',
      withCredentials: true,
    }).pipe(
      catchError(err => this.handleError(err, 'Не удалось скачать папку'))
    ).subscribe({
      next: (blob: Blob) => {
        const url  = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = `${name}.zip`;
        link.click();
        window.URL.revokeObjectURL(url);
        this._loading.set(false);
      },
      error: () => { this._loading.set(false); },
    });
  }

  private async refreshAfterUpload(folderId: string | null): Promise<void> {
    const [folders, files] = await Promise.all([
      firstValueFrom(
        this.http.get<FolderItem[]>(`${this.apiUrl}/file-system/tree`, { withCredentials: true })
      ),
      firstValueFrom(
        this.http.get<FileItem[]>(
          folderId ? `${this.apiUrl}/file-system/files/${folderId}` : `${this.apiUrl}/file-system/files`,
          { withCredentials: true }
        )
      ),
    ]);

    this._folders.set(this.flattenFolders(folders));
    this._files.set(files || []);
  }

  private handleError(error: HttpErrorResponse, defaultMsg: string) {
    let message = defaultMsg;
    if (error.error instanceof ErrorEvent) {
      message = `Клиентская ошибка: ${error.error.message}`;
    } else {
      if (error.status === 400)     message = error.error?.message || 'Некорректный запрос';
      else if (error.status === 401) message = 'Требуется авторизация';
      else if (error.status === 403) message = 'Доступ запрещён';
      else if (error.status === 404) message = 'Ресурс не найден';
      else if (error.status >= 500)  message = 'Ошибка сервера. Попробуйте позже.';
      else message = error.error?.message || `Ошибка ${error.status}`;
    }
    this._error.set(message);
    console.error('FileService error:', error);
    return throwError(() => new Error(message));
  }
}