import { Component, Input, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FirestoreService } from '../../../core/services/firestore.service';
import { AuthService } from '../../../core/services/auth.service';
import { Comment } from '../../../models/comment.model';
import { query, where, orderBy, onSnapshot } from '@angular/fire/firestore';

@Component({
  selector: 'app-comments',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './comments.html',
  styleUrl: './comments.scss'
})
export class Comments implements OnInit {
  @Input() projectId!: string;

  private fb = inject(FormBuilder);
  private firestoreService = inject(FirestoreService);
  private authService = inject(AuthService);

  comments: Comment[] = [];
  commentForm: FormGroup = this.fb.group({
    content: ['', Validators.required]
  });

  ngOnInit() {
    if (this.projectId) {
      this.loadComments();
    }
  }

  loadComments() {
    const colRef = this.firestoreService.getCollectionRef('comments');
    const q = query(colRef, where('projectId', '==', this.projectId), orderBy('createdAt', 'desc'));

    // Real-time listener
    onSnapshot(q, (snapshot) => {
      this.comments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data()['createdAt'] as any).toDate()
      } as Comment));
    });
  }

  async onSubmit() {
    if (this.commentForm.valid) {
      const content = this.commentForm.value.content;
      const user = this.authService.getCurrentUser();

      if (!user) return;

      const newComment: Comment = {
        projectId: this.projectId,
        userId: user.uid,
        userName: user.email || 'Anonyme',
        content: content,
        createdAt: new Date()
      };

      await this.firestoreService.create('comments', newComment);
      this.commentForm.reset();
    }
  }
}
