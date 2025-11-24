import { Injectable, inject } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';

@Injectable({
    providedIn: 'root'
})
export class StorageService {
    private storage: Storage = inject(Storage);

    constructor() {
        console.log('[StorageService] Service initialized');
    }

    /**
     * Uploads a file to Firebase Storage
     * @param path The storage path (e.g., 'projects/123/doc.pdf')
     * @param file The file to upload
     * @returns Promise resolving to the download URL
     */
    async uploadFile(path: string, file: File): Promise<{ path: string, url: string, type: string }> {
        try {
            const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
            console.log(`[StorageService] Starting upload: ${file.name} (${fileSizeMB} MB) to ${path}`);
            console.log(`[StorageService] File type: ${file.type || 'unknown'}`);

            // Check file size (Firebase has a default limit, storage rules may have more restrictions)
            if (file.size > 10 * 1024 * 1024) {
                const error = new Error('File size exceeds 10MB limit');
                console.error(`[StorageService] ✗ File too large: ${fileSizeMB} MB`, error);
                throw error;
            }

            const storageRef = ref(this.storage, path);
            console.log(`[StorageService] Uploading to Firebase Storage...`);

            const result = await uploadBytes(storageRef, file);
            console.log(`[StorageService] ✓ Upload complete, getting download URL...`);

            const url = await getDownloadURL(result.ref);
            console.log(`[StorageService] ✓ Download URL obtained successfully`);
            console.log(`[StorageService] ✓ File uploaded: ${file.name} → ${url}`);

            return {
                path: result.ref.fullPath,
                url: url,
                type: file.type || this.guessType(file.name)
            };
        } catch (error: any) {
            console.error(`[StorageService] ✗ Error uploading file ${file.name}:`, error);
            console.error(`[StorageService] Error code: ${error?.code}, Message: ${error?.message}`);

            // Provide more specific error messages
            if (error?.code === 'storage/unauthorized') {
                console.error(`[StorageService] ✗ Permission denied - check Storage rules`);
            } else if (error?.code === 'storage/canceled') {
                console.error(`[StorageService] ✗ Upload was canceled`);
            } else if (error?.code === 'storage/unknown') {
                console.error(`[StorageService] ✗ Unknown error occurred, check network and Firebase configuration`);
            }

            throw error;
        }
    }

    private guessType(filename: string): string {
        const ext = filename.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') return 'application/pdf';
        if (['jpg', 'jpeg', 'png'].includes(ext || '')) return 'image/' + ext;
        if (ext === 'zip') return 'application/zip';
        if (ext === 'shp') return 'application/x-qgis';
        return 'application/octet-stream';
    }
}
