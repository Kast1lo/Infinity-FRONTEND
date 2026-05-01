import { computed, inject, Injectable, signal } from '@angular/core';
import { FileSystem } from './file-system';

export interface UploadQueueItem {
  id: string;
  file: File;
  previewUrl: string | null;
}

const TOTAL_LIMIT_BYTES = 100 * 1024 * 1024;

@Injectable({ providedIn: 'root' })
export class UploadQueueService {
  private fs = inject(FileSystem);

  readonly limitFormatted = '100 МБ';

  private _queue   = signal<UploadQueueItem[]>([]);
  private _visible = signal(false);

  readonly queue   = this._queue.asReadonly();
  readonly visible = this._visible.asReadonly();

  readonly totalSize = computed(() =>
    this._queue().reduce((sum, i) => sum + i.file.size, 0)
  );

  readonly limitExceeded = computed(() => this.totalSize() > TOTAL_LIMIT_BYTES);

  readonly canConfirm = computed(() =>
    this._queue().length > 0 && !this.limitExceeded()
  );

  setVisible(v: boolean) {
    this._visible.set(v);
  }

  open(files: File[] | FileList) {
    this.revokeAll();
    const arr = Array.from(files);
    if (arr.length === 0) return;
    const items: UploadQueueItem[] = arr.map((file, idx) => ({
      id: `${Date.now()}-${idx}-${file.name}`,
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));
    this._queue.set(items);
    this._visible.set(true);
  }

  remove(id: string) {
    const items = this._queue();
    const item = items.find(i => i.id === id);
    if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
    this._queue.set(items.filter(i => i.id !== id));
  }

  cancel() {
    this.reset();
    this._visible.set(false);
  }

  confirm(folderId: string | null): { count: number } | null {
    if (!this.canConfirm()) return null;
    const files = this._queue().map(i => i.file);
    const count = files.length;
    this.fs.uploadFiles(files, folderId);
    this.reset();
    this._visible.set(false);
    return { count };
  }

  onHidden() {
    this.reset();
  }

  formatSize(bytes: number): string {
    if (bytes < 1024)               return `${bytes} Б`;
    if (bytes < 1024 * 1024)        return `${(bytes / 1024).toFixed(1)} КБ`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} ГБ`;
  }

  getFileIcon(file: File): string {
    const m = file.type;
    const n = file.name.toLowerCase();
    if (m.startsWith('image/'))    return 'pi-image';
    if (m.startsWith('video/'))    return 'pi-video';
    if (m.startsWith('audio/') || /\.(mp3|wav|ogg|flac|aac|m4a|wma|opus)$/.test(n)) return 'pi-volume-up';
    if (m === 'application/pdf')   return 'pi-file-pdf';
    if (m.includes('word')      || m.includes('document'))      return 'pi-file-word';
    if (m.includes('excel')     || m.includes('spreadsheet'))   return 'pi-file-excel';
    if (m.includes('powerpoint') || m.includes('presentation')) return 'pi-file';
    if (n.endsWith('.zip') || n.endsWith('.rar') ||
        n.endsWith('.7z')  || n.endsWith('.tar') || n.endsWith('.gz')) return 'pi-box';
    return 'pi-file';
  }

  pluralFile(n: number): string {
    const last    = n % 10;
    const lastTwo = n % 100;
    if (lastTwo >= 11 && lastTwo <= 14) return 'файлов';
    if (last === 1)             return 'файл';
    if (last >= 2 && last <= 4) return 'файла';
    return 'файлов';
  }

  private reset() {
    this.revokeAll();
    this._queue.set([]);
  }

  private revokeAll() {
    for (const item of this._queue()) {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    }
  }
}
