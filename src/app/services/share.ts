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

  async copyShareLink(fileName: string): Promise<void> {
    const profile = this.userService.profile();
    if (!profile?.username) throw new Error('Профиль не загружен');
    const shareUrl = `${window.location.origin}/share/${profile.username}/${this.encodeForRoute(fileName)}`;
    await navigator.clipboard.writeText(shareUrl);
  }

  async copyDownloadLink(username: string, fileName: string): Promise<void> {
    const downloadUrl = `${window.location.origin}/share/download/${username}/${this.encodeForRoute(fileName)}`;
    await navigator.clipboard.writeText(downloadUrl);
  }

  folderShareUrl(slug: string): string {
    return `${window.location.origin}/share-folder/${slug}`;
  }

  async copyFolderShareLink(slug: string): Promise<void> {
    await navigator.clipboard.writeText(this.folderShareUrl(slug));
  }
}