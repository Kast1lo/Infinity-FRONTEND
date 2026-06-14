import { computed, effect, Injectable, signal } from '@angular/core';
import { FileItem } from '../interfaces/file-system-interfeces/file-item.model';
import { FolderItem } from '../interfaces/file-system-interfeces/folder-item.model';
import { SharedFileItem, SharedFolderItem, ShareSettings } from '../interfaces/file-system-interfeces/shared-file.model';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, firstValueFrom, forkJoin, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export type FileFilter = 'all' | 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other';
export type SortKey = 'name' | 'date' | 'size' | 'type';
export type SortDir = 'asc' | 'desc';

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

  private _loadFilesToken = 0;

  private _filesInFoldersCount = signal(0);
  private _rootFilesCount      = signal(0);

  readonly searchQuery  = signal<string>('');
  readonly activeFilter = signal<FileFilter>('all');
  readonly sortKey      = signal<SortKey>('name');
  readonly sortDir      = signal<SortDir>('asc');

  private _trashFiles   = signal<FileItem[]>([]);
  private _trashFolders = signal<FolderItem[]>([]);
  private _trashLoading = signal<boolean>(false);

  private _sharedFiles   = signal<SharedFileItem[]>([]);
  private _sharedFolders = signal<SharedFolderItem[]>([]);
  private _sharedLoading = signal<boolean>(false);

  private _starredFiles   = signal<FileItem[]>([]);
  private _starredFolders = signal<FolderItem[]>([]);
  private _starredLoading = signal<boolean>(false);

  files        = computed(() => this._files());
  folders      = computed(() => this._folders());
  trashFiles   = computed(() => this._trashFiles());
  trashFolders = computed(() => this._trashFolders());
  trashLoading = computed(() => this._trashLoading());
  trashCount   = computed(() => this._trashFiles().length + this._trashFolders().length);
  sharedFiles   = computed(() => this._sharedFiles());
  sharedFolders = computed(() => this._sharedFolders());
  sharedLoading = computed(() => this._sharedLoading());
  sharedCount   = computed(() => this._sharedFiles().length + this._sharedFolders().length);
  starredFiles   = computed(() => this._starredFiles());
  starredFolders = computed(() => this._starredFolders());
  starredLoading = computed(() => this._starredLoading());
  starredCount   = computed(() => this._starredFiles().length + this._starredFolders().length);
  selectedItem = computed(() => this._selectedItem());
  loading      = computed(() => this._loading());
  error        = computed(() => this._error());
  hasContent   = computed(() => this._files().length > 0 || this._folders().length > 0);

  readonly totalFilesCount = computed(() =>
    this._filesInFoldersCount() + this._rootFilesCount()
  );

  readonly filteredFiles = computed(() => {
    const files  = this._files();
    const query  = this.searchQuery().toLowerCase().trim();
    const filter = this.activeFilter();

    const result = files.filter(file => {
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

    const dir = this.sortDir() === 'asc' ? 1 : -1;
    const key = this.sortKey();
    return [...result].sort((a, b) => dir * this.compareFiles(a, b, key));
  });

  readonly filteredFolders = computed(() => {
    const query   = this.searchQuery().toLowerCase().trim();
    const folders = query
      ? this._folders().filter(f => f.name.toLowerCase().includes(query))
      : this._folders();

    const dir = this.sortDir() === 'asc' ? 1 : -1;
    const key = this.sortKey();
    return [...folders].sort((a, b) => dir * this.compareFolders(a, b, key));
  });

  // Папки сортируются по имени/дате; для size/type — откат к имени (у папок нет типа/размера)
  private compareFolders(a: FolderItem, b: FolderItem, key: SortKey): number {
    if (key === 'date') {
      return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    }
    return this.compareName(a.name, b.name);
  }

  private compareFiles(a: FileItem, b: FileItem, key: SortKey): number {
    switch (key) {
      case 'date': return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      case 'size': return (parseInt(a.size, 10) || 0) - (parseInt(b.size, 10) || 0);
      case 'type': {
        const byType = (a.mimeType || '').localeCompare(b.mimeType || '');
        return byType !== 0 ? byType : this.compareName(a.name, b.name);
      }
      default: return this.compareName(a.name, b.name);
    }
  }

  private compareName(a: string, b: string): number {
    return decodeURIComponent(a).localeCompare(decodeURIComponent(b), undefined, { numeric: true, sensitivity: 'base' });
  }

  setSortKey(key: SortKey) { this.sortKey.set(key); }
  toggleSortDir() { this.sortDir.update(d => (d === 'asc' ? 'desc' : 'asc')); }

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
        this._filesInFoldersCount.set(this.countFilesInTree(folders));
      },
      error: () => {},
    });
  }

  loadFilesStats() {
    this.loadTree();
    this.http.get<FileItem[]>(`${this.apiUrl}/file-system/files`, { withCredentials: true }).subscribe({
      next: (files) => this._rootFilesCount.set((files || []).length),
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

  private countFilesInTree(folders: any[]): number {
    let total = 0;
    for (const folder of folders) {
      if (folder.files?.length) total += folder.files.length;
      if (folder.children?.length) total += this.countFilesInTree(folder.children);
    }
    return total;
  }

  loadFiles(folderId: string | null) {
    const token = ++this._loadFilesToken;
    this._loading.set(true);
    this._error.set(null);
    const url = folderId ? `${this.apiUrl}/file-system/files/${folderId}` : `${this.apiUrl}/file-system/files`;
    this.http.get<FileItem[]>(url, { withCredentials: true }).pipe(
      catchError(err => this.handleError(err, 'Ошибка загрузки файлов'))
    ).subscribe({
      next: (files) => {
        if (token !== this._loadFilesToken) return;
        this._files.set(files || []);
        if (folderId === null) this._rootFilesCount.set((files || []).length);
        this._loading.set(false);
      },
      error: () => {
        if (token !== this._loadFilesToken) return;
        this._loading.set(false);
      },
    });
  }

  async fetchFileAsArrayBuffer(fileId: string): Promise<ArrayBuffer> {
    const response = await fetch(`${this.apiUrl}/file-system/proxy/${fileId}`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) {
      let detail = '';
      try { detail = (await response.text()).slice(0, 200); } catch {}
      throw new Error(`Сервер вернул ${response.status} ${response.statusText}${detail ? ': ' + detail : ''}`);
    }
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

    forkJoin(uploads).subscribe({
      next: () => {
        this.refreshAfterUpload(folderId ?? null).finally(() => {
          this._loading.set(false);
        });
      },
      error: () => { this._loading.set(false); },
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
    return this.http.delete(`${this.apiUrl}/file-system/delete/${id}?type=${type}`, { withCredentials: true }).pipe(
      catchError(err => this.handleError(err, `Не удалось удалить ${type}`)),
      tap({
        next: () => {
          this.loadTree();
          this.loadFiles(this.currentFolderId());
          this._loading.set(false);
        },
        error: () => { this._loading.set(false); },
      }),
    );
  }

  // ─── Корзина ───

  loadTrash() {
    this._trashLoading.set(true);
    this.http.get<{ files: FileItem[]; folders: FolderItem[] }>(
      `${this.apiUrl}/file-system/trash`, { withCredentials: true }
    ).pipe(
      catchError(err => this.handleError(err, 'Не удалось загрузить корзину'))
    ).subscribe({
      next: (res) => {
        this._trashFiles.set(res?.files ?? []);
        this._trashFolders.set(res?.folders ?? []);
        this._trashLoading.set(false);
      },
      error: () => { this._trashLoading.set(false); },
    });
  }

  restoreItem(id: string, type: 'file' | 'folder') {
    return this.http.patch(
      `${this.apiUrl}/file-system/restore/${id}?type=${type}`, {}, { withCredentials: true }
    ).pipe(
      catchError(err => this.handleError(err, 'Не удалось восстановить')),
      tap(() => {
        this.loadTrash();
        this.loadTree();
        this.loadFiles(this.currentFolderId());
      }),
    );
  }

  permanentDelete(id: string, type: 'file' | 'folder') {
    return this.http.delete(
      `${this.apiUrl}/file-system/trash/${id}?type=${type}`, { withCredentials: true }
    ).pipe(
      catchError(err => this.handleError(err, 'Не удалось удалить навсегда')),
      tap(() => this.loadTrash()),
    );
  }

  emptyTrash() {
    return this.http.delete(
      `${this.apiUrl}/file-system/trash`, { withCredentials: true }
    ).pipe(
      catchError(err => this.handleError(err, 'Не удалось очистить корзину')),
      tap(() => this.loadTrash()),
    );
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

  // Удаляет несколько файлов одним пакетом (мягко, в корзину) и обновляет один раз
  deleteFiles(fileIds: string[]) {
    this._loading.set(true);
    this._error.set(null);
    const requests = fileIds.map(id =>
      this.http.delete(`${this.apiUrl}/file-system/delete/${id}?type=file`, { withCredentials: true })
    );
    return forkJoin(requests).pipe(
      catchError(err => this.handleError(err, 'Не удалось удалить файлы')),
      tap({
        next: () => {
          this.loadTree();
          this.loadFiles(this.currentFolderId());
          this._loading.set(false);
        },
        error: () => { this._loading.set(false); },
      }),
    );
  }

  // Добавляет несколько файлов в избранное (только те, что ещё не помечены)
  starFiles(fileIds: string[]) {
    const toStar = fileIds.filter(id => {
      const f = this._files().find(file => file.id === id);
      return f ? !f.isStarred : false;
    });
    if (toStar.length === 0) return forkJoin([]);
    const requests = toStar.map(id =>
      this.http.patch<{ isStarred: boolean }>(
        `${this.apiUrl}/file-system/star/${id}?type=file`, {}, { withCredentials: true }
      )
    );
    return forkJoin(requests).pipe(
      catchError(err => this.handleError(err, 'Не удалось изменить избранное')),
      tap(() => {
        this._files.update(files =>
          files.map(f => (toStar.includes(f.id) ? { ...f, isStarred: true } : f))
        );
        this.loadStarred();
      }),
    );
  }

  // Перемещает несколько файлов одним пакетом и обновляет дерево один раз
  moveFiles(fileIds: string[], targetFolderId: string | null) {
    const requests = fileIds.map(id =>
      this.http.patch(
        `${this.apiUrl}/file-system/move/${id}`,
        { folderId: targetFolderId },
        { withCredentials: true }
      )
    );
    return forkJoin(requests).pipe(
      catchError(err => this.handleError(err, 'Не удалось переместить файлы')),
      tap({
        next: () => this.refreshAfterUpload(this.currentFolderId()),
      }),
    );
  }

  // Настроить публичную ссылку файла (вкл/выкл, срок, пароль)
  async setShare(fileId: string, opts: ShareSettings): Promise<{ isShared: boolean; shareExpiresAt: string | null; hasPassword: boolean }> {
    const body: any = { isShared: opts.isShared };
    if (opts.isShared) {
      if (opts.expiresInDays != null) body.expiresInDays = opts.expiresInDays;
      if (opts.password !== undefined) body.password = opts.password; // string -> set, null -> remove
    }
    const res: any = await firstValueFrom(
      this.http.patch(`${this.apiUrl}/file-system/share/${fileId}`, body, { withCredentials: true })
    );
    const data = res?.data ?? {};
    this._files.update(files =>
      files.map(f => (f.id === fileId ? { ...f, isShared: opts.isShared } : f))
    );
    const selected = this._selectedItem();
    if (selected && selected.id === fileId && 'mimeType' in selected) {
      this._selectedItem.set({ ...selected, isShared: opts.isShared } as FileItem);
    }
    return { isShared: data.isShared ?? opts.isShared, shareExpiresAt: data.shareExpiresAt ?? null, hasPassword: !!data.hasPassword };
  }

  loadSharedFiles() {
    this._sharedLoading.set(true);
    forkJoin({
      files: this.http.get<SharedFileItem[]>(`${this.apiUrl}/file-system/shared`, { withCredentials: true }).pipe(
        catchError(err => this.handleError(err, 'Не удалось загрузить список ссылок'))
      ),
      folders: this.http.get<SharedFolderItem[]>(`${this.apiUrl}/file-system/shared-folders`, { withCredentials: true }).pipe(
        catchError(err => this.handleError(err, 'Не удалось загрузить список ссылок'))
      ),
    }).subscribe({
      next: ({ files, folders }) => {
        this._sharedFiles.set(files ?? []);
        this._sharedFolders.set(folders ?? []);
        this._sharedLoading.set(false);
      },
      error: () => { this._sharedLoading.set(false); },
    });
  }

  // Отозвать ссылку (выключить публичный доступ)
  revokeShare(fileId: string) {
    return this.http.patch(
      `${this.apiUrl}/file-system/share/${fileId}`, { isShared: false }, { withCredentials: true }
    ).pipe(
      catchError(err => this.handleError(err, 'Не удалось отозвать ссылку')),
      tap(() => {
        this._sharedFiles.update(files => files.filter(f => f.id !== fileId));
        this._files.update(files => files.map(f => (f.id === fileId ? { ...f, isShared: false } : f)));
      }),
    );
  }

  // ─── Шаринг папок ───

  // Настроить публичную ссылку папки. Возвращает slug для копирования.
  async setFolderShare(folderId: string, opts: ShareSettings): Promise<{ isShared: boolean; slug: string | null; shareExpiresAt: string | null; hasPassword: boolean }> {
    const body: any = { isShared: opts.isShared };
    if (opts.isShared) {
      if (opts.expiresInDays != null) body.expiresInDays = opts.expiresInDays;
      if (opts.password !== undefined) body.password = opts.password;
    }
    const res: any = await firstValueFrom(
      this.http.patch(`${this.apiUrl}/file-system/share-folder/${folderId}`, body, { withCredentials: true })
    );
    const data = res?.data ?? {};
    this._folders.update(folders =>
      folders.map(f => (f.id === folderId ? { ...f, isShared: opts.isShared } : f))
    );
    const selected = this._selectedItem();
    if (selected && selected.id === folderId && !('mimeType' in selected)) {
      this._selectedItem.set({ ...selected, isShared: opts.isShared } as FolderItem);
    }
    return {
      isShared: data.isShared ?? opts.isShared,
      slug: data.slug ?? null,
      shareExpiresAt: data.shareExpiresAt ?? null,
      hasPassword: !!data.hasPassword,
    };
  }

  // Отозвать публичную ссылку папки
  revokeFolderShare(folderId: string) {
    return this.http.patch(
      `${this.apiUrl}/file-system/share-folder/${folderId}`, { isShared: false }, { withCredentials: true }
    ).pipe(
      catchError(err => this.handleError(err, 'Не удалось отозвать ссылку')),
      tap(() => {
        this._sharedFolders.update(folders => folders.filter(f => f.id !== folderId));
        this._folders.update(folders => folders.map(f => (f.id === folderId ? { ...f, isShared: false } : f)));
      }),
    );
  }

  // оставлено для обратной совместимости (быстрый шаринг без настроек)
  async publishShare(fileId: string): Promise<void> {
    await this.setShare(fileId, { isShared: true });
  }

  // ─── Глобальный поиск (по имени, сервер) ───

  searchAll(query: string) {
    return this.http.get<{ files: FileItem[]; folders: FolderItem[] }>(
      `${this.apiUrl}/file-system/search`,
      { params: { q: query }, withCredentials: true }
    ).pipe(
      catchError(err => this.handleError(err, 'Ошибка поиска')),
    );
  }

  // ─── Избранное ───

  loadStarred() {
    this._starredLoading.set(true);
    this.http.get<{ files: FileItem[]; folders: FolderItem[] }>(
      `${this.apiUrl}/file-system/starred`, { withCredentials: true }
    ).pipe(
      catchError(err => this.handleError(err, 'Не удалось загрузить избранное'))
    ).subscribe({
      next: (res) => {
        this._starredFiles.set(res?.files ?? []);
        this._starredFolders.set(res?.folders ?? []);
        this._starredLoading.set(false);
      },
      error: () => { this._starredLoading.set(false); },
    });
  }

  toggleStar(id: string, type: 'file' | 'folder') {
    return this.http.patch<{ isStarred: boolean }>(
      `${this.apiUrl}/file-system/star/${id}?type=${type}`, {}, { withCredentials: true }
    ).pipe(
      catchError(err => this.handleError(err, 'Не удалось изменить избранное')),
      tap((res) => {
        const starred = !!res?.isStarred;
        if (type === 'file') {
          this._files.update(files => files.map(f => (f.id === id ? { ...f, isStarred: starred } : f)));
          this._starredFiles.update(list =>
            starred ? list : list.filter(f => f.id !== id)
          );
        } else {
          this._folders.update(folders => folders.map(f => (f.id === id ? { ...f, isStarred: starred } : f)));
          this._starredFolders.update(list =>
            starred ? list : list.filter(f => f.id !== id)
          );
        }
        const selected = this._selectedItem();
        if (selected && selected.id === id) {
          this._selectedItem.set({ ...selected, isStarred: starred } as FileItem | FolderItem);
        }
        // если добавили в избранное и страница избранного открыта — подтянуть свежий список
        if (starred) this.loadStarred();
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
    const token = ++this._loadFilesToken;
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
    this._filesInFoldersCount.set(this.countFilesInTree(folders));
    if (folderId === null) this._rootFilesCount.set((files || []).length);
    if (token === this._loadFilesToken) {
      this._files.set(files || []);
    }
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