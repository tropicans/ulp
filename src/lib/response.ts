/**
 * Standard Response Helpers for Server Actions
 * 
 * Use these helpers to ensure consistent response format across all actions.
 * 
 * @example
 * // Success with data
 * return success(user)
 * 
 * // Success with message
 * return success(null, "Berhasil disimpan")
 * 
 * // Error
 * return error("UNAUTHORIZED", "Silakan login terlebih dahulu")
 * 
 * // Validation error with details
 * return error("VALIDATION_ERROR", "Input tidak valid", { field: "email", issue: "format" })
 */

// Standard error codes
export type ErrorCode = 
  | "UNAUTHORIZED"      // Not logged in
  | "FORBIDDEN"         // Logged in but no permission
  | "NOT_FOUND"         // Resource doesn't exist
  | "VALIDATION_ERROR"  // Input validation failed
  | "CONFLICT"          // Duplicate or state conflict
  | "SERVER_ERROR"      // Internal error

export interface SuccessResponse<T = unknown> {
  success: true
  data?: T
  message?: string
}

export interface ErrorResponse {
  success: false
  error: {
    code: ErrorCode
    message: string
    details?: Record<string, unknown>
  }
}

export type ActionResponse<T = unknown> = SuccessResponse<T> | ErrorResponse

/**
 * Create a success response
 */
export function success<T>(data?: T, message?: string): SuccessResponse<T> {
  return {
    success: true,
    ...(data !== undefined && { data }),
    ...(message && { message })
  }
}

/**
 * Create an error response
 */
export function error(
  code: ErrorCode, 
  message: string, 
  details?: Record<string, unknown>
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details })
    }
  }
}

/**
 * Type guard to check if response is success
 */
export function isSuccess<T>(response: ActionResponse<T>): response is SuccessResponse<T> {
  return response.success === true
}

/**
 * Type guard to check if response is error
 */
export function isError<T>(response: ActionResponse<T>): response is ErrorResponse {
  return response.success === false
}

/**
 * Helper for unauthorized response (common case)
 */
export function unauthorized(message = "Silakan login terlebih dahulu"): ErrorResponse {
  return error("UNAUTHORIZED", message)
}

/**
 * Helper for forbidden response (common case)
 */
export function forbidden(message = "Anda tidak memiliki akses"): ErrorResponse {
  return error("FORBIDDEN", message)
}

/**
 * Helper for not found response (common case)
 */
export function notFound(entity = "Resource"): ErrorResponse {
  return error("NOT_FOUND", `${entity} tidak ditemukan`)
}

/**
 * Helper for validation error from Zod
 */
export function validationError(zodError: { issues: { message: string }[] }): ErrorResponse {
  return error("VALIDATION_ERROR", zodError.issues[0]?.message || "Validasi gagal")
}

/**
 * Helper for server error (use in catch blocks)
 */
export function serverError(message = "Terjadi kesalahan server"): ErrorResponse {
  return error("SERVER_ERROR", message)
}
