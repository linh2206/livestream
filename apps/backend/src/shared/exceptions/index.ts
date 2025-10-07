import { HttpException, HttpStatus } from '@nestjs/common';
import { ERROR_MESSAGES } from '../constants';

/**
 * Custom exception for stream not found
 */
export class StreamNotFoundException extends HttpException {
  constructor(message: string = ERROR_MESSAGES.STREAM_NOT_FOUND) {
    super(message, HttpStatus.NOT_FOUND);
  }
}

/**
 * Custom exception for user not found
 */
export class UserNotFoundException extends HttpException {
  constructor(message: string = ERROR_MESSAGES.USER_NOT_FOUND) {
    super(message, HttpStatus.NOT_FOUND);
  }
}

/**
 * Custom exception for unauthorized access
 */
export class UnauthorizedException extends HttpException {
  constructor(message: string = ERROR_MESSAGES.UNAUTHORIZED) {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

/**
 * Custom exception for forbidden access
 */
export class ForbiddenException extends HttpException {
  constructor(message: string = ERROR_MESSAGES.FORBIDDEN) {
    super(message, HttpStatus.FORBIDDEN);
  }
}

/**
 * Custom exception for invalid token
 */
export class InvalidTokenException extends HttpException {
  constructor(message: string = ERROR_MESSAGES.INVALID_TOKEN) {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

/**
 * Custom exception for stream offline
 */
export class StreamOfflineException extends HttpException {
  constructor(message: string = ERROR_MESSAGES.STREAM_OFFLINE) {
    super(message, HttpStatus.NOT_FOUND);
  }
}

/**
 * Custom exception for authentication required
 */
export class AuthenticationRequiredException extends HttpException {
  constructor(message: string = ERROR_MESSAGES.AUTHENTICATION_REQUIRED) {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

/**
 * Custom exception for validation errors
 */
export class ValidationException extends HttpException {
  constructor(message: string, errors?: any[]) {
    super(
      {
        message,
        errors: errors || [],
      },
      HttpStatus.BAD_REQUEST
    );
  }
}

/**
 * Custom exception for rate limit exceeded
 */
export class RateLimitExceededException extends HttpException {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}

/**
 * Custom exception for service unavailable
 */
export class ServiceUnavailableException extends HttpException {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, HttpStatus.SERVICE_UNAVAILABLE);
  }
}
