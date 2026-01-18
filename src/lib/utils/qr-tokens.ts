/**
 * QR Token utilities for attendance system
 */

const TOKEN_VALIDITY_SECONDS = 60 // Default: 60 seconds

/**
 * Generate a new attendance token
 */
export function generateToken(sessionId: string, validitySeconds = TOKEN_VALIDITY_SECONDS): {
    token: string
    expiresAt: Date
} {
    // Generate random token
    const randomBytes = crypto.getRandomValues(new Uint8Array(32))
    const token = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")

    // Calculate expiry
    const expiresAt = new Date(Date.now() + validitySeconds * 1000)

    return { token, expiresAt }
}

/**
 * Validate if token matches and is not expired
 */
export function validateToken(token: string, expiresAt: Date): boolean {
    // Check if expired
    if (new Date() > expiresAt) {
        return false
    }

    return true
}

/**
 * Format token for QR code
 * Format: sessionId:token
 */
export function formatTokenForQR(sessionId: string, token: string): string {
    return `${sessionId}:${token}`
}

/**
 * Parse token from QR code
 */
export function parseTokenFromQR(qrData: string): {
    sessionId: string
    token: string
} | null {
    const parts = qrData.split(":")
    if (parts.length !== 2) {
        return null
    }

    return {
        sessionId: parts[0],
        token: parts[1],
    }
}
