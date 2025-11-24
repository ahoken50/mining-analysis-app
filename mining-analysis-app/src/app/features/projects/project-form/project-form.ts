import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FirestoreService } from '../../../core/services/firestore.service';
import { StorageService } from '../../../core/services/storage.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './project-form.html',
  styleUrl: './project-form.scss'
})
export class ProjectForm implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private firestoreService = inject(FirestoreService);
  private storageService = inject(StorageService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  isSubmitting = false;
  isEditMode = false;
  projectId: string | null = null;
  currentStep = ''; // Pour afficher l'étape en cours
  uploadProgress = ''; // Pour afficher la progression de l'upload

  projectForm: FormGroup = this.fb.group({
    title: ['', Validators.required],
    sender: ['', Validators.required],
    receivedDate: [new Date().toISOString().substring(0, 10), Validators.required],
    emailContent: ['', Validators.required],
    files: [null]
  });

  selectedFiles: File[] = [];

  ngOnInit() {
    console.log('[ProjectForm] Component initialized');
    this.projectId = this.route.snapshot.paramMap.get('id');
    if (this.projectId) {
      this.isEditMode = true;
      console.log('[ProjectForm] Edit mode for project:', this.projectId);
      this.loadProject(this.projectId);
    } else {
      console.log('[ProjectForm] Create mode');
    }
  }

  async loadProject(id: string) {
    try {
      console.log('[ProjectForm] Loading project:', id);
      const project = await this.firestoreService.get('projects', id);
      if (project) {
        this.projectForm.patchValue({
          title: project.metadata.title,
          sender: project.metadata.sender,
          receivedDate: new Date(project.metadata.receivedDate).toISOString().substring(0, 10),
          emailContent: project.metadata.emailContent
        });
        console.log('[ProjectForm] ✓ Project loaded successfully');
      }
    } catch (error) {
      console.error('[ProjectForm] ✗ Error loading project:', error);
      this.toastService.error('Erreur lors du chargement du projet', this.getErrorMessage(error));
    }
  }

  onFileSelected(event: any) {
    if (event.target.files) {
      this.selectedFiles = Array.from(event.target.files);
      console.log('[ProjectForm] Files selected:', this.selectedFiles.length, 'files');
      this.selectedFiles.forEach((file: File, index) => {
        console.log(`  [${index + 1}] ${file.name} - ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      });
    }
  }

  async onSubmit() {
    if (this.projectForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      this.currentStep = 'Démarrage...';
      console.log('[ProjectForm] ═══════════════════════════════════════');
      console.log('[ProjectForm] Starting project submission');
      console.log('[ProjectForm] Form data:', this.projectForm.value);
      console.log('[ProjectForm] Files to upload:', this.selectedFiles.length);
      console.log('[ProjectForm] ═══════════════════════════════════════');

      try {
        const formData = this.projectForm.value;

        // Vérifier l'authentification
        this.currentStep = 'Vérification de l\'authentification...';
        console.log('[ProjectForm] Checking authentication...');
        const currentUser = this.authService.getCurrentUser();

        if (!currentUser) {
          console.warn('[ProjectForm] ⚠ User not authenticated, redirecting to login');
          this.toastService.warning('Vous devez être connecté pour créer un dossier');

          // Rediriger vers login avec returnUrl
          const returnUrl = this.isEditMode ? `/projects/${this.projectId}/edit` : '/projects/new';
          this.router.navigate(['/login'], {
            queryParams: { returnUrl }
          });

          this.isSubmitting = false;
          this.currentStep = '';
          return;
        }
        console.log('[ProjectForm] ✓ User authenticated:', currentUser.uid);

        if (this.isEditMode && this.projectId) {
          console.log('[ProjectForm] ─── UPDATE MODE ───');
          this.currentStep = 'Mise à jour du projet...';

          // UPDATE
          await this.firestoreService.update('projects', this.projectId, {
            'metadata.title': formData.title,
            'metadata.sender': formData.sender,
            'metadata.receivedDate': new Date(formData.receivedDate),
            'metadata.emailContent': formData.emailContent
          });

          // Upload NEW files if any (append to existing)
          if (this.selectedFiles.length > 0) {
            this.currentStep = 'Upload des nouveaux fichiers...';
            const uploadedDocs = [];
            for (let i = 0; i < this.selectedFiles.length; i++) {
              const file = this.selectedFiles[i];
              this.uploadProgress = `Fichier ${i + 1}/${this.selectedFiles.length}`;
              console.log(`[ProjectForm] Uploading file ${i + 1}/${this.selectedFiles.length}: ${file.name}`);

              const path = `projects/${this.projectId}/${file.name}`;
              const result = await this.storageService.uploadFile(path, file);
              uploadedDocs.push({
                name: file.name,
                ...result,
                uploadedAt: new Date()
              });
            }

            const currentProject = await this.firestoreService.get('projects', this.projectId);
            const currentDocs = currentProject?.documents || [];
            await this.firestoreService.update('projects', this.projectId, {
              documents: [...currentDocs, ...uploadedDocs]
            });
          }

          console.log('[ProjectForm] ✓✓✓ Project updated successfully');
          this.toastService.success('Projet mis à jour avec succès!');
          this.router.navigate(['/projects', this.projectId]);

        } else {
          console.log('[ProjectForm] ─── CREATE MODE ───');

          // CREATE
          this.currentStep = 'Création du dossier...';
          const projectData = {
            metadata: {
              title: formData.title,
              sender: formData.sender,
              receivedDate: new Date(formData.receivedDate),
              emailContent: formData.emailContent,
              status: 'ANALYSIS_PENDING',
              createdBy: currentUser?.uid || 'anonymous',
              createdAt: new Date()
            },
            documents: [] as any[]
          };

          console.log('[ProjectForm] Creating project document...');
          const projectId = await this.firestoreService.create('projects', projectData);
          console.log('[ProjectForm] ✓ Project created with ID:', projectId);

          // Upload Files
          if (this.selectedFiles.length > 0) {
            this.currentStep = 'Upload des fichiers...';
            console.log(`[ProjectForm] Starting upload of ${this.selectedFiles.length} files`);

            const uploadedDocs = [];
            for (let i = 0; i < this.selectedFiles.length; i++) {
              const file = this.selectedFiles[i];
              this.uploadProgress = `Fichier ${i + 1}/${this.selectedFiles.length}: ${file.name}`;
              console.log(`[ProjectForm] ───────────────────────────────────`);
              console.log(`[ProjectForm] Uploading file ${i + 1}/${this.selectedFiles.length}`);

              const path = `projects/${projectId}/${file.name}`;
              const result = await this.storageService.uploadFile(path, file);
              uploadedDocs.push({
                name: file.name,
                ...result,
                uploadedAt: new Date()
              });
              console.log(`[ProjectForm] ✓ File ${i + 1}/${this.selectedFiles.length} uploaded successfully`);
            }

            if (uploadedDocs.length > 0) {
              this.currentStep = 'Enregistrement des fichiers...';
              console.log('[ProjectForm] Updating project with uploaded documents...');
              await this.firestoreService.update('projects', projectId, {
                documents: uploadedDocs
              });
              console.log('[ProjectForm] ✓ Documents registered successfully');
            }
          } else {
            console.log('[ProjectForm] No files to upload');
          }

          console.log('[ProjectForm] ═══════════════════════════════════════');
          console.log('[ProjectForm] ✓✓✓ PROJECT CREATED SUCCESSFULLY');
          console.log('[ProjectForm] ═══════════════════════════════════════');

          this.toastService.success('Dossier créé avec succès!');
          this.router.navigate(['/dashboard']);
        }

      } catch (error: any) {
        console.error('[ProjectForm] ═══════════════════════════════════════');
        console.error('[ProjectForm] ✗✗✗ ERROR OCCURRED');
        console.error('[ProjectForm] Error:', error);
        console.error('[ProjectForm] Error type:', error?.constructor?.name);
        console.error('[ProjectForm] Error code:', error?.code);
        console.error('[ProjectForm] Error message:', error?.message);
        console.error('[ProjectForm] Stack trace:', error?.stack);
        console.error('[ProjectForm] ═══════════════════════════════════════');

        // Gestion d'erreurs spécifique par type
        const errorMessage = this.getErrorMessage(error);
        const errorDetails = this.getErrorDetails(error);

        this.toastService.error(errorMessage, errorDetails, 7000);
        alert(`Erreur: ${errorMessage}\n\nConsultez la console du navigateur pour plus de détails.`);

      } finally {
        this.isSubmitting = false;
        this.currentStep = '';
        this.uploadProgress = '';
        console.log('[ProjectForm] Submission process completed, isSubmitting set to false');
      }
    } else {
      console.warn('[ProjectForm] Form invalid or already submitting');
      console.warn('[ProjectForm] Form valid:', this.projectForm.valid);
      console.warn('[ProjectForm] Is submitting:', this.isSubmitting);
      console.warn('[ProjectForm] Form errors:', this.projectForm.errors);
    }
  }

  private getErrorMessage(error: any): string {
    // Erreurs Firebase Auth
    if (error?.code?.startsWith('auth/')) {
      return 'Erreur d\'authentification: ' + (error.message || 'Veuillez vous reconnecter');
    }

    // Erreurs Firestore
    if (error?.code?.startsWith('permission-denied') || error?.code === 'firestore/permission-denied') {
      return 'Permission refusée: Vérifiez vos droits d\'accès';
    }

    // Erreurs Storage
    if (error?.code?.startsWith('storage/')) {
      if (error.code === 'storage/unauthorized') {
        return 'Permission refusée pour l\'upload de fichiers';
      } else if (error.code === 'storage/canceled') {
        return 'Upload annulé';
      } else if (error.code === 'storage/quota-exceeded') {
        return 'Quota de stockage dépassé';
      }
      return 'Erreur lors de l\'upload: ' + (error.message || 'Vérifiez votre connexion');
    }

    // Erreur de taille de fichier
    if (error?.message?.includes('10MB')) {
      return 'Fichier trop volumineux (max 10MB)';
    }

    // Erreur réseau
    if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
      return 'Erreur de connexion: Vérifiez votre réseau';
    }

    return 'Une erreur est survenue lors de la création du dossier';
  }

  private getErrorDetails(error: any): string {
    const details = [];
    if (error?.code) details.push(`Code: ${error.code}`);
    if (error?.message) details.push(`Message: ${error.message}`);
    if (this.currentStep) details.push(`Étape: ${this.currentStep}`);
    return details.join(' | ');
  }
}
