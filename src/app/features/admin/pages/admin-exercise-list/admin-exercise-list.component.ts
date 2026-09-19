import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ExerciseService } from '../../../exercises/services/exercise.service';

@Component({
  selector: 'app-admin-exercise-list',
  standalone: true,
  templateUrl: './admin-exercise-list.component.html',
  styleUrl: './admin-exercise-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminExerciseListComponent {
  private readonly exerciseService = inject(ExerciseService);

  protected readonly exercises$ = this.exerciseService.listAll();
}