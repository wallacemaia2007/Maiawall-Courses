import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

import { COURSE_INSTRUCTOR } from '../../../../core/constants/instructor.data';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';

const PAGE_TITLE = 'Sobre o Wallace — Maiawall Cursos';
const PAGE_DESCRIPTION =
  'Conheça o Wallace, full-stack developer por trás da Maiawall Cursos. Angular, Spring Boot, Node.js/Express, AWS e Firebase na prática de projetos reais.';

@Component({
  selector: 'app-sobre',
  standalone: true,
  imports: [RouterLink, RevealDirective],
  templateUrl: './sobre.component.html',
  styleUrl: './sobre.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SobreComponent implements OnInit {
  protected readonly instructor = COURSE_INSTRUCTOR;

  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  ngOnInit(): void {
    this.title.setTitle(PAGE_TITLE);
    this.meta.updateTag({ name: 'description', content: PAGE_DESCRIPTION });
    this.meta.updateTag({ property: 'og:title', content: PAGE_TITLE });
    this.meta.updateTag({ property: 'og:description', content: PAGE_DESCRIPTION });
  }
}