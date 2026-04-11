import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressSpinner } from 'primeng/progressspinner';

@Component({
  selector: 'app-share-file',
  imports: [CommonModule, ButtonModule, CardModule, ProgressSpinner, RouterModule],
  templateUrl: './share-file.html',
  styleUrl: './share-file.scss',
})
export class ShareFile implements OnInit {
  @ViewChild('videoPlayer') videoPlayerRef?: ElementRef<HTMLVideoElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly http  = inject(HttpClient);

  fileData = signal<any>(null);
  loading  = signal(true);
  error    = signal<string | null>(null);

  // ─── плеер ───
  isPlaying     = false;
  isMuted       = false;
  volume        = 1;
  progress      = 0;
  currentTimeStr = '0:00';
  durationStr    = '0:00';
  controlsHidden = false;
  private controlsTimer: any;
  private rafId: any;

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
        },
        error: () => {
          this.error.set('Файл не найден или ссылка недействительна');
          this.loading.set(false);
        }
      });
  }

  isImage(mimeType: string) { return mimeType?.startsWith('image/') ?? false; }
  isVideo(mimeType: string) { return mimeType?.startsWith('video/') ?? false; }

  getFileIcon(mimeType: string): string {
    if (mimeType?.startsWith('image/'))  return 'pi-image';
    if (mimeType === 'application/pdf')  return 'pi-file-pdf';
    if (mimeType?.includes('word'))      return 'pi-file-word';
    if (mimeType?.includes('excel'))     return 'pi-file-excel';
    if (mimeType?.startsWith('video/'))  return 'pi-video';
    return 'pi-file';
  }

  getFileExt(name: string): string {
    const parts = name?.split('.');
    return parts?.length > 1 ? '.' + parts[parts.length - 1].toUpperCase() : 'FILE';
  }

  getFileType(mimeType: string): string {
    if (mimeType?.startsWith('image/'))  return 'Изображение';
    if (mimeType?.startsWith('video/'))  return 'Видео';
    if (mimeType === 'application/pdf')  return 'PDF';
    if (mimeType?.includes('word'))      return 'Word';
    if (mimeType?.includes('excel'))     return 'Excel';
    return 'Документ';
  }

  formatSizeShort(size: string | number): string {
    const bytes = typeof size === 'string' ? parseInt(size, 10) : size;
    if (isNaN(bytes)) return '0';
    if (bytes < 1024)             return `${bytes}`;
    if (bytes < 1024 * 1024)      return `${(bytes / 1024).toFixed(1)}`;
    if (bytes < 1024**3)          return `${(bytes / 1024**2).toFixed(1)}`;
    return `${(bytes / 1024**3).toFixed(1)}`;
  }

  formatSizeFull(size: string | number): string {
    const bytes = typeof size === 'string' ? parseInt(size, 10) : size;
    if (isNaN(bytes)) return '0 Б';
    if (bytes < 1024)        return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    if (bytes < 1024**3)     return `${(bytes / 1024**2).toFixed(1)} МБ`;
    return `${(bytes / 1024**3).toFixed(1)} ГБ`;
  }

  formatSize(size: string | number): string { return this.formatSizeFull(size); }

  downloadFile() {
    const data = this.fileData();
    if (!data?.name) return;
    const url = `/file-system/share/download/${data.username || 'user'}/${encodeURIComponent(data.name)}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = data.name;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ─── видео плеер ───
  togglePlay() {
    const v = this.videoPlayerRef?.nativeElement;
    if (!v) return;
    if (v.paused) { v.play(); this.isPlaying = true; this.startLoop(); }
    else          { v.pause(); this.isPlaying = false; this.stopLoop(); }
  }

  toggleMute() {
    const v = this.videoPlayerRef?.nativeElement;
    if (!v) return;
    v.muted = !v.muted;
    this.isMuted = v.muted;
  }

  onVolumeChange(e: Event) {
    const v = this.videoPlayerRef?.nativeElement;
    if (!v) return;
    const val = parseFloat((e.target as HTMLInputElement).value);
    v.volume = val; this.volume = val; this.isMuted = val === 0;
  }

  onTimeUpdate() {
    const v = this.videoPlayerRef?.nativeElement;
    if (!v) return;
    this.progress = v.duration ? (v.currentTime / v.duration) * 100 : 0;
    this.currentTimeStr = this.fmt(v.currentTime);
  }

  onMetaLoaded() {
    const v = this.videoPlayerRef?.nativeElement;
    if (!v) return;
    this.durationStr = this.fmt(v.duration);
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
    const v = this.videoPlayerRef?.nativeElement;
    if (!v) return;
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
    const v = this.videoPlayerRef?.nativeElement;
    if (!v) return;
    const tick = () => {
      if (!v.paused && !v.ended) {
        this.progress = v.duration ? (v.currentTime / v.duration) * 100 : 0;
        this.currentTimeStr = this.fmt(v.currentTime);
        this.rafId = requestAnimationFrame(tick);
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopLoop() {
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
  }

  private fmt(sec: number): string {
    if (!sec || isNaN(sec)) return '0:00';
    return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
  }
}