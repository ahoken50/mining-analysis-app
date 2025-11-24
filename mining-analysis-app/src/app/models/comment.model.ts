export interface Comment {
    id?: string;
    projectId: string;
    userId: string;
    userName?: string; // Optional, can be fetched or stored
    content: string;
    createdAt: Date;
}
