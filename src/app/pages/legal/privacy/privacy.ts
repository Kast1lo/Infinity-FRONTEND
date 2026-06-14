import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../../services/theme';

@Component({
  selector: 'app-privacy',
  imports: [RouterLink],
  templateUrl: './privacy.html',
  styleUrl: './privacy.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Privacy {
  private readonly themeService = inject(ThemeService);
  isDark = computed(() => this.themeService.theme() === 'dark');
}
