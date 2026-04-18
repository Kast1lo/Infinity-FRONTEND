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
  private readonly themeService = inject(ThemeService);

  isDark = computed(() => this.themeService.theme() === 'dark');

  fileData = signal<any>(null);
  loading  = signal(true);
  error    = signal<string | null>(null);

  // ─── Видео плеер ───
  isPlaying      = false;
  isMuted        = false;
  volume         = 1;
  progress       = 0;
  currentTimeStr = '0:00';
  durationStr    = '0:00';
  controlsHidden = false;
  private controlsTimer: any;
  private rafId: any;

  // ─── Аудио плеер ───
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
    const username = this.route.snapshot.paramMap.get('username');
    const filename  = this.route.snapshot.paramMap.get('filename');

    if (!username || !filename) {
      this.error.set('Неверная ссылка');
      this.loading.set(false);
      return;
    }

    this.http.get<any>(`/file-system/share/${username}/${filename}`)
      .subscribe({
        next: (response) => {
          this.fileData.set(response.success && response.data ? response.data : response);
          this.loading.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.error.set('Файл не найден или ссылка недействительна');
          this.loading.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  // ─── Типы файлов ───

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
    if (mimeType?.startsWith('image/'))  return 'Изображение';
    if (mimeType?.startsWith('video/'))  return 'Видео';
    if (mimeType?.startsWith('audio/'))  return 'Аудио';
    if (mimeType === 'application/pdf')  return 'PDF';
    if (mimeType?.includes('word'))      return 'Word';
    if (mimeType?.includes('excel'))     return 'Excel';
    if (mimeType?.includes('zip'))       return 'Архив';
    return 'Документ';
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
    if (isNaN(bytes)) return '0 Б';
    if (bytes < 1024)        return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    if (bytes < 1024 ** 3)   return `${(bytes / 1024 ** 2).toFixed(1)} МБ`;
    return `${(bytes / 1024 ** 3).toFixed(1)} ГБ`;
  }

  private formatTime(sec: number): string {
    if (!sec || isNaN(sec)) return '0:00';
    return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
  }

  downloadFile() {
    const data = this.fileData();
    if (!data?.name) return;
    const url  = `/file-system/share/download/${data.username || 'user'}/${encodeURIComponent(data.name)}`;
    const link = document.createElement('a');
    link.href = url; link.download = data.name;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ─── Видео плеер ───

  togglePlay() {
    const v = this.videoPlayerRef?.nativeElement;
    if (!v) return;
    if (v.paused) { v.play(); this.isPlaying = true; this.startLoop(); }
    else          { v.pause(); this.isPlaying = false; this.stopLoop(); }
  }

  toggleMute() {
    const v = this.videoPlayerRef?.nativeElement;
    if (!v) return;
    v.muted = !v.muted; this.isMuted = v.muted;
  }

  onVolumeChange(e: Event) {
    const v = this.videoPlayerRef?.nativeElement; if (!v) return;
    const val = parseFloat((e.target as HTMLInputElement).value);
    v.volume = val; this.volume = val; this.isMuted = val === 0;
  }

  onTimeUpdate() {
    const v = this.videoPlayerRef?.nativeElement; if (!v) return;
    this.progress = v.duration ? (v.currentTime / v.duration) * 100 : 0;
    this.currentTimeStr = this.formatTime(v.currentTime);
  }

  onMetaLoaded() {
    const v = this.videoPlayerRef?.nativeElement; if (!v) return;
    this.durationStr = this.formatTime(v.duration);
  }

  onEnded() { this.isPlaying = false; this.progress = 0; this.stopLoop(); }

  seek(e: MouseEvent) {
    const v = this.videoPlayerRef?.nativeElement;
    const bar = e.currentTarget as HTMLElement;
    if (!v || !bar) return;
    const r = bar.getBoundingClientRect();
    v.currentTime = ((e.clientX - r.left) / r.width) * v.duration;
  }

  toggleFullscreen() {
    const v = this.videoPlayerRef?.nativeElement; if (!v) return;
    document.fullscreenElement ? document.exitFullscreen() : v.requestFullscreen();
  }

  onPlayerMouseMove() {
    this.controlsHidden = false;
    clearTimeout(this.controlsTimer);
    this.controlsTimer = setTimeout(() => { if (this.isPlaying) this.controlsHidden = true; }, 2500);
  }

  onPlayerMouseLeave() {
    if (this.isPlaying) {
      clearTimeout(this.controlsTimer);
      this.controlsTimer = setTimeout(() => { this.controlsHidden = true; }, 800);
    }
  }

  private startLoop() {
    this.stopLoop();
    const v = this.videoPlayerRef?.nativeElement; if (!v) return;
    const tick = () => {
      if (!v.paused && !v.ended) {
        this.progress = v.duration ? (v.currentTime / v.duration) * 100 : 0;
        this.currentTimeStr = this.formatTime(v.currentTime);
        this.cdr.markForCheck();
        this.rafId = requestAnimationFrame(tick);
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopLoop() {
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
  }

  // ─── Аудио плеер ───

  openAudio() {
    const data = this.fileData();
    if (!data) return;
    this.audioUrl.set(data.downloadUrl ?? `/file-system/share/stream/${data.username}/${encodeURIComponent(data.name)}`);
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