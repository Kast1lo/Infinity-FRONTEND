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
 * Переиспользуемый аудио-плеер (обложка-пульс, эквалайзер, перемотка,
 * громкость, время). Тот же UX, что в файловом хранилище. Родитель
 * оборачивает его в свой диалог, передаёт `src`/`title`, закрытие — через (close).
 */
@Component({
  selector: 'app-audio-player',
  standalone: true,
  templateUrl: './audio-player.html',
  styleUrl: './audio-player.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AudioPlayer implements OnDestroy {
  private cdr = inject(ChangeDetectorRef);

  @Input() src: string | null = null;
  @Input() title = '';
  @Output() close = new EventEmitter<void>();

  @ViewChild('audioPlayer') audioPlayerRef?: ElementRef<HTMLAudioElement>;

  isPlaying = false;
  isMuted = false;
  volume = 1;
  progress = 0;
  currentTimeStr = '0:00';
  durationStr = '0:00';

  private rafId: number | null = null;

  ngOnDestroy() { this.stopLoop(); }

  emitClose() {
    const audio = this.audioPlayerRef?.nativeElement;
    if (audio) { audio.pause(); audio.currentTime = 0; }
    this.isPlaying = false;
    this.stopLoop();
    this.close.emit();
  }

  togglePlay() {
    const audio = this.audioPlayerRef?.nativeElement;
    if (!audio) return;
    if (audio.paused) { audio.play(); this.isPlaying = true; this.startLoop(); }
    else { audio.pause(); this.isPlaying = false; this.stopLoop(); }
    this.cdr.markForCheck();
  }

  toggleMute() {
    const audio = this.audioPlayerRef?.nativeElement; if (!audio) return;
    audio.muted = !audio.muted; this.isMuted = audio.muted; this.cdr.markForCheck();
  }

  onVolumeChange(event: Event) {
    const audio = this.audioPlayerRef?.nativeElement; if (!audio) return;
    const input = event.target as HTMLInputElement;
    const val = parseFloat(input.value);
    audio.volume = val; this.volume = val; this.isMuted = val === 0;
    input.style.setProperty('--volume-pct', `${val * 100}%`);
    this.cdr.markForCheck();
  }

  onMetaLoaded() {
    const audio = this.audioPlayerRef?.nativeElement; if (!audio) return;
    this.durationStr = this.formatTime(audio.duration);
    this.cdr.markForCheck();
  }

  onEnded() { this.isPlaying = false; this.progress = 0; this.stopLoop(); this.cdr.markForCheck(); }

  seek(event: MouseEvent) {
    const audio = this.audioPlayerRef?.nativeElement; const bar = event.currentTarget as HTMLElement;
    if (!audio || !bar) return;
    const rect = bar.getBoundingClientRect();
    audio.currentTime = ((event.clientX - rect.left) / rect.width) * audio.duration;
    this.cdr.markForCheck();
  }

  private startLoop() {
    this.stopLoop();
    const audio = this.audioPlayerRef?.nativeElement; if (!audio) return;
    const tick = () => {
      if (!audio.paused && !audio.ended) {
        this.progress = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
        this.currentTimeStr = this.formatTime(audio.currentTime);
        this.cdr.markForCheck();
        this.rafId = requestAnimationFrame(tick);
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopLoop() { if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; } }

  private formatTime(sec: number): string {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60); const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
