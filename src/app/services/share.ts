import { Injectable } from '@angular/core';
import { UserService } from './user-service';

@Injectable({
  providedIn: 'root'
})
export class ShareService {

  constructor(
    private userService: UserService
  ) {}

  private encodeForRoute(fileName: string): string {
    return encodeURIComponent(fileName.trim()).replace(/\./g, '%2E');
  }

  copyShareLink(fileName: string) {
    const profile = this.userService.profile();
    if (!profile || !profile.username) {
      return;
    }
    const shareUrl = `${window.location.origin}/share/${profile.username}/${this.encodeForRoute(fileName)}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
    }).catch(() => {
    });
  }

  copyDownloadLink(username: string, fileName: string) {
    const downloadUrl = `${window.location.origin}/share/download/${username}/${this.encodeForRoute(fileName)}`;
    navigator.clipboard.writeText(downloadUrl).then(() => {
    }).catch(() => {
      this.showError('Не удалось скопировать ссылку');
    });
  }

  private showError(message: string) {
  }
}