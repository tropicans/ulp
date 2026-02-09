"use server";

import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";

// ============================================
// MINIO/S3 STORAGE CONFIGURATION
// ============================================
// Storage is configured via environment variables:
// - S3_ENDPOINT / MINIO_ENDPOINT: MinIO server URL (default: http://localhost:9000)
// - S3_ACCESS_KEY / MINIO_ACCESS_KEY: Access key
// - S3_SECRET_KEY / MINIO_SECRET_KEY: Secret key
// - S3_WBLM_BUCKET: Bucket name for WBLM artifacts (default: wblm-artifacts)

const MINIO_ENDPOINT = process.env.S3_ENDPOINT || process.env.MINIO_ENDPOINT || "http://localhost:9000";
const WBLM_BUCKET = process.env.S3_WBLM_BUCKET || "wblm-artifacts";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface WblmFileRef {
    id: string;
    storageUrl: string;
    filename: string;
    mime: string;
    size: number;
    checksum?: string;
}

// ============================================
// STORAGE OPERATIONS
// ============================================

/**
 * Generate a presigned URL for uploading a file
 * Note: Full implementation requires @aws-sdk/client-s3 package
 * This provides the interface for when the package is installed
 */
export async function getWblmUploadUrl(
    submissionId: string,
    filename: string,
    contentType: string,
    fileSize: number
): Promise<{ url?: string; key?: string; error?: string }> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { error: "Unauthorized" };
        }

        if (fileSize > MAX_FILE_SIZE) {
            return { error: `Ukuran file melebihi batas ${MAX_FILE_SIZE / 1024 / 1024}MB` };
        }

        // Generate unique key
        const fileExt = filename.split('.').pop() || '';
        const key = `submissions/${submissionId}/${randomUUID()}.${fileExt}`;

        // For now, return a direct URL endpoint
        // When @aws-sdk/client-s3 is installed, this will be replaced with presigned URLs
        const url = `${MINIO_ENDPOINT}/${WBLM_BUCKET}/${key}`;

        return { url, key };
    } catch (error) {
        console.error("Error generating upload URL:", error);
        return { error: "Gagal membuat URL upload" };
    }
}

/**
 * Generate a presigned URL for downloading a file
 */
export async function getWblmDownloadUrl(
    key: string,
    filename?: string
): Promise<{ url?: string; error?: string }> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { error: "Unauthorized" };
        }

        // Direct URL - will be replaced with presigned URL when SDK is installed
        const url = `${MINIO_ENDPOINT}/${WBLM_BUCKET}/${key}`;

        return { url };
    } catch (error) {
        console.error("Error generating download URL:", error);
        return { error: "Gagal membuat URL download" };
    }
}

/**
 * Delete a file from storage (placeholder)
 */
export async function deleteWblmFile(key: string): Promise<{ success?: boolean; error?: string }> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { error: "Unauthorized" };
        }

        if (!["SUPER_ADMIN", "ADMIN_UNIT"].includes(session.user.role)) {
            return { error: "Anda tidak memiliki akses untuk menghapus file" };
        }

        // TODO: Implement actual deletion when SDK is available
        console.log(`File deletion requested: ${key}`);

        return { success: true };
    } catch (error) {
        console.error("Error deleting file:", error);
        return { error: "Gagal menghapus file" };
    }
}

/**
 * Parse file info from storage key
 */
export function parseWblmFileKey(key: string): { submissionId?: string; filename?: string } {
    // Key format: submissions/{submissionId}/{fileId}.{ext}
    const parts = key.split('/');
    if (parts.length >= 3 && parts[0] === 'submissions') {
        return {
            submissionId: parts[1],
            filename: parts[2]
        };
    }
    return {};
}

/**
 * Build file reference object for storing in database
 */
export function buildWblmFileRef(
    key: string,
    filename: string,
    mime: string,
    size: number,
    checksum?: string
): WblmFileRef {
    return {
        id: randomUUID(),
        storageUrl: `s3://${WBLM_BUCKET}/${key}`,
        filename,
        mime,
        size,
        checksum
    };
}

/**
 * Get storage configuration info
 */
export function getWblmStorageConfig() {
    return {
        endpoint: MINIO_ENDPOINT,
        bucket: WBLM_BUCKET,
        maxFileSize: MAX_FILE_SIZE,
        maxFileSizeMB: MAX_FILE_SIZE / 1024 / 1024
    };
}
