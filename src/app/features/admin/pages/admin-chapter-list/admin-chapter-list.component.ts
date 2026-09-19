import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ChapterService } from '../../../courses/services/chapter.service';

@Component({
  selector: 'app-admin-chapter-list',
  standalone: true,
  templateUrl: './admin-chapter-list.component.html',
  styleUrl: './admin-chapter-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminChapterListComponent {
  private readonly chapterService = inject(ChapterService);

  protected readonly chapters$ = this.chapterService.listAll();
}