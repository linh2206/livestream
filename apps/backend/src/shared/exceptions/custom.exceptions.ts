import { HttpException, HttpStatus } from '@nestjs/common';

export class ValidationException extends HttpException {
  constructor(message: string, details?: unknown) {
    super(
      {
        message,
        error: 'Validation Error',
        statusCode: HttpStatus.BAD_REQUEST,
        details,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class StreamKeyExistsException extends HttpException {
  constructor(streamKey: string) {
    super(
      {
        message: `Stream key '${streamKey}' already exists. Please use a different key.`,
        error: 'Stream Key Conflict',
        statusCode: HttpStatus.CONFLICT,
        details: { streamKey },
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class StreamNotFoundException extends HttpException {
  constructor(streamId: string) {
    super(
      {
        message: `Stream with ID '${streamId}' not found.`,
        error: 'Stream Not Found',
        statusCode: HttpStatus.NOT_FOUND,
        details: { streamId },
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class UnauthorizedStreamAccessException extends HttpException {
  constructor(streamId: string, userId: string) {
    super(
      {
        message: `You don't have permission to access stream '${streamId}'.`,
        error: 'Unauthorized Access',
        statusCode: HttpStatus.FORBIDDEN,
        details: { streamId, userId },
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class InvalidStreamKeyException extends HttpException {
  constructor(streamKey: string) {
    super(
      {
        message: `Invalid stream key format. Stream key can only contain letters, numbers, underscores, and hyphens.`,
        error: 'Invalid Stream Key',
        statusCode: HttpStatus.BAD_REQUEST,
        details: { streamKey },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class StreamAlreadyLikedException extends HttpException {
  constructor(streamId: string, userId: string) {
    super(
      {
        message: `You have already liked this stream.`,
        error: 'Already Liked',
        statusCode: HttpStatus.CONFLICT,
        details: { streamId, userId },
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class StreamNotLikedException extends HttpException {
  constructor(streamId: string, userId: string) {
    super(
      {
        message: `You haven't liked this stream yet.`,
        error: 'Not Liked',
        statusCode: HttpStatus.CONFLICT,
        details: { streamId, userId },
      },
      HttpStatus.CONFLICT,
    );
  }
}
