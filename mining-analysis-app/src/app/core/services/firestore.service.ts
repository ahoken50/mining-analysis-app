import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, DocumentData, CollectionReference } from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class FirestoreService {
    private firestore: Firestore = inject(Firestore);

    constructor() { }

    // Generic Helpers
    getCollectionRef(path: string): CollectionReference<DocumentData> {
        return collection(this.firestore, path);
    }

    getDocRef(path: string, id: string) {
        return doc(this.firestore, path, id);
    }

    // CRUD Operations
    async create(path: string, data: any): Promise<string> {
        const colRef = this.getCollectionRef(path);
        const docRef = await addDoc(colRef, {
            ...data,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        return docRef.id;
    }

    async get(path: string, id: string): Promise<any> {
        const docRef = this.getDocRef(path, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            return null;
        }
    }

    async update(path: string, id: string, data: any): Promise<void> {
        const docRef = this.getDocRef(path, id);
        await updateDoc(docRef, {
            ...data,
            updatedAt: new Date()
        });
    }

    async delete(path: string, id: string): Promise<void> {
        const docRef = this.getDocRef(path, id);
        await deleteDoc(docRef);
    }

    // Specific Queries (Example)
    async getProjects(userId?: string): Promise<any[]> {
        const colRef = this.getCollectionRef('projects');
        let q = query(colRef, orderBy('createdAt', 'desc'), limit(50));

        if (userId) {
            q = query(q, where('metadata.createdBy', '==', userId));
        }

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async getAll(path: string): Promise<any[]> {
        const colRef = this.getCollectionRef(path);
        const q = query(colRef, limit(100));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
}
