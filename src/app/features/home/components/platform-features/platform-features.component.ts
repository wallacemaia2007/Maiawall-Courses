import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { RevealDirective } from '../../../../shared/directives/reveal.directive';
import { SectionHeadComponent } from '../section-head/section-head.component';

type FeatureIcon = 'stack' | 'code' | 'folder' | 'chart' | 'award' | 'users';

interface PlatformFeature {
  icon: FeatureIcon;
  title: string;
  description: string;
}

@Component({
  selector: 'app-platform-features',
  standalone: true,
  imports: [RevealDirective, SectionHeadComponent],
  templateUrl: './platform-features.component.html',
  styleUrl: './platform-features.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlatformFeaturesComponent {
  protected readonly features = signal<PlatformFeature[]>([
    {
      icon: 'stack',
      title: 'Cursos estruturados',
      description:
        'Siga uma trilha clara, do fundamento ao avançado, sabendo o que vem depois.',
    },
    {
      icon: 'code',
      title: 'Exercícios práticos',
      description:
        'Resolva desafios próximos do trabalho real e valide o conteúdo enquanto aprende.',
    },
    {
      icon: 'folder',
      title: 'Materiais de apoio',
      description:
        'Consulte arquivos, exemplos e resumos das aulas sempre que precisar revisar.',
    },
    {
      icon: 'chart',
      title: 'Acompanhe seu progresso',
      description:
        'Veja onde parou, o que concluiu e qual é o próximo passo da sua trilha.',
    },
    {
      icon: 'award',
      title: 'Certificados',
      description:
        'Registre cada conclusão e compartilhe os conhecimentos que conquistou.',
    },
    {
      icon: 'users',
      title: 'Comunidade',
      description:
        'Troque experiências, dúvidas e soluções com quem também está construindo.',
    },
  ]);
}
