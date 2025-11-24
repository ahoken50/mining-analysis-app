import { Injectable, inject } from '@angular/core';
import { Auth, authState, signInWithEmailAndPassword, signOut, User, GoogleAuthProvider, signInWithPopup } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private auth: Auth = inject(Auth);

    user$: Observable<User | null> = authState(this.auth);

    isLoggedIn$: Observable<boolean> = this.user$.pipe(
        map(user => !!user)
    );

    constructor() { }

    login(email: string, password: string): Promise<void> {
        return signInWithEmailAndPassword(this.auth, email, password)
            .then(() => { });
    }

    loginWithGoogle(): Promise<void> {
        return signInWithPopup(this.auth, new GoogleAuthProvider())
            .then(() => { });
    }

    logout(): Promise<void> {
        return signOut(this.auth);
    }

    getCurrentUser(): User | null {
        return this.auth.currentUser;
    }
}
