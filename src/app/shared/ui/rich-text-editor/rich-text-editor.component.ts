import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  templateUrl: './rich-text-editor.component.html',
  styleUrl: './rich-text-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichTextEditorComponent {
  readonly value = input<string>('');
  readonly placeholder = input('');
  readonly disabled = input(false);
  readonly minHeight = input<number | null>(null);
}