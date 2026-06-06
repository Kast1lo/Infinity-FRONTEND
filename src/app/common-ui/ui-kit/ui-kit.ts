import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';

@Component({
  selector: 'app-ui-kit',
  imports: [ButtonModule, InputTextModule, TagModule, AvatarModule, BadgeModule],
  templateUrl: './ui-kit.html',
  styleUrl: './ui-kit.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiKit {
  readonly icons = [
    'pi-arrow-left', 'pi-chevron-right', 'pi-arrow-right-arrow-left', 'pi-home',
    'pi-check', 'pi-times', 'pi-trash', 'pi-pencil', 'pi-download', 'pi-upload',
    'pi-cloud-upload', 'pi-share-alt', 'pi-folder', 'pi-folder-open', 'pi-folder-plus',
    'pi-file-pdf', 'pi-box', 'pi-play', 'pi-pause', 'pi-volume-up', 'pi-volume-off',
    'pi-window-maximize', 'pi-user', 'pi-lock', 'pi-lock-open', 'pi-at', 'pi-envelope',
    'pi-camera', 'pi-search', 'pi-eye-slash', 'pi-bolt', 'pi-clock', 'pi-spinner',
    'pi-exclamation-triangle', 'pi-exclamation-circle', 'pi-shield', 'pi-infinity',
    'pi-ban', 'pi-ellipsis-v', 'pi-objects-column', 'pi-list-check', 'pi-tag',
    'pi-calendar', 'pi-plus', 'pi-moon', 'pi-sun', 'pi-sign-out', 'pi-user-edit',
  ];
}
