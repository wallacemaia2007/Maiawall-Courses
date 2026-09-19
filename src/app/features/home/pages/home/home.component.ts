import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

import { FeaturedCoursesComponent } from '../../components/featured-courses/featured-courses.component';
import { HeroComponent } from '../../components/hero/hero.component';
import { HomeCtaComponent } from '../../components/home-cta/home-cta.component';
import { LearningMethodComponent } from '../../components/learning-method/learning-method.component';
import { PlatformFeaturesComponent } from '../../components/platform-features/platform-features.component';

const PAGE_TITLE = 'Maiawall Cursos — Aprenda tecnologia na prática';
const PAGE_DESCRIPTION =
  'Aprenda tecnologia na prática com conteúdos objetivos, exercícios e projetos reais. Git, Docker, APIs e mais — do primeiro comando ao deploy.';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    HeroComponent,
    FeaturedCoursesComponent,
    LearningMethodComponent,
    PlatformFeaturesComponent,
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