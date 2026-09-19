import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs';

import { ChapterService } from '../../services/chapter.service';

@Component({
  selector: 'app-course-chapter',
  standalone: true,
  templateUrl: './course-chapter.component.html',
  styleUrl: './course-chapter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseChapterComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly chapterService = inject(ChapterService);

  protected readonly chapter$ = this.route.paramMap.pipe(
    switchMap((params) => this.chapterService.getBySlug(params.get('chapterSlug') ?? '')),
  );
}