import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FirestoreService } from '../../../core/services/firestore.service';
import { StorageService } from '../../../core/services/storage.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './project-form.html',
  styleUrl: './project-form.scss'
})
export class ProjectForm {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private firestoreService = inject(FirestoreService);
  private storageService = inject(StorageService);
  private authService = inject(AuthService);

  isSubmitting = false;

  projectForm: FormGroup = this.fb.group({
    title: ['', Validators.required],
    sender: ['', Validators.required],
    receivedDate: [new Date().toISOString().substring(0, 10), Validators.required],
    emailContent: ['', Validators.required],
    files: [null]
  });

  selectedFiles: File[] = [];

  onFileSelected(event: any) {
    if (event.target.files) {
      this.selectedFiles = Array.from(event.target.files);
    }
  }

  async onSubmit() {
    if (this.projectForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      try {
        const formData = this.projectForm.value;
        const currentUser = this.authService.getCurrentUser();

        // 1. Create Project Document (Draft)
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

        const projectId = await this.firestoreService.create('projects', projectData);

        // 2. Upload Files
        const uploadedDocs = [];
        for (const file of this.selectedFiles) {
          const path = `projects/${projectId}/${file.name}`;
          const result = await this.storageService.uploadFile(path, file);
          uploadedDocs.push({
            name: file.name,
            ...result,
            uploadedAt: new Date()
          });
        }

        // 3. Update Project with Document Refs
        if (uploadedDocs.length > 0) {
          await this.firestoreService.update('projects', projectId, {
            documents: uploadedDocs
          });
        }

        console.log('Project created successfully:', projectId);
        this.router.navigate(['/dashboard']);

      } catch (error) {
        console.error('Error creating project:', error);
        alert('Une erreur est survenue lors de la création du dossier.');
      } finally {
        this.isSubmitting = false;
      }
    }
  }
}
