import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileUploadComponent {
  readonly accept = input<string>('');
  readonly multiple = input(false);
  readonly label = input('Anexar arquivo');
  readonly maxSizeBytes = input<number | null>(null);
  readonly readonly = input(false);
  readonly files = input<File[]>([]);
}