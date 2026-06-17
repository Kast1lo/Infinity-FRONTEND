import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinner } from 'primeng/progressspinner';
import { ThemeService } from '../../services/theme';
import { LangService } from '../../services/lang';
import { VideoPlayer } from '../video-player/video-player';
import { AudioPlayer } from '../audio-player/audio-player';
import { environment } from '../../../environments/environment';

interface ShareFolderEntry { id: string; name: string; }
interface ShareFileEntry {
  id: string;
  name: string;
  size: string;
  mimeType: string | null;
  createdAt: string;
  downloadUrl: string;
}
interface ShareOwner { name: string | null; avatarUrl: string | null; }

@Component({
  selector:        'app-share-folder',
  imports:         [CommonModule, ButtonModule, DialogModule, ProgressSpinner, RouterModule, VideoPlayer, AudioPlayer],
  templateUrl:     './share-folder.html',
  styleUrl:        './share-folder.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShareFolder implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http  = inject(HttpClient);
  private readonly cdr   = inject(ChangeDetectorRef);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly themeService = inject(ThemeService);
  readonly         langService  = inject(LangService);
  private readonly apiUrl = environment.apiUrl;

  isDark = computed(() => this.themeService.theme() === 'dark');
  t      = computed(() => this.langService.t().pages.shareFolder);

  errorKey = signal<'invalidLink' | 'notFound' | null>(null);
  errorMsg = computed(() => {
    const key = this.errorKey();
    if (!key) return null;
    const sf = this.t();
    return key === 'invalidLink' ? sf.errorInvalidLink : sf.errorNotFound;
  });

  loading    = signal(true);
  linkCopied = signal(false);

  rootName   = signal('');
  owner      = signal<ShareOwner | null>(null);
  folders    = signal<ShareFolderEntry[]>([]);
  files      = signal<ShareFileEntry[]>([]);
  // Относительный путь внутри расшаренной папки (имена подпапок)
  pathStack  = signal<string[]>([]);

  // Выделение файлов для массового скачивания
  selected = signal<Set<string>>(new Set());

  // Просмотр файла
  previewVisible = signal(false);
  previewKind    = signal<'image' | 'video' | 'audio' | 'pdf' | 'other'>('image');
  previewUrl     = signal<string | null>(null);
  previewSafeUrl = signal<SafeResourceUrl | null>(null);
  previewTitle   = signal('');

  requiresPassword = signal(false);
  expired          = signal(false);
  passwordValue    = signal('');
  passwordError    = signal(false);
  verifying        = signal(false);

  private slug = '';
  private enteredPassword: string | null = null;

  isEmpty = computed(() => this.folders().length === 0 && this.files().length === 0);

  ngOnInit() {
    this.slug = this.route.snapshot.paramMap.get('slug') ?? '';
    if (!this.slug) {
      this.errorKey.set('invalidLink');
      this.loading.set(false);
      return;
    }
    this.fetch();
  }

  private fetch(password?: string) {
    this.loading.set(true);
    let url = `${this.apiUrl}/file-system/share-folder/${this.slug}`;
    const params: string[] = [];
    const rel = this.pathStack().join('/');
    if (rel)      params.push(`path=${encodeURIComponent(rel)}`);
    const pwd = password ?? this.enteredPassword;
    if (pwd)      params.push(`password=${encodeURIComponent(pwd)}`);
    if (params.length) url += `?${params.join('&')}`;

    this.http.get<any>(url).subscribe({
      next: (response) => {
        if (response?.expired) {
          this.expired.set(true);
          this.requiresPassword.set(false);
        } else if (response?.requiresPassword && !response?.success) {
          if (password) this.passwordError.set(true);
          this.requiresPassword.set(true);
        } else if (response?.success && response?.data) {
          this.enteredPassword = pwd ?? null;
          this.rootName.set(response.data.rootName);
          this.owner.set(response.data.owner ?? null);
          this.folders.set(response.data.folders ?? []);
          this.files.set(response.data.files ?? []);
          this.selected.set(new Set());
          this.requiresPassword.set(false);
          this.expired.set(false);
        } else {
          this.errorKey.set('notFound');
        }
        this.loading.set(false);
        this.verifying.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorKey.set('notFound');
        this.loading.set(false);
        this.verifying.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  onPasswordInput(event: Event) {
    this.passwordValue.set((event.target as HTMLInputElement).value);
    this.passwordError.set(false);
  }

  submitPassword() {
    const pwd = this.passwordValue().trim();
    if (!pwd || this.verifying()) return;
    this.verifying.set(true);
    this.fetch(pwd);
  }

  openFolder(folder: ShareFolderEntry) {
    this.pathStack.update(stack => [...stack, folder.name]);
    this.fetch();
  }

  navigateToIndex(index: number) {
    // index = -1 → корень
    this.pathStack.update(stack => stack.slice(0, index + 1));
    this.fetch();
  }

  downloadAll() {
    let url = `${this.apiUrl}/file-system/share-folder/${this.slug}/download`;
    if (this.enteredPassword) url += `?password=${encodeURIComponent(this.enteredPassword)}`;
    const link = document.createElement('a');
    link.href = url;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  downloadFile(file: ShareFileEntry) {
    const link = document.createElement('a');
    link.href = file.downloadUrl;
    link.download = file.name;
    link.target = '_blank';
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Скачать конкретную подпапку ZIP-архивом (path = текущий путь + имя подпапки).
  downloadFolder(folder: ShareFolderEntry) {
    const rel = [...this.pathStack(), folder.name].join('/');
    let url = `${this.apiUrl}/file-system/share-folder/${this.slug}/download?path=${encodeURIComponent(rel)}`;
    if (this.enteredPassword) url += `&password=${encodeURIComponent(this.enteredPassword)}`;
    const link = document.createElement('a');
    link.href = url; link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ── Выделение ──
  isSelected(id: string) { return this.selected().has(id); }
  toggleSelect(id: string, event?: Event) {
    event?.stopPropagation();
    const set = new Set(this.selected());
    set.has(id) ? set.delete(id) : set.add(id);
    this.selected.set(set);
  }
  clearSelection() { this.selected.set(new Set()); }
  selectedCount = computed(() => this.selected().size);
  allSelected = computed(() => this.files().length > 0 && this.selected().size >= this.files().length);
  toggleSelectAll() {
    if (this.allSelected()) { this.clearSelection(); return; }
    this.selected.set(new Set(this.files().map(f => f.id)));
  }
  downloadSelected() {
    const ids = this.selected();
    this.files().filter(f => ids.has(f.id)).forEach(f => this.downloadFile(f));
  }

  // ── Просмотр файла ──
  isVideo(m: string | null): boolean { return m?.startsWith('video/') ?? false; }
  isAudio(m: string | null, name = ''): boolean {
    return (m?.startsWith('audio/') ?? false) || /\.(mp3|wav|ogg|flac|aac|m4a|opus)$/i.test(name);
  }
  isPdf(m: string | null, name = ''): boolean {
    return m === 'application/pdf' || /\.pdf$/i.test(name);
  }
  canPreview(file: ShareFileEntry): boolean {
    return this.isImage(file.mimeType) || this.isVideo(file.mimeType)
      || this.isAudio(file.mimeType, file.name) || this.isPdf(file.mimeType, file.name);
  }

  onFileClick(file: ShareFileEntry) {
    if (this.canPreview(file)) this.openPreview(file);
    else this.downloadFile(file);
  }

  openPreview(file: ShareFileEntry) {
    const kind = this.isImage(file.mimeType) ? 'image'
      : this.isVideo(file.mimeType) ? 'video'
      : this.isAudio(file.mimeType, file.name) ? 'audio'
      : this.isPdf(file.mimeType, file.name) ? 'pdf'
      : 'other';
    this.previewKind.set(kind);
    this.previewUrl.set(file.downloadUrl);
    this.previewSafeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(file.downloadUrl));
    this.previewTitle.set(file.name);
    this.previewVisible.set(true);
  }
  closePreview() {
    this.previewVisible.set(false);
    this.previewUrl.set(null);
    this.previewSafeUrl.set(null);
  }

  ownerInitials(name: string | null): string {
    return (name ?? '').substring(0, 2).toUpperCase() || '∞';
  }

  copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      this.linkCopied.set(true);
      this.cdr.markForCheck();
      setTimeout(() => { this.linkCopied.set(false); this.cdr.markForCheck(); }, 1800);
    }).catch(() => {});
  }

  isImage(mimeType: string | null): boolean { return mimeType?.startsWith('image/') ?? false; }

  getFileIcon(mimeType: string | null): string {
    const m = mimeType ?? '';
    if (m.startsWith('image/'))  return 'pi-image';
    if (m === 'application/pdf') return 'pi-file-pdf';
    if (m.includes('word') || m.includes('document'))   return 'pi-file-word';
    if (m.includes('excel') || m.includes('spreadsheet')) return 'pi-file-excel';
    if (m.startsWith('video/'))  return 'pi-video';
    if (m.startsWith('audio/'))  return 'pi-volume-up';
    if (m.includes('zip'))       return 'pi-box';
    return 'pi-file';
  }

  formatSize(size: string): string {
    const bytes = parseInt(size, 10);
    const u = this.t();
    if (isNaN(bytes)) return `0 ${u.unitB}`;
    if (bytes < 1024)        return `${bytes} ${u.unitB}`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${u.unitKB}`;
    if (bytes < 1024 ** 3)   return `${(bytes / 1024 ** 2).toFixed(1)} ${u.unitMB}`;
    return `${(bytes / 1024 ** 3).toFixed(1)} ${u.unitGB}`;
  }
}
