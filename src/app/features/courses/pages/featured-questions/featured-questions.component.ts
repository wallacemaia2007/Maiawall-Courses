import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { toApiError } from '../../../../core/models/api-error.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { QuestionCarouselComponent } from '../../components/question-carousel/question-carousel.component';
import { CourseQuestionGroup } from '../../models/course-question.model';
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
  imports: [RouterLink, EmptyStateComponent, LoadingSpinnerComponent, QuestionCarouselComponent],
  templateUrl: './featured-questions.component.html',
  styleUrl: './featured-questions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturedQuestionsComponent implements OnInit {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly questionService = inject(CourseQuestionService);

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
