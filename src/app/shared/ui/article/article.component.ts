import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  input,
  output,
  signal,
} from '@angular/core';

import { Attachment } from '../../../core/models/attachment.model';
import { LessonImage } from '../../../features/courses/models/course.model';

@Component({
  selector: 'app-article',
  standalone: true,
  templateUrl: './article.component.html',
  styleUrl: './article.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleComponent implements OnDestroy {
  readonly title = input.required<string>();
  readonly order = input<number>();
  readonly kind = input<string>('');
  readonly content = input<string>();
  readonly image = input<LessonImage>();
  readonly attachments = input<Attachment[]>();

  readonly checkable = input(false);
  readonly marked = input(false);
  readonly checked = output<void>();

  protected readonly lightboxOpen = signal(false);

  protected openLightbox(): void {
    this.lightboxOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  protected closeLightbox(): void {
    if (!this.lightboxOpen()) {
      return;
    }
    this.lightboxOpen.set(false);
    document.body.style.overflow = '';
  }

  @HostListener('window:keydown.escape')
  protected onEscapeKeydown(): void {
    this.closeLightbox();
  }

  ngOnDestroy(): void {
    if (this.lightboxOpen()) {
      document.body.style.overflow = '';
    }
  }
}