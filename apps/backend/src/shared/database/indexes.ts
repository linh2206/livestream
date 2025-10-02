import { Model } from 'mongoose';

// Database indexes for performance optimization
export class DatabaseIndexes {
  static async createIndexes(userModel: Model<any>, streamModel: Model<any>, chatModel: Model<any>) {
    try {
      // User indexes
      await userModel.collection.createIndex({ username: 1 }, { unique: true });
      await userModel.collection.createIndex({ email: 1 }, { unique: true });
      await userModel.collection.createIndex({ createdAt: -1 });
      await userModel.collection.createIndex({ isActive: 1 });

      // Stream indexes
      await streamModel.collection.createIndex({ streamKey: 1 }, { unique: true });
      await streamModel.collection.createIndex({ userId: 1 });
      await streamModel.collection.createIndex({ isLive: 1, createdAt: -1 });
      await streamModel.collection.createIndex({ status: 1 });
      await streamModel.collection.createIndex({ viewerCount: -1 });
      await streamModel.collection.createIndex({ likeCount: -1 });
      await streamModel.collection.createIndex({ startTime: -1 });
      await streamModel.collection.createIndex({ endTime: -1 });
      
      // Compound indexes for common queries
      await streamModel.collection.createIndex({ isLive: 1, status: 1, createdAt: -1 });
      await streamModel.collection.createIndex({ userId: 1, isLive: 1 });
      await streamModel.collection.createIndex({ status: 1, viewerCount: -1 });

      // Chat message indexes
      await chatModel.collection.createIndex({ streamId: 1, createdAt: -1 });
      await chatModel.collection.createIndex({ userId: 1 });
      await chatModel.collection.createIndex({ createdAt: -1 });
      await chatModel.collection.createIndex({ isDeleted: 1 });
      
      // Compound indexes for chat
      await chatModel.collection.createIndex({ streamId: 1, isDeleted: 1, createdAt: -1 });
      await chatModel.collection.createIndex({ userId: 1, createdAt: -1 });

      console.log('✅ Database indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating database indexes:', error);
    }
  }
}

