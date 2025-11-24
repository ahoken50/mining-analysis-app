export interface HistoryEvent {
    id?: string;
    projectId: string;
    action: 'CREATED' | 'UPDATED' | 'STATUS_CHANGE' | 'FILE_UPLOAD' | 'ANALYSIS_STARTED' | 'ANALYSIS_COMPLETED';
    userId: string;
    userName?: string;
    details?: string;
    timestamp: Date;
}
