import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  OnInit,
  signal,
  ViewChild,
  computed,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinner } from 'primeng/progressspinner';
import { DialogModule } from 'primeng/dialog';
import { ThemeService } from '../../services/theme';
import { LangService } from '../../services/lang';
import { environment } from '../../../environments/environment';

@Component({
  selector:        'app-share-file',
  imports:         [CommonModule, ButtonModule, ProgressSpinner, RouterModule, DialogModule],
  templateUrl:     './share-file.html',
  styleUrl:        './share-file.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShareFile implements OnInit {
  @ViewChild('videoPlayer') videoPlayerRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('audioPlayer') audioPlayerRef?: ElementRef<HTMLAudioElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly http  = inject(HttpClient);
  private readonly cdr   = inject(ChangeDetectorRef);
  private readonly themeService  = inject(ThemeService);
  readonly         langService   = inject(LangService);
  private readonly apiUrl = environment.apiUrl;

  isDark = computed(() => this.themeService.theme() === 'dark');
  t      = computed(() => this.langService.t().pages.shareFile);

  errorKey = signal<'invalidLink' | 'notFound' | null>(null);
  errorMsg = computed(() => {
    const key = this.errorKey();
    if (!key) return null;
    const sf = this.t();
    return key === 'invalidLink' ? sf.errorInvalidLink : sf.errorNotFound;
  });

  fileData   = signal<any>(null);
  loading    = signal(true);
  linkCopied = signal(false);

  // Защита ссылки паролем / срок действия
  requiresPassword = signal(false);
  expired          = signal(false);
  passwordValue    = signal('');
  passwordError    = signal(false);
  verifying        = signal(false);
  private shareUsername = '';
  private shareFilename = '';
  private enteredPassword: string | null = null;

  isPlaying      = signal(false);
  isMuted        = signal(false);
  volume         = signal(1);
  progress       = signal(0);
  currentTimeStr = signal('0:00');
  durationStr    = signal('0:00');
  controlsHidden = signal(false);
  private controlsTimer: any;
  private rafId: any;

  audioDialogVisible = signal(false);
  audioUrl           = signal<string | null>(null);
  audioTitle         = signal('');
  audioIsPlaying     = signal(false);
  audioIsMuted       = signal(false);
  audioVolume        = signal(1);
  audioProgress      = signal(0);
  audioCurrentTime   = signal('0:00');
  audioDuration      = signal('0:00');
  private audioRafId: any;

  ngOnInit() {
    this.shareUsername = this.route.snapshot.paramMap.get('username') ?? '';
    this.shareFilename = this.route.snapshot.paramMap.get('filename') ?? '';

    if (!this.shareUsername || !this.shareFilename) {
      this.errorKey.set('invalidLink');
      this.loading.set(false);
      return;
    }
    this.fetchShare();
  }

  private fetchShare(password?: string) {
    this.loading.set(true);
    let url = `${this.apiUrl}/file-system/share/${this.shareUsername}/${this.shareFilename}`;
    if (password) url += `?password=${encodeURIComponent(password)}`;

    this.http.get<any>(url).subscribe({
      next: (response) => {
        if (response?.expired) {
          this.expired.set(true);
          this.requiresPassword.set(false);
        } else if (response?.requiresPassword && !response?.success) {
          if (password) this.passwordError.set(true); // отправляли пароль, но он неверный
          this.requiresPassword.set(true);
        } else if (response?.success && response?.data?.name) {
          this.enteredPassword = password ?? null;
          this.fileData.set(response.data);
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
    this.fetchShare(pwd);
  }


  isImage(mimeType: string):  boolean { return mimeType?.startsWith('image/') ?? false; }
  isVideo(mimeType: string):  boolean { return mimeType?.startsWith('video/') ?? false; }
  isPdf(mimeType: string):    boolean { return mimeType === 'application/pdf'; }
  isZip(mimeType: string):    boolean { return mimeType?.includes('zip') ?? false; }

  isAudio(mimeType: string, name?: string): boolean {
    if (mimeType?.startsWith('audio/')) return true;
    if (name) return /\.(mp3|wav|ogg|flac|aac|m4a|wma|opus)$/i.test(name);
    return false;
  }

  isDocument(mimeType: string): boolean {
    return (
      mimeType?.includes('word') || mimeType?.includes('document') ||
      mimeType?.includes('excel') || mimeType?.includes('spreadsheet') ||
      mimeType?.includes('powerpoint') || mimeType?.includes('presentation')
    );
  }

  getFileIcon(mimeType: string): string {
    if (mimeType?.startsWith('image/'))  return 'pi-image';
    if (mimeType === 'application/pdf')  return 'pi-file-pdf';
    if (mimeType?.includes('word'))      return 'pi-file-word';
    if (mimeType?.includes('excel'))     return 'pi-file-excel';
    if (mimeType?.startsWith('video/'))  return 'pi-video';
    if (mimeType?.startsWith('audio/'))  return 'pi-volume-up';
    if (mimeType?.includes('zip'))       return 'pi-box';
    return 'pi-file';
  }

  getFileExt(name: string): string {
    const parts = name?.split('.');
    return parts?.length > 1 ? '.' + parts[parts.length - 1].toUpperCase() : 'FILE';
  }

  getFileType(mimeType: string): string {
    const sf = this.langService.t().pages.shareFile;
    if (mimeType?.startsWith('image/'))  return sf.typeImage;
    if (mimeType?.startsWith('video/'))  return sf.typeVideo;
    if (mimeType?.startsWith('audio/'))  return sf.typeAudio;
    if (mimeType === 'application/pdf')  return 'PDF';
    if (mimeType?.includes('word'))      return 'Word';
    if (mimeType?.includes('excel'))     return 'Excel';
    if (mimeType?.includes('zip'))       return sf.typeZip;
    return sf.typeDoc;
  }

  formatSizeShort(size: string | number): string {
    const bytes = typeof size === 'string' ? parseInt(size, 10) : size;
    if (isNaN(bytes)) return '0';
    if (bytes < 1024)        return `${bytes}`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}`;
    if (bytes < 1024 ** 3)   return `${(bytes / 1024 ** 2).toFixed(1)}`;
    return `${(bytes / 1024 ** 3).toFixed(1)}`;
  }

  formatSizeFull(size: string | number): string {
    const bytes = typeof size === 'string' ? parseInt(size, 10) : size;
    const u = this.langService.t().pages.shareFile;
    if (isNaN(bytes)) return `0 ${u.unitB}`;
    if (bytes < 1024)        return `${bytes} ${u.unitB}`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${u.unitKB}`;
    if (bytes < 1024 ** 3)   return `${(bytes / 1024 ** 2).toFixed(1)} ${u.unitMB}`;
    return `${(bytes / 1024 ** 3).toFixed(1)} ${u.unitGB}`;
  }

  getSizeUnit(size: string | number): string {
    const bytes = typeof size === 'string' ? parseInt(size, 10) : size;
    const u = this.langService.t().pages.shareFile;
    if (isNaN(bytes))        return u.unitB;
    if (bytes < 1024)        return u.unitB;
    if (bytes < 1024 * 1024) return u.unitKB;
    if (bytes < 1024 ** 3)   return u.unitMB;
    return u.unitGB;
  }

  getFileKind(mimeType: string, name?: string): string {
    if (this.isImage(mimeType))         return 'image';
    if (this.isVideo(mimeType))         return 'video';
    if (this.isAudio(mimeType, name))   return 'audio';
    if (this.isPdf(mimeType))           return 'pdf';
    if (this.isZip(mimeType))           return 'zip';
    if (this.isDocument(mimeType))      return 'doc';
    return 'file';
  }

  copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      this.linkCopied.set(true);
      this.cdr.markForCheck();
      setTimeout(() => { this.linkCopied.set(false); this.cdr.markForCheck(); }, 1800);
    }).catch(() => {});
  }

  private formatTime(sec: number): string {
    if (!sec || isNaN(sec)) return '0:00';
    return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
  }

  downloadFile() {
      const data = this.fileData();
      if (!data?.name) return;
      const username = this.route.snapshot.paramMap.get('username') || 'user';
      const pwd = this.enteredPassword ? `?password=${encodeURIComponent(this.enteredPassword)}` : '';
      const url = `${this.apiUrl}/file-system/share/download/${username}/${encodeURIComponent(data.name)}${pwd}`;
      const link = document.createElement('a');
      link.href = url; link.download = data.name;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  }


  togglePlay() {
    const v = this.videoPlayerRef?.nativeElement;
    if (!v) return;
    if (v.paused) { v.play(); this.isPlaying.set(true); this.startLoop(); }
    else          { v.pause(); this.isPlaying.set(false); this.stopLoop(); }
  }

  toggleMute() {
    const v = this.videoPlayerRef?.nativeElement;
    if (!v) return;
    v.muted = !v.muted; this.isMuted.set(v.muted);
  }

  onVolumeChange(e: Event) {
    const v = this.videoPlayerRef?.nativeElement; if (!v) return;
    const input = e.target as HTMLInputElement;
    const val = parseFloat(input.value);
    v.volume = val; this.volume.set(val); this.isMuted.set(val === 0);
    input.style.setProperty('--volume-pct', `${val * 100}%`);
  }

  onTimeUpdate() {
    const v = this.videoPlayerRef?.nativeElement; if (!v) return;
    this.progress.set(v.duration ? (v.currentTime / v.duration) * 100 : 0);
    this.currentTimeStr.set(this.formatTime(v.currentTime));
  }

  onMetaLoaded() {
    const v = this.videoPlayerRef?.nativeElement; if (!v) return;
    this.durationStr.set(this.formatTime(v.duration));
  }

  onEnded() { this.isPlaying.set(false); this.progress.set(0); this.stopLoop(); }

  seek(e: MouseEvent) {
    const v = this.videoPlayerRef?.nativeElement;
    const bar = e.currentTarget as HTMLElement;
    if (!v || !bar) return;
    const r = bar.getBoundingClientRect();
    v.currentTime = ((e.clientX - r.left) / r.width) * v.duration;
  }

  toggleFullscreen() {
    const v = this.videoPlayerRef?.nativeElement; if (!v) return;
    const wrapper = v.parentElement as HTMLElement;
    document.fullscreenElement ? document.exitFullscreen() : wrapper.requestFullscreen();
  }

  onPlayerMouseMove() {
    this.controlsHidden.set(false);
    clearTimeout(this.controlsTimer);
    this.controlsTimer = setTimeout(() => { if (this.isPlaying()) this.controlsHidden.set(true); }, 2500);
  }

  onPlayerMouseLeave() {
    if (this.isPlaying()) {
      clearTimeout(this.controlsTimer);
      this.controlsTimer = setTimeout(() => { this.controlsHidden.set(true); }, 800);
    }
  }

  private startLoop() {
    this.stopLoop();
    const v = this.videoPlayerRef?.nativeElement; if (!v) return;
    const tick = () => {
      if (!v.paused && !v.ended) {
        this.progress.set(v.duration ? (v.currentTime / v.duration) * 100 : 0);
        this.currentTimeStr.set(this.formatTime(v.currentTime));
        this.rafId = requestAnimationFrame(tick);
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopLoop() {
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
  }


  openAudio() {
    const data = this.fileData();
    if (!data) return;
    this.audioUrl.set(data.downloadUrl ?? `${this.apiUrl}/file-system/share/download/${this.route.snapshot.paramMap.get('username')}/${encodeURIComponent(data.name)}`);
    this.audioTitle.set(data.name);
    this.audioIsPlaying.set(false);
    this.audioProgress.set(0);
    this.audioCurrentTime.set('0:00');
    this.audioDuration.set('0:00');
    this.audioDialogVisible.set(true);
    this.cdr.markForCheck();
  }

  closeAudio() {
    const audio = this.audioPlayerRef?.nativeElement;
    if (audio) { audio.pause(); audio.currentTime = 0; }
    this.audioIsPlaying.set(false);
    this.audioDialogVisible.set(false);
    this.audioUrl.set(null);
    this.stopAudioLoop();
    this.cdr.markForCheck();
  }

  toggleAudioPlay() {
    const audio = this.audioPlayerRef?.nativeElement; if (!audio) return;
    if (audio.paused) {
      audio.play(); this.audioIsPlaying.set(true); this.startAudioLoop();
    } else {
      audio.pause(); this.audioIsPlaying.set(false); this.stopAudioLoop();
    }
    this.cdr.markForCheck();
  }

  toggleAudioMute() {
    const audio = this.audioPlayerRef?.nativeElement; if (!audio) return;
    audio.muted = !audio.muted; this.audioIsMuted.set(audio.muted);
    this.cdr.markForCheck();
  }

  onAudioVolumeChange(event: Event) {
    const audio = this.audioPlayerRef?.nativeElement; if (!audio) return;
    const input = event.target as HTMLInputElement;
    const val   = parseFloat(input.value);
    audio.volume = val; this.audioVolume.set(val); this.audioIsMuted.set(val === 0);
    input.style.setProperty('--volume-pct', `${val * 100}%`);
    this.cdr.markForCheck();
  }

  onAudioMetaLoaded() {
    const audio = this.audioPlayerRef?.nativeElement; if (!audio) return;
    this.audioDuration.set(this.formatTime(audio.duration));
    this.cdr.markForCheck();
  }

  onAudioEnded() {
    this.audioIsPlaying.set(false); this.audioProgress.set(0);
    this.stopAudioLoop(); this.cdr.markForCheck();
  }

  seekAudio(event: MouseEvent) {
    const audio = this.audioPlayerRef?.nativeElement;
    const bar   = event.currentTarget as HTMLElement;
    if (!audio || !bar) return;
    const rect = bar.getBoundingClientRect();
    audio.currentTime = ((event.clientX - rect.left) / rect.width) * audio.duration;
    this.cdr.markForCheck();
  }

  private startAudioLoop() {
    this.stopAudioLoop();
    const audio = this.audioPlayerRef?.nativeElement; if (!audio) return;
    const tick = () => {
      if (!audio.paused && !audio.ended) {
        this.audioProgress.set(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
        this.audioCurrentTime.set(this.formatTime(audio.currentTime));
        this.cdr.markForCheck();
        this.audioRafId = requestAnimationFrame(tick);
      }
    };
    this.audioRafId = requestAnimationFrame(tick);
  }

  private stopAudioLoop() {
    if (this.audioRafId) { cancelAnimationFrame(this.audioRafId); this.audioRafId = null; }
  }
}