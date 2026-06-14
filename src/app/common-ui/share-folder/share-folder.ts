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
import { ButtonModule } from 'primeng/button';
import { ProgressSpinner } from 'primeng/progressspinner';
import { ThemeService } from '../../services/theme';
import { LangService } from '../../services/lang';
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

@Component({
  selector:        'app-share-folder',
  imports:         [CommonModule, ButtonModule, ProgressSpinner, RouterModule],
  templateUrl:     './share-folder.html',
  styleUrl:        './share-folder.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShareFolder implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http  = inject(HttpClient);
  private readonly cdr   = inject(ChangeDetectorRef);
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
  folders    = signal<ShareFolderEntry[]>([]);
  files      = signal<ShareFileEntry[]>([]);
  // Относительный путь внутри расшаренной папки (имена подпапок)
  pathStack  = signal<string[]>([]);

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
          this.folders.set(response.data.folders ?? []);
          this.files.set(response.data.files ?? []);
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
