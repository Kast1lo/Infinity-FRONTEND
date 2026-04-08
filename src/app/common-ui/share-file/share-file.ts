import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressSpinner } from "primeng/progressspinner";

@Component({
  selector: 'app-share-file',
  imports: [CommonModule, ButtonModule, CardModule, ProgressSpinner],
  templateUrl: './share-file.html',
  styleUrl: './share-file.scss',
})
export class ShareFile implements OnInit {

  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);

  fileData = signal<any>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit() {
    const username = this.route.snapshot.paramMap.get('username');
    const filename = this.route.snapshot.paramMap.get('filename');

    console.log('Share page opened with:', { username, filename });

    if (!username || !filename) {
      this.error.set('Неверная ссылка');
      this.loading.set(false);
      return;
    }

    this.http.get<any>(`/file-system/share/${username}/${filename}`)
      .subscribe({
        next: (response) => {
          console.log('✅ Ответ от share:', response);

          if (response.success && response.data) {
            this.fileData.set(response.data);
          } else {
            this.fileData.set(response);
          }

          this.loading.set(false);
        },
        error: (err) => {
          console.error('❌ Ошибка при загрузке файла:', err);
          this.error.set('Файл не найден или ссылка недействительна');
          this.loading.set(false);
        }
      });
  }

  isImage(mimeType: string): boolean {
    return mimeType?.startsWith('image/') || false;
  }

  formatSize(size: string | number): string {
    const bytes = typeof size === 'string' ? parseInt(size, 10) : size;
    if (isNaN(bytes)) return '0 Б';

    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} ГБ`;
  }

  downloadFile() {
  const data = this.fileData();
  if (!data?.name) {
    alert('Не удалось получить имя файла');
    return;
  }

  const downloadUrl = `/file-system/share/download/${data.username || 'Kastilo'}/${encodeURIComponent(data.name)}`;

  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = data.name;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

}