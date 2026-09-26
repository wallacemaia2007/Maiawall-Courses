import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CourseFaqItem } from '../../models/course.model';
import { CourseQuestion } from '../../models/course-question.model';
import { QuestionAskComponent } from '../question-ask/question-ask.component';
import { CourseQuestionService } from '../../services/course-question.service';

@Component({
  selector: 'app-course-faq',
  standalone: true,
  imports: [RouterLink, QuestionAskComponent],
  templateUrl: './course-faq.component.html',
  styleUrl: './course-faq.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseFaqComponent {
  private readonly questionService = inject(CourseQuestionService);

  readonly courseId = input.required<string>();
  readonly courseSlug = input.required<string>();
  readonly courseTitle = input('');
  readonly items = input<CourseFaqItem[]>([]);

  protected readonly askDescription =
    'Envie sua pergunta ao instrutor. Depois de respondida, ela poderá entrar neste FAQ.';

  protected readonly publishedQuestions = signal<CourseQuestion[]>([]);
  protected readonly loading = signal(true);

  constructor() {
    effect((onCleanup) => {
      const courseId = this.courseId();
      this.loading.set(true);
      const subscription = this.questionService.listPublished(courseId).subscribe({
        next: (questions) => {
          this.publishedQuestions.set(questions);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }
}
