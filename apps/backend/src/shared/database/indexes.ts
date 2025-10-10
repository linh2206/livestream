import { Model } from 'mongoose';

// Database indexes for performance optimization
export class DatabaseIndexes {
  static async createIndexes(
    userModel: Model<any>,
    streamModel: Model<any>,
    vodModel: Model<any>,
    chatModel: Model<any>
  ) {
    try {
      // User indexes
      await userModel.collection.createIndex({ username: 1 }, { unique: true });
      await userModel.collection.createIndex({ email: 1 }, { unique: true });
      await userModel.collection.createIndex({ createdAt: -1 });
      await userModel.collection.createIndex({ isActive: 1 });

      // Stream indexes
      await streamModel.collection.createIndex(
        { streamKey: 1 },
        { unique: true }
      );
      await streamModel.collection.createIndex({ userId: 1 });
      await streamModel.collection.createIndex({ isLive: 1, createdAt: -1 });
      await streamModel.collection.createIndex({ status: 1 });
      await streamModel.collection.createIndex({ viewerCount: -1 });
      await streamModel.collection.createIndex({ likeCount: -1 });
      await streamModel.collection.createIndex({ startTime: -1 });
      await streamModel.collection.createIndex({ endTime: -1 });

      // Compound indexes for common queries
      await streamModel.collection.createIndex({
        isLive: 1,
        status: 1,
        createdAt: -1,
      });
      await streamModel.collection.createIndex({ userId: 1, isLive: 1 });
      await streamModel.collection.createIndex({ status: 1, viewerCount: -1 });

      // VOD indexes
      await vodModel.collection.createIndex({ userId: 1 });
      await vodModel.collection.createIndex({ isPublic: 1, createdAt: -1 });
      await vodModel.collection.createIndex({ category: 1 });
      await vodModel.collection.createIndex({ viewerCount: -1 });
      await vodModel.collection.createIndex({ likeCount: -1 });
      await vodModel.collection.createIndex({ endTime: -1 });
      await vodModel.collection.createIndex({ originalStreamKey: 1 });
      await vodModel.collection.createIndex({ originalStreamId: 1 });

      // Compound indexes for VOD
      await vodModel.collection.createIndex({ userId: 1, isPublic: 1 });
      await vodModel.collection.createIndex({
        category: 1,
        isPublic: 1,
        endTime: -1,
      });

      // Chat message indexes
      await chatModel.collection.createIndex({ streamId: 1, createdAt: -1 });
      await chatModel.collection.createIndex({ userId: 1 });
      await chatModel.collection.createIndex({ createdAt: -1 });
      await chatModel.collection.createIndex({ isDeleted: 1 });

      // Compound indexes for chat
      await chatModel.collection.createIndex({
        streamId: 1,
        isDeleted: 1,
        createdAt: -1,
      });
      await chatModel.collection.createIndex({ userId: 1, createdAt: -1 });

      // Database indexes created successfully
    } catch (error) {
      // Error creating database indexes - will be handled by application
    }
  }
}
