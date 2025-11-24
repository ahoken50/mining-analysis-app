import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  isSubmitting = false;
  returnUrl = '/dashboard';

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  ngOnInit() {
    console.log('[Login] Component initialized');

    // Si déjà connecté, rediriger vers dashboard
    this.authService.user$.subscribe(user => {
      if (user) {
        console.log('[Login] User already logged in, redirecting...');
        this.router.navigate(['/dashboard']);
      }
    });

    // Récupérer l'URL de retour
    this.route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl'] || '/dashboard';
      console.log('[Login] Return URL:', this.returnUrl);
    });
  }

  async onEmailLogin() {
    if (this.loginForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      const { email, password } = this.loginForm.value;

      console.log('[Login] Attempting email/password login for:', email);

      try {
        await this.authService.login(email, password);
        console.log('[Login] ✓ Login successful');
        this.toastService.success('Connexion réussie !');

        console.log('[Login] Redirecting to:', this.returnUrl);
        this.router.navigate([this.returnUrl]);
      } catch (error: any) {
        console.error('[Login] ✗ Login failed:', error);
        const errorMessage = this.getErrorMessage(error);
        this.toastService.error(errorMessage, error.code);
      } finally {
        this.isSubmitting = false;
      }
    }
  }

  async onGoogleLogin() {
    if (!this.isSubmitting) {
      this.isSubmitting = true;
      console.log('[Login] Attempting Google login');

      try {
        await this.authService.loginWithGoogle();
        console.log('[Login] ✓ Google login successful');
        this.toastService.success('Connexion réussie !');

        console.log('[Login] Redirecting to:', this.returnUrl);
        this.router.navigate([this.returnUrl]);
      } catch (error: any) {
        console.error('[Login] ✗ Google login failed:', error);
        const errorMessage = this.getErrorMessage(error);
        this.toastService.error(errorMessage, error.code);
      } finally {
        this.isSubmitting = false;
      }
    }
  }

  private getErrorMessage(error: any): string {
    switch (error?.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Email ou mot de passe incorrect';
      case 'auth/invalid-email':
        return 'Format d\'email invalide';
      case 'auth/user-disabled':
        return 'Ce compte a été désactivé';
      case 'auth/too-many-requests':
        return 'Trop de tentatives. Veuillez réessayer plus tard';
      case 'auth/popup-closed-by-user':
        return 'Connexion annulée';
      case 'auth/network-request-failed':
        return 'Erreur réseau. Vérifiez votre connexion';
      default:
        return 'Erreur de connexion. Veuillez réessayer';
    }
  }
}
