import { Pipe, PipeTransform } from '@angular/core';

/*
 * Formata tamanho de arquivo em bytes (ex.: 3.4 MB, 12 KB).
 * Usado em anexos, uploads e downloads.
 */
@Pipe({
  name: 'fileSize',
  standalone: true,
})
export class FileSizePipe implements PipeTransform {
  private readonly units = ['B', 'KB', 'MB', 'GB', 'TB'];

  transform(bytes: number | null | undefined): string {
    if (bytes === null || bytes === undefined || bytes < 0) {
      return '';
    }

    if (bytes === 0) {
      return '0 B';
    }

    const index = Math.min(this.units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    const value = bytes / Math.pow(1024, index);

    return `${value.toFixed(index === 0 ? 0 : 1)} ${this.units[index]}`;
  }
}