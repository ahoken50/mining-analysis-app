import { Component, inject, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FirestoreService } from '../../../core/services/firestore.service';
import { PdfService } from '../../../core/services/pdf.service';
import { ToastService } from '../../../core/services/toast.service';
import { AiService } from '../../../core/services/ai.service';
import { Project } from '../../../models/project.model';
import * as L from 'leaflet';
import { Comments } from '../../collaboration/comments/comments';
import { ProjectHistory } from '../history/history';

@Component({
  selector: 'app-project-details',
  standalone: true,
  imports: [CommonModule, RouterLink, Comments, ProjectHistory],
  templateUrl: './project-details.html',
  styleUrl: './project-details.scss'
})
export class ProjectDetails implements OnInit {
  private route = inject(ActivatedRoute);
  private firestoreService = inject(FirestoreService);
  private pdfService = inject(PdfService);
  private toastService = inject(ToastService);
  private aiService = inject(AiService);

  project: Project | null = null;
  loading = true;
  analyzing = false;
  activeTab: 'overview' | 'map' | 'documents' | 'analysis' | 'history' = 'overview';

  private map: L.Map | undefined;

  ngOnInit() {
    const projectId = this.route.snapshot.paramMap.get('id');
    if (projectId) {
      this.loadProject(projectId);
    }
  }

  async loadProject(id: string) {
    try {
      this.project = await this.firestoreService.get('projects', id);
      // Migration/Fallback: Ensure status is at root if it was in metadata
      if (this.project && !this.project.status && (this.project.metadata as any).status) {
        this.project.status = (this.project.metadata as any).status;
      }
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      this.loading = false;
    }
  }

  async analyzeProject() {
    if (!this.project?.id) return;

    this.analyzing = true;
    try {
      this.toastService.show('Analyse IA lancée...', 'info');
      await this.aiService.analyzeProject(this.project.id);
      this.toastService.show('Analyse terminée avec succès !', 'success');
      // Reload project to get new analysis data
      await this.loadProject(this.project.id);
      this.activeTab = 'analysis';
    } catch (error) {
      console.error('Analysis failed:', error);
      this.toastService.show('Erreur lors de l\'analyse.', 'error');
    } finally {
      this.analyzing = false;
    }
  }

  setActiveTab(tab: 'overview' | 'map' | 'documents' | 'analysis' | 'history') {
    this.activeTab = tab;
    if (tab === 'map') {
      // Delay map init to allow DOM to render
      setTimeout(() => this.initMap(), 100);
    }
  }

  private initMap() {
    if (this.map) return; // Already initialized

    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    // Default to Quebec coordinates
    this.map = L.map('map').setView([52.0, -72.0], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Environmental Layers (WMS)
    // Example: Quebec Hydrography (Placeholder URL - replace with real MRNF WMS if available)
    const hydroLayer = L.tileLayer.wms('https://servicesmatriciels.mern.gouv.qc.ca/erg/services/wms', {
      layers: 'hydrographie',
      format: 'image/png',
      transparent: true,
      attribution: '© MRNF'
    });

    // Layer Control
    const baseMaps = {
      "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' })
    };

    const overlayMaps = {
      "Hydrographie": hydroLayer
    };

    L.control.layers(baseMaps, overlayMaps).addTo(this.map);

    // GIS: Marker Clustering
    // Note: In a real app, we would import 'leaflet.markercluster' css and js in angular.json
    // For this demo, we'll simulate the logic or use standard markers if plugin setup is complex without build config changes

    // GIS: Spatial Analysis Tools (Leaflet Draw)
    // We add a feature group to hold drawn items (zones, measurements)
    const drawnItems = new L.FeatureGroup();
    this.map.addLayer(drawnItems);

    // Custom Control for "Analysis Tools"
    const analysisControl = new L.Control({ position: 'topright' });

    analysisControl.onAdd = () => {
      const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
      div.style.backgroundColor = 'white';
      div.style.padding = '5px';
      div.style.cursor = 'pointer';
      div.innerHTML = '<b>📐 Outils d\'analyse</b>';
      div.onclick = () => {
        // Toggle draw control or show modal
        alert('Outil de mesure de distance et de surface activé (Simulation)');
        // In a full implementation, we would enable L.Draw.Polygon here
      };
      return div;
    };

    analysisControl.addTo(this.map);

    // Add markers from Analysis with custom icons based on type
    if (this.project?.analysis?.location_coords) {
      const coords = this.project.analysis.location_coords;
      const bounds = L.latLngBounds([]);

      coords.forEach((loc: any) => {
        if (loc.lat && loc.lng && this.map) {
          // Determine icon based on name/context (simple heuristic)
          let iconUrl = 'assets/marker-icon.png'; // Default
          if (loc.name.toLowerCase().includes('mine')) iconUrl = 'assets/mine-icon.png';
          else if (loc.name.toLowerCase().includes('lac') || loc.name.toLowerCase().includes('rivière')) iconUrl = 'assets/water-icon.png';

          // Simple marker for now, can be upgraded to custom icon
          L.marker([loc.lat, loc.lng])
            .addTo(this.map)
            .bindPopup(`<b>${loc.name}</b><br>${loc.formatted_address}<br><span class="badge">Lieu détecté</span>`);

          bounds.extend([loc.lat, loc.lng]);
        }
      });

      if (coords.length > 0 && bounds.isValid()) {
        this.map.fitBounds(bounds, { padding: [50, 50] });
      }
    }

    // Add a circular buffer zone example (Spatial Analysis)
    if (this.project?.analysis?.location_coords?.[0]) {
      const center = this.project.analysis.location_coords[0];
      L.circle([center.lat, center.lng], {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.2,
        radius: 5000 // 5km buffer
      }).addTo(this.map).bindPopup("Zone d'impact potentiel (5km)");
    }
  }

  exportPDF() {
    if (this.project) {
      this.pdfService.generateProjectReport(this.project);
    }
  }

  // Validation Workflow
  async updateStatus(status: 'APPROVED' | 'ANALYSIS_PENDING' | 'DRAFT' | 'REJECTED') {
    if (!this.project?.id) return;

    try {
      await this.firestoreService.update('projects', this.project.id, {
        'status': status
      });

      // Add history event
      // Note: In a real app, we would use a HistoryService to keep this clean
      // For now, we rely on the backend or direct firestore add if needed, 
      // but let's just update the local state and show a toast.

      this.project.status = status;
      this.toastService.show(`Statut mis à jour : ${status}`, 'success');

    } catch (error) {
      console.error('Error updating status:', error);
      this.toastService.show('Erreur lors de la mise à jour du statut', 'error');
    }
  }
}
