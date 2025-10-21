import { Model } from 'mongoose';
import {
  InvalidStreamKeyException,
  StreamKeyExistsException,
  ValidationException,
} from '../exceptions/custom.exceptions';

export class ValidationUtil {
  /**
   * Validate stream key format
   */
  static validateStreamKey(streamKey: string): void {
    const streamKeyRegex = /^[a-zA-Z0-9_-]+$/;
    if (!streamKeyRegex.test(streamKey)) {
      throw new InvalidStreamKeyException(streamKey);
    }
  }

  /**
   * Check if stream key already exists
   */
  static async checkStreamKeyExists(
    streamKey: string,
    streamModel: Model<unknown>,
    excludeId?: string
  ): Promise<void> {
    const query: Record<string, unknown> = { streamKey };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existingStream = await streamModel.findOne(query);
    if (existingStream) {
      throw new StreamKeyExistsException(streamKey);
    }
  }

  /**
   * Validate user exists
   */
  static async validateUserExists(
    userId: string,
    userModel: Model<unknown>
  ): Promise<unknown> {
    const user = await userModel.findById(userId);
    if (!user) {
      throw new ValidationException('User not found');
    }
    return user;
  }

  /**
   * Validate stream exists
   */
  static async validateStreamExists(
    streamId: string,
    streamModel: Model<unknown>
  ): Promise<unknown> {
    const stream = await streamModel.findById(streamId);
    if (!stream) {
      throw new ValidationException('Stream not found');
    }
    return stream;
  }

  /**
   * Check user permissions for stream
   */
  static async checkStreamPermissions(
    stream: { userId: { toString(): string } },
    userId: string,
    userModel: Model<unknown>
  ): Promise<void> {
    if (stream.userId.toString() !== userId) {
      const user = await userModel.findById(userId);
      if (!user || (user as { role?: string }).role !== 'admin') {
        throw new ValidationException(
          'You do not have permission to access this stream'
        );
      }
    }
  }

  /**
   * Generate unique stream key
   */
  static async generateUniqueStreamKey(
    streamModel: Model<unknown>,
    prefix: string = 'stream'
  ): Promise<string> {
    let streamKey: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      streamKey = `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      attempts++;

      if (attempts > maxAttempts) {
        throw new ValidationException('Unable to generate unique stream key');
      }
    } while (await streamModel.findOne({ streamKey }));

    return streamKey;
  }
}
