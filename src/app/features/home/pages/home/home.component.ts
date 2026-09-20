import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

import { FeaturedCoursesComponent } from '../../components/featured-courses/featured-courses.component';
import { HeroComponent } from '../../components/hero/hero.component';
import { HomeCtaComponent } from '../../components/home-cta/home-cta.component';
import { LearningMethodComponent } from '../../components/learning-method/learning-method.component';

const PAGE_TITLE = 'Maiawall Cursos — Conteúdos dos cursos que ministrei';
const PAGE_DESCRIPTION =
  'Acervo dos cursos ministrados pela Maiawall, com capítulos, aulas e materiais para consulta. Crie uma conta apenas se quiser salvar seu progresso.';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    HeroComponent,
    FeaturedCoursesComponent,
    LearningMethodComponent,
    HomeCtaComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  ngOnInit(): void {
    this.title.setTitle(PAGE_TITLE);
    this.meta.updateTag({ name: 'description', content: PAGE_DESCRIPTION });
    this.meta.updateTag({ property: 'og:title', content: PAGE_TITLE });
    this.meta.updateTag({ property: 'og:description', content: PAGE_DESCRIPTION });
  }
}
