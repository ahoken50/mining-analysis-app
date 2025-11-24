export interface Project {
    id?: string;
    status: 'DRAFT' | 'ANALYSIS_PENDING' | 'ANALYZED' | 'APPROVED' | 'REJECTED';
    metadata: {
        title: string;
        sender: string; // 'MINING_CO' | 'MINISTRY'
        receivedDate: Date;
        emailContent: string;
        createdBy: string;
        createdAt: Date;
    };
    analysis?: {
        status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR';
        summary?: string;
        entities?: string[];
        locations?: string[];
        location_coords?: Array<{ name: string, lat: number, lng: number, formatted_address: string }>;
        dates?: string[];
        permits?: string[];
        impacts?: string[];
        error?: string;
        fullTextLength?: number;
    };
    documentIds?: string[];
    documents?: {
        name: string;
        url: string;
        type: string;
        uploadedAt: Date;
    }[];
}
