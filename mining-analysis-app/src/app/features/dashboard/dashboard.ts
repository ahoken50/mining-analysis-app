import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FirestoreService } from '../../core/services/firestore.service';
import { Project } from '../../models/project.model';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private firestoreService = inject(FirestoreService);
  private authService = inject(AuthService);

  projects: Project[] = [];
  loading = true;

  ngOnInit() {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.loadProjects();
    }
  }

  async loadProjects() {
    try {
      this.projects = await this.firestoreService.getAll('projects');
      // Sort by date desc
      this.projects.sort((a, b) => {
        const dateA = a.metadata.receivedDate ? new Date(a.metadata.receivedDate).getTime() : 0;
        const dateB = b.metadata.receivedDate ? new Date(b.metadata.receivedDate).getTime() : 0;
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      this.loading = false;
    }
  }

  get pendingCount(): number {
    return this.projects.filter(p => p.status === 'ANALYSIS_PENDING' || p.status === 'DRAFT').length;
  }

  get approvedCount(): number {
    return this.projects.filter(p => p.status === 'APPROVED').length;
  }

  get analyzedCount(): number {
    return this.projects.filter(p => p.status === 'ANALYZED').length;
  }
}
