import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';

import { COURSE_INSTRUCTOR } from '../../../../core/constants/instructor.data';
import { CourseQuestion } from '../../models/course-question.model';

/*
 * Carrossel de duvidas de um minicurso: cada slide mostra a pergunta do
 * aluno (foto, nome e data) seguida da resposta do instrutor, no formato
 * de mensagens — semelhante ao FAQ do curso, porem com identidade de quem
 * perguntou. Com uma unica duvida, os controles de navegacao somem e o
 * card fica estatico.
 */
@Component({
  selector: 'app-question-carousel',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './question-carousel.component.html',
  styleUrl: './question-carousel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionCarouselComponent {
  readonly questions = input.required<CourseQuestion[]>();

  protected readonly instructor = COURSE_INSTRUCTOR;
  protected readonly activeIndex = signal(0);
  protected readonly total = computed(() => this.questions().length);

  constructor() {
    effect(() => {
      const total = this.total();
      if (total > 0 && this.activeIndex() >= total) {
        this.activeIndex.set(0);
      }
    });
  }

  protected next(): void {
    const total = this.total();
    if (total < 2) return;
    this.activeIndex.set((this.activeIndex() + 1) % total);
  }

  protected prev(): void {
    const total = this.total();
    if (total < 2) return;
    this.activeIndex.set((this.activeIndex() - 1 + total) % total);
  }

  protected goTo(index: number): void {
    const total = this.total();
    if (total === 0) return;
    this.activeIndex.set(((index % total) + total) % total);
  }

  protected authorName(question: CourseQuestion): string {
    return question.author?.name?.trim() || question.authorName || 'Aluno';
  }

  protected authorAvatar(question: CourseQuestion): string | null {
    return question.author?.avatarUrl ?? null;
  }

  protected initials(name: string): string {
    return name.trim().slice(0, 1).toUpperCase() || '?';
  }
}
