export enum ExportChatFileFormat {
    TXT = "txt",
    CSV = "csv",
    PDF = "pdf",
}

export interface ExportChatsProps {
    instance: string;
    userId: string;
    format: ExportChatFileFormat;
    startDate: string;
    endDate: string;
}

export interface ExportedChatInfo {
    userName: string;
    startDate: string;
    endDate: string;
    exportDate: string;
    format: string;
    fileName: string;
    instance: string;
}

export interface DBExportedChat {
    instance: string;
    file_name: string;
    user_id: string;
    format: string;
    start_date: string;
    end_date: string;
}