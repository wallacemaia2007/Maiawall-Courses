import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { toApiError } from '../../../../core/models/api-error.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { QuestionAskComponent } from '../../components/question-ask/question-ask.component';
import { QuestionCarouselComponent } from '../../components/question-carousel/question-carousel.component';
import { CourseQuestionGroup } from '../../models/course-question.model';
import { CourseService } from '../../services/course.service';
import { CourseQuestionService } from '../../services/course-question.service';

const PAGE_TITLE = 'Dúvidas frequentes | Maiawall Cursos';
const PAGE_DESCRIPTION = 'Respostas destacadas para dúvidas frequentes dos minicursos do Maiawall.';

interface FeaturedQuestionsState {
  groups: CourseQuestionGroup[];
  loading: boolean;
  errorMessage: string;
}

@Component({
  selector: 'app-featured-questions',
  standalone: true,
  imports: [
    RouterLink,
    EmptyStateComponent,
    LoadingSpinnerComponent,
    QuestionAskComponent,
    QuestionCarouselComponent,
  ],
  templateUrl: './featured-questions.component.html',
  styleUrl: './featured-questions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturedQuestionsComponent implements OnInit {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly courseService = inject(CourseService);
  private readonly questionService = inject(CourseQuestionService);

  /* Lista de opcoes do campo "envie sua duvida" — a pagina junta varios
   * minicursos, entao o aluno precisa escolher em qual perguntar. */
  protected readonly courses = toSignal(
    this.courseService.list({ size: 100 }).pipe(
      map((page) => page.content),
      catchError(() => of([])),
    ),
    { initialValue: [] },
  );

  protected readonly state = toSignal(
    this.questionService.listFeaturedGroups().pipe(
      map((groups) => ({ groups, loading: false, errorMessage: '' })),
      catchError((error: unknown) =>
        of({
          groups: [],
          loading: false,
          errorMessage: toApiError(error).message,
        }),
      ),
    ),
    {
      initialValue: {
        groups: [],
        loading: true,
        errorMessage: '',
      } satisfies FeaturedQuestionsState,
    },
  );

  protected readonly totalQuestions = computed(() =>
    this.state().groups.reduce((total, group) => total + group.questions.length, 0),
  );

  ngOnInit(): void {
    this.title.setTitle(PAGE_TITLE);
    this.meta.updateTag({ name: 'description', content: PAGE_DESCRIPTION });
    this.meta.updateTag({ property: 'og:title', content: PAGE_TITLE });
    this.meta.updateTag({ property: 'og:description', content: PAGE_DESCRIPTION });
  }

  protected courseTone(category: string | null): string {
    return category || 'desenvolvimento';
  }
}
