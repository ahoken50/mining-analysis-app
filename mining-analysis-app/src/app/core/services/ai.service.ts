import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AiService {
    private http = inject(HttpClient);
    private apiUrl = environment.aiServiceUrl || 'https://ai-service-73106333644.us-central1.run.app'; // Fallback or env var

    async analyzeProject(projectId: string): Promise<any> {
        const url = `${this.apiUrl}/analyze/${projectId}`;
        return firstValueFrom(this.http.post(url, {}));
    }
}
