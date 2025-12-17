import { Blob } from 'node:buffer';

/**
 * MEFS Client Module
 * Handles file upload and download using MEFS API
 */

export interface ApiConfig {
    apiBaseUrl: string;
    accessToken: string;
}

export interface UploadOptions {
    key?: string; // Encryption key
    public?: boolean; // Whether file is public
    user?: string; // User identifier
}

export interface UploadResult {
    Mid: string; // Content ID (CID)
}

export interface DownloadResult {
    data: Uint8Array;
    filename: string;
    contentType?: string;
}

/**
 * Upload file to MEFS
 */
export async function uploadFile(
    config: ApiConfig,
    file: Uint8Array,
    filename: string,
    options: UploadOptions = {}
): Promise<UploadResult> {
    const url = new URL(config.apiBaseUrl + '/mefs/');

    // Use FormData for multipart/form-data upload
    const formData = new FormData();

    // Create a File-like object for Node.js
    const blob = new Blob([file as Uint8Array<ArrayBuffer>], { type: 'application/octet-stream' });
    formData.append('file', blob, filename);

    if (options.key) {
        formData.append('key', options.key);
    }
    if (options.public) {
        formData.append('public', 'true');
    }
    if (options.user) {
        formData.append('user', options.user);
    }

    const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${config.accessToken}`,
            // Don't set Content-Type header, let fetch set it with boundary
        },
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload file: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json() as UploadResult;
}

/**
 * Download file from MEFS
 */
export async function downloadFile(
    config: ApiConfig,
    cid: string,
    key?: string
): Promise<DownloadResult> {
    const url = new URL(config.apiBaseUrl + `/mefs/${cid}`);

    // According to API docs, key can be sent as query string or form field
    // We'll use query string for GET requests
    if (key) {
        url.searchParams.set('key', key);
    }

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${config.accessToken}`,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to download file: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const contentType = response.headers.get('content-type') || undefined;
    const contentDisposition = response.headers.get('content-disposition') || '';
    let filename = 'unknown';

    // Extract filename from Content-Disposition header
    const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
    if (filenameMatch) {
        filename = filenameMatch[1];
    }

    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    return {
        data,
        filename,
        contentType,
    };
}

