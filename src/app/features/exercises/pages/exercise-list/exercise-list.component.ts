import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ExerciseService } from '../../services/exercise.service';

@Component({
  selector: 'app-exercise-list',
  standalone: true,
  templateUrl: './exercise-list.component.html',
  styleUrl: './exercise-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseListComponent {
  private readonly exerciseService = inject(ExerciseService);

  protected readonly exercises$ = this.exerciseService.listMine();
}