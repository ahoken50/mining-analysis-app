import { Component, Input, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirestoreService } from '../../../core/services/firestore.service';
import { HistoryEvent } from '../../../models/history.model';
import { query, where, orderBy, getDocs } from '@angular/fire/firestore';

@Component({
  selector: 'app-project-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history.html',
  styleUrl: './history.scss'
})
export class ProjectHistory implements OnInit {
  @Input() projectId!: string;

  private firestoreService = inject(FirestoreService);
  historyEvents: HistoryEvent[] = [];
  loading = true;

  ngOnInit() {
    if (this.projectId) {
      this.loadHistory();
    }
  }

  async loadHistory() {
    try {
      const colRef = this.firestoreService.getCollectionRef('history');
      const q = query(colRef, where('projectId', '==', this.projectId), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);

      this.historyEvents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: (doc.data()['timestamp'] as any).toDate()
      } as HistoryEvent));
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      this.loading = false;
    }
  }

  getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      'CREATED': 'Dossier créé',
      'UPDATED': 'Mise à jour',
      'STATUS_CHANGE': 'Changement de statut',
      'FILE_UPLOAD': 'Fichier ajouté',
      'ANALYSIS_STARTED': 'Analyse lancée',
      'ANALYSIS_COMPLETED': 'Analyse terminée'
    };
    return labels[action] || action;
  }
}
