import { Injectable, inject } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';

@Injectable({
    providedIn: 'root'
})
export class StorageService {
    private storage: Storage = inject(Storage);

    constructor() { }

    /**
     * Uploads a file to Firebase Storage
     * @param path The storage path (e.g., 'projects/123/doc.pdf')
     * @param file The file to upload
     * @returns Promise resolving to the download URL
     */
    async uploadFile(path: string, file: File): Promise<{ path: string, url: string, type: string }> {
        const storageRef = ref(this.storage, path);
        const result = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(result.ref);

        return {
            path: result.ref.fullPath,
            url: url,
            type: file.type || this.guessType(file.name)
        };
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
