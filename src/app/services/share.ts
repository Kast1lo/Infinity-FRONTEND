import { Injectable } from '@angular/core';
import { UserService } from './user-service';


@Injectable({
  providedIn: 'root'
})
export class ShareService {

  private apiUrl = 'http://localhost:4400/share';

  constructor(
    private userService: UserService
  ) {}

  copyShareLink(fileName: string) {
    const profile = this.userService.profile();
    if (!profile || !profile.username) {
      return;
    }
    const encodedFileName = encodeURIComponent(fileName.trim());
    const shareUrl = `${this.apiUrl}/${profile.username}/${encodedFileName}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
    }).catch(() => {
    });
  }

  copyDownloadLink(username: string, fileName: string) {
    const encodedFileName = encodeURIComponent(fileName.trim());
    const downloadUrl = `${this.apiUrl}/download/${username}/${encodedFileName}`;
    navigator.clipboard.writeText(downloadUrl).then(() => {
    }).catch(() => {
      this.showError('Не удалось скопировать ссылку');
    });
  }

  private showError(message: string) {
  }
  
}