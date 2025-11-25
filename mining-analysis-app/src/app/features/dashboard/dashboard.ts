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
      const rawProjects = await this.firestoreService.getAll('projects');
      this.projects = rawProjects.map((p: any) => {
        const data = p;
        // Convert Firestore Timestamps to Dates
        if (data.metadata?.receivedDate && typeof data.metadata.receivedDate.toDate === 'function') {
          data.metadata.receivedDate = data.metadata.receivedDate.toDate();
        } else if (data.metadata?.receivedDate) {
          data.metadata.receivedDate = new Date(data.metadata.receivedDate);
        }
        return data as Project;
      });

      // Sort by date desc
      this.projects.sort((a, b) => {
        const dateA = a.metadata.receivedDate ? a.metadata.receivedDate.getTime() : 0;
        const dateB = b.metadata.receivedDate ? b.metadata.receivedDate.getTime() : 0;
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
