import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs';

import { ChapterService } from '../../../courses/services/chapter.service';
import { ProgressService } from '../../services/progress.service';

@Component({
  selector: 'app-student-chapter',
  standalone: true,
  templateUrl: './student-chapter.component.html',
  styleUrl: './student-chapter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentChapterComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly chapterService = inject(ChapterService);
  private readonly progressService = inject(ProgressService);

  protected readonly chapter$ = this.route.paramMap.pipe(
    switchMap((params) => this.chapterService.getById(params.get('id') ?? '')),
  );

  protected readonly progress$ = this.route.paramMap.pipe(
    switchMap((params) => this.progressService.getChapterProgress(params.get('id') ?? '')),
  );
}