import { Types } from 'mongoose';
import { APP_CONSTANTS } from '../constants';

/**
 * Generate a unique stream key
 */
export function generateStreamKey(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `stream_${timestamp}_${random}`;
}

/**
 * Generate a unique user ID
 */
export function generateUserId(): string {
  return new Types.ObjectId().toString();
}

/**
 * Validate MongoDB ObjectId
 */
export function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}

/**
 * Convert string to ObjectId
 */
export function toObjectId(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}

/**
 * Sanitize filename for HLS segments
 */
export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Build HLS URL
 */
export function buildHlsUrl(streamKey: string): string {
  return `${APP_CONSTANTS.STREAMING.HLS_BASE_URL}/hls/${streamKey}`;
}

/**
 * Build RTMP URL
 */
export function buildRtmpUrl(streamKey: string): string {
  return `${APP_CONSTANTS.STREAMING.RTMP_BASE_URL}/live/${streamKey}`;
}

/**
 * Extract stream key from URL
 */
export function extractStreamKeyFromUrl(url: string): string | null {
  const match = url.match(/\/api\/v1\/hls\/([^\/\?]+)/);
  return match ? match[1] : null;
}

/**
 * Extract JWT token from request
 */
export function extractTokenFromRequest(authHeader?: string, queryToken?: string): string | null {
  // Try Authorization header first
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try query parameter
  if (queryToken) {
    return queryToken;
  }

  return null;
}

/**
 * Format pagination response
 */
export function formatPaginationResponse(
  data: any[],
  page: number,
  limit: number,
  total: number
) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  };
}

/**
 * Calculate pagination skip value
 */
export function calculateSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Validate pagination parameters
 */
export function validatePagination(page?: number, limit?: number) {
  const validPage = Math.max(1, page || APP_CONSTANTS.PAGINATION.DEFAULT_PAGE);
  const validLimit = Math.min(
    APP_CONSTANTS.PAGINATION.MAX_LIMIT,
    Math.max(1, limit || APP_CONSTANTS.PAGINATION.DEFAULT_LIMIT)
  );
  
  return { page: validPage, limit: validLimit };
}

/**
 * Sleep utility function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry utility function
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await sleep(delay * Math.pow(2, i)); // Exponential backoff
      }
    }
  }
  
  throw lastError!;
}

/**
 * Safe JSON parse
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return defaultValue;
  }
}

/**
 * Safe JSON stringify
 */
export function safeJsonStringify(obj: any, defaultValue: string = '{}'): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return defaultValue;
  }
}
