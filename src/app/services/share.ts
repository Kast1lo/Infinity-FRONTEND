import { Injectable } from '@angular/core';
import { UserService } from './user-service';
import { environment } from '../../environments/environment.prod';


@Injectable({
  providedIn: 'root'
})
export class ShareService {

  private readonly apiUrl = environment.apiUrl;

  constructor(
    private userService: UserService
  ) {}

  copyShareLink(fileName: string) {
    const profile = this.userService.profile();
    if (!profile || !profile.username) {
      return;
    }
    const encodedFileName = encodeURIComponent(fileName.trim());
    const shareUrl = `${this.apiUrl}/file-system/share/${profile.username}/${encodedFileName}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
    }).catch(() => {
    });
  }

  copyDownloadLink(username: string, fileName: string) {
    const encodedFileName = encodeURIComponent(fileName.trim());
    const downloadUrl = `${this.apiUrl}/file-system/share/download/${username}/${encodedFileName}`;
    navigator.clipboard.writeText(downloadUrl).then(() => {
    }).catch(() => {
      this.showError('Не удалось скопировать ссылку');
    });
  }

  private showError(message: string) {
  }
  
}