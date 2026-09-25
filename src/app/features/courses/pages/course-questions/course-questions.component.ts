import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, Observable, of, switchMap } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

import { toApiError } from '../../../../core/models/api-error.model';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { CourseDetail } from '../../models/course.model';
import { CourseQuestion } from '../../models/course-question.model';
import { CourseService } from '../../services/course.service';
import { CourseQuestionService } from '../../services/course-question.service';

interface CourseQuestionsState {
  course: CourseDetail | null;
  questions: CourseQuestion[];
  loading: boolean;
  errorMessage: string;
}

@Component({
  selector: 'app-course-questions',
  standalone: true,
  imports: [DatePipe, RouterLink, LoadingSpinnerComponent],
  templateUrl: './course-questions.component.html',
  styleUrl: './course-questions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseQuestionsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly courseService = inject(CourseService);
  private readonly questionService = inject(CourseQuestionService);

  protected readonly state = toSignal(
    this.route.paramMap.pipe(
      switchMap(
        (params): Observable<CourseQuestionsState> => {
          const slug = params.get('slug') ?? '';
          return this.courseService.getBySlug(slug).pipe(
            switchMap((course) => {
              if (!course) {
                return of({
                  course: null,
                  questions: [] as CourseQuestion[],
                  loading: false,
                  errorMessage: 'Curso não encontrado.',
                } satisfies CourseQuestionsState);
              }
              return this.questionService.listFeatured(course.id).pipe(
                map(
                  (questions) =>
                    ({
                      course,
                      questions,
                      loading: false,
                      errorMessage: '',
                    }) satisfies CourseQuestionsState,
                ),
                catchError((error: unknown) =>
                  of({
                    course,
                    questions: [] as CourseQuestion[],
                    loading: false,
                    errorMessage: toApiError(error).message,
                  } satisfies CourseQuestionsState),
                ),
              );
            }),
            catchError((error: unknown) =>
              of({
                course: null,
                questions: [] as CourseQuestion[],
                loading: false,
                errorMessage: toApiError(error).message,
              } satisfies CourseQuestionsState),
            ),
          );
        },
      ),
    ),
    {
      initialValue: {
        course: null,
        questions: [],
        loading: true,
        errorMessage: '',
      } satisfies CourseQuestionsState,
    },
  );
}