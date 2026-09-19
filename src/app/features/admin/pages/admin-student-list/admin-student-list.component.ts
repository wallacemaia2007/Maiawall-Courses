import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-admin-student-list',
  standalone: true,
  templateUrl: './admin-student-list.component.html',
  styleUrl: './admin-student-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminStudentListComponent {}