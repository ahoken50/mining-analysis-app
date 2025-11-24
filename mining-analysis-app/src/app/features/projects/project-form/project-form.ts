import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
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
export class ProjectForm implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private firestoreService = inject(FirestoreService);
  private storageService = inject(StorageService);
  private authService = inject(AuthService);

  isSubmitting = false;
  isEditMode = false;
  projectId: string | null = null;

  projectForm: FormGroup = this.fb.group({
    title: ['', Validators.required],
    sender: ['', Validators.required],
    receivedDate: [new Date().toISOString().substring(0, 10), Validators.required],
    emailContent: ['', Validators.required],
    files: [null]
  });

  selectedFiles: File[] = [];

  ngOnInit() {
    this.projectId = this.route.snapshot.paramMap.get('id');
    if (this.projectId) {
      this.isEditMode = true;
      this.loadProject(this.projectId);
    }
  }

  async loadProject(id: string) {
    try {
      const project = await this.firestoreService.get('projects', id);
      if (project) {
        this.projectForm.patchValue({
          title: project.metadata.title,
          sender: project.metadata.sender,
          receivedDate: new Date(project.metadata.receivedDate).toISOString().substring(0, 10),
          emailContent: project.metadata.emailContent
        });
      }
    } catch (error) {
      console.error('Error loading project:', error);
    }
  }

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

        if (this.isEditMode && this.projectId) {
          // UPDATE
          await this.firestoreService.update('projects', this.projectId, {
            'metadata.title': formData.title,
            'metadata.sender': formData.sender,
            'metadata.receivedDate': new Date(formData.receivedDate),
            'metadata.emailContent': formData.emailContent
          });

          // Upload NEW files if any (append to existing)
          if (this.selectedFiles.length > 0) {
            const uploadedDocs = [];
            for (const file of this.selectedFiles) {
              const path = `projects/${this.projectId}/${file.name}`;
              const result = await this.storageService.uploadFile(path, file);
              uploadedDocs.push({
                name: file.name,
                ...result,
                uploadedAt: new Date()
              });
            }
            // We need to fetch existing docs to append, or use arrayUnion if firestoreService supports it.
            // For simplicity, we'll just fetch and update for now, or assume firestoreService.update merges? 
            // Actually firestoreService.update merges fields, but for arrays we need arrayUnion.
            // Let's assume we just add them to the list in a naive way for now or skip complex array logic to save time,
            // but ideally we should append.
            // Let's just log it for now as "File upload in edit mode not fully implemented for appending" 
            // OR better: just do it right.
            // Since I can't easily do arrayUnion without importing it from firebase/firestore in the service,
            // I will skip file upload in edit mode for this iteration or assume the user knows it replaces/adds.
            // Wait, I can just get the current project again and push to its documents.
            const currentProject = await this.firestoreService.get('projects', this.projectId);
            const currentDocs = currentProject?.documents || [];
            await this.firestoreService.update('projects', this.projectId, {
              documents: [...currentDocs, ...uploadedDocs]
            });
          }
          console.log('Project updated successfully');
          this.router.navigate(['/projects', this.projectId]);

        } else {
          // CREATE
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

          // Upload Files
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

          if (uploadedDocs.length > 0) {
            await this.firestoreService.update('projects', projectId, {
              documents: uploadedDocs
            });
          }
          console.log('Project created successfully:', projectId);
          this.router.navigate(['/dashboard']);
        }

      } catch (error) {
        console.error('Error saving project:', error);
        alert('Une erreur est survenue.');
      } finally {
        this.isSubmitting = false;
      }
    }
  }
}
