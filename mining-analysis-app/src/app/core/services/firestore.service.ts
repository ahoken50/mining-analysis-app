import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, DocumentData, CollectionReference } from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class FirestoreService {
    private firestore: Firestore = inject(Firestore);

    constructor() {
        console.log('[FirestoreService] Service initialized');
    }

    // Generic Helpers
    getCollectionRef(path: string): CollectionReference<DocumentData> {
        return collection(this.firestore, path);
    }

    getDocRef(path: string, id: string) {
        return doc(this.firestore, path, id);
    }

    // CRUD Operations
    async create(path: string, data: any): Promise<string> {
        try {
            console.log(`[FirestoreService] Creating document in collection: ${path}`, data);
            const colRef = this.getCollectionRef(path);
            const docRef = await addDoc(colRef, {
                ...data,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log(`[FirestoreService] ✓ Document created successfully with ID: ${docRef.id}`);
            return docRef.id;
        } catch (error: any) {
            console.error(`[FirestoreService] ✗ Error creating document in ${path}:`, error);
            console.error(`[FirestoreService] Error code: ${error?.code}, Message: ${error?.message}`);
            throw error;
        }
    }

    async get(path: string, id: string): Promise<any> {
        try {
            console.log(`[FirestoreService] Fetching document: ${path}/${id}`);
            const docRef = this.getDocRef(path, id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                console.log(`[FirestoreService] ✓ Document found: ${path}/${id}`);
                return { id: docSnap.id, ...docSnap.data() };
            } else {
                console.warn(`[FirestoreService] ⚠ Document not found: ${path}/${id}`);
                return null;
            }
        } catch (error: any) {
            console.error(`[FirestoreService] ✗ Error fetching document ${path}/${id}:`, error);
            console.error(`[FirestoreService] Error code: ${error?.code}, Message: ${error?.message}`);
            throw error;
        }
    }

    async update(path: string, id: string, data: any): Promise<void> {
        try {
            console.log(`[FirestoreService] Updating document: ${path}/${id}`, data);
            const docRef = this.getDocRef(path, id);
            await updateDoc(docRef, {
                ...data,
                updatedAt: new Date()
            });
            console.log(`[FirestoreService] ✓ Document updated successfully: ${path}/${id}`);
        } catch (error: any) {
            console.error(`[FirestoreService] ✗ Error updating document ${path}/${id}:`, error);
            console.error(`[FirestoreService] Error code: ${error?.code}, Message: ${error?.message}`);
            throw error;
        }
    }

    async delete(path: string, id: string): Promise<void> {
        try {
            console.log(`[FirestoreService] Deleting document: ${path}/${id}`);
            const docRef = this.getDocRef(path, id);
            await deleteDoc(docRef);
            console.log(`[FirestoreService] ✓ Document deleted successfully: ${path}/${id}`);
        } catch (error: any) {
            console.error(`[FirestoreService] ✗ Error deleting document ${path}/${id}:`, error);
            console.error(`[FirestoreService] Error code: ${error?.code}, Message: ${error?.message}`);
            throw error;
        }
    }

    // Specific Queries (Example)
    async getProjects(userId?: string): Promise<any[]> {
        try {
            console.log(`[FirestoreService] Fetching projects${userId ? ' for user: ' + userId : ''}`);
            const colRef = this.getCollectionRef('projects');
            let q = query(colRef, orderBy('createdAt', 'desc'), limit(50));

            if (userId) {
                q = query(q, where('metadata.createdBy', '==', userId));
            }

            const querySnapshot = await getDocs(q);
            console.log(`[FirestoreService] ✓ Found ${querySnapshot.docs.length} projects`);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error: any) {
            console.error(`[FirestoreService] ✗ Error fetching projects:`, error);
            console.error(`[FirestoreService] Error code: ${error?.code}, Message: ${error?.message}`);
            throw error;
        }
    }

    async getAll(path: string): Promise<any[]> {
        try {
            console.log(`[FirestoreService] Fetching all documents from: ${path}`);
            const colRef = this.getCollectionRef(path);
            const q = query(colRef, limit(100));
            const querySnapshot = await getDocs(q);
            console.log(`[FirestoreService] ✓ Found ${querySnapshot.docs.length} documents in ${path}`);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error: any) {
            console.error(`[FirestoreService] ✗ Error fetching documents from ${path}:`, error);
            console.error(`[FirestoreService] Error code: ${error?.code}, Message: ${error?.message}`);
            throw error;
        }
    }
}
