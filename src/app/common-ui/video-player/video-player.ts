import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  inject,
} from '@angular/core';

/**
 * Переиспользуемый видео-плеер с кастомными контролами (play/seek/громкость/
 * время/фуллскрин). Тот же UX, что в файловом хранилище. Родитель оборачивает
 * его в свой диалог и передаёт `src`/`title`, а закрытие ловит через (close).
 */
@Component({
  selector: 'app-video-player',
  standalone: true,
  templateUrl: './video-player.html',
  styleUrl: './video-player.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoPlayer implements OnDestroy {
  private cdr = inject(ChangeDetectorRef);

  @Input() src: string | null = null;
  @Input() title = '';
  @Output() close = new EventEmitter<void>();

  @ViewChild('videoPlayer') videoPlayerRef?: ElementRef<HTMLVideoElement>;

  isPlaying = false;
  isMuted = false;
  volume = 1;
  progress = 0;
  currentTimeStr = '0:00';
  durationStr = '0:00';
  controlsHidden = false;

  private controlsTimer: any;
  private rafId: number | null = null;

  ngOnDestroy() {
    clearTimeout(this.controlsTimer);
    this.stopProgressLoop();
  }

  emitClose() {
    const video = this.videoPlayerRef?.nativeElement;
    if (video) { video.pause(); video.currentTime = 0; }
    this.isPlaying = false;
    this.stopProgressLoop();
    clearTimeout(this.controlsTimer);
    this.close.emit();
  }

  togglePlay() {
    const video = this.videoPlayerRef?.nativeElement;
    if (!video) return;
    if (video.paused) { video.play(); this.isPlaying = true; this.startProgressLoop(); }
    else { video.pause(); this.isPlaying = false; this.stopProgressLoop(); }
    this.cdr.markForCheck();
  }

  toggleMute() {
    const video = this.videoPlayerRef?.nativeElement; if (!video) return;
    video.muted = !video.muted; this.isMuted = video.muted; this.cdr.markForCheck();
  }

  onVolumeChange(event: Event) {
    const video = this.videoPlayerRef?.nativeElement; if (!video) return;
    const input = event.target as HTMLInputElement;
    const val = parseFloat(input.value);
    video.volume = val; this.volume = val; this.isMuted = val === 0;
    input.style.setProperty('--volume-pct', `${val * 100}%`);
    this.cdr.markForCheck();
  }

  onMetaLoaded() {
    const video = this.videoPlayerRef?.nativeElement; if (!video) return;
    this.durationStr = this.formatTime(video.duration);
    video.play(); this.isPlaying = true; this.startProgressLoop();
    this.cdr.markForCheck();
  }

  onEnded() { this.isPlaying = false; this.progress = 0; this.stopProgressLoop(); this.cdr.markForCheck(); }

  seek(event: MouseEvent) {
    const video = this.videoPlayerRef?.nativeElement; const bar = event.currentTarget as HTMLElement;
    if (!video || !bar) return;
    const rect = bar.getBoundingClientRect();
    video.currentTime = ((event.clientX - rect.left) / rect.width) * video.duration;
  }

  toggleFullscreen() {
    const video = this.videoPlayerRef?.nativeElement; if (!video) return;
    document.fullscreenElement ? document.exitFullscreen() : video.requestFullscreen();
  }

  onPlayerMouseMove() {
    this.controlsHidden = false;
    this.cdr.markForCheck();
    clearTimeout(this.controlsTimer);
    this.controlsTimer = setTimeout(() => { if (this.isPlaying) { this.controlsHidden = true; this.cdr.markForCheck(); } }, 2500);
  }

  onPlayerMouseLeave() {
    if (this.isPlaying) {
      clearTimeout(this.controlsTimer);
      this.controlsTimer = setTimeout(() => { this.controlsHidden = true; this.cdr.markForCheck(); }, 800);
    }
  }

  private startProgressLoop() {
    this.stopProgressLoop();
    const video = this.videoPlayerRef?.nativeElement; if (!video) return;
    const tick = () => {
      if (!video.paused && !video.ended) {
        this.progress = video.duration ? (video.currentTime / video.duration) * 100 : 0;
        this.currentTimeStr = this.formatTime(video.currentTime);
        this.cdr.markForCheck();
        this.rafId = requestAnimationFrame(tick);
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopProgressLoop() { if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; } }

  private formatTime(sec: number): string {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60); const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
