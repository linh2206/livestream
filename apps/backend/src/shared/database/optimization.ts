import { Model } from 'mongoose';
import { StreamDocument } from './schemas/stream.schema';
import { UserDocument } from './schemas/user.schema';
import { VodDocument } from './schemas/vod.schema';

/**
 * Database optimization utilities
 */
export class DatabaseOptimization {
  /**
   * Create indexes for Stream model
   */
  static async createStreamIndexes(
    streamModel: Model<StreamDocument>
  ): Promise<void> {
    try {
      // Compound index for efficient queries
      await streamModel.collection.createIndex(
        {
          status: 1,
          isLive: 1,
          createdAt: -1,
        },
        { name: 'status_live_created_idx' }
      );

      // Index for stream key lookups
      await streamModel.collection.createIndex(
        { streamKey: 1 },
        { unique: true, name: 'stream_key_unique_idx' }
      );

      // Index for user streams
      await streamModel.collection.createIndex(
        { userId: 1, createdAt: -1 },
        { name: 'user_streams_idx' }
      );

      // Index for search functionality
      await streamModel.collection.createIndex(
        {
          title: 'text',
          description: 'text',
        },
        {
          name: 'stream_search_idx',
          weights: { title: 10, description: 5 },
        }
      );

      // Index for category filtering
      await streamModel.collection.createIndex(
        { category: 1, status: 1 },
        { name: 'category_status_idx' }
      );

      // Index for tags
      await streamModel.collection.createIndex(
        { tags: 1 },
        { name: 'tags_idx' }
      );

      // eslint-disable-next-line no-console
      console.log('✅ Stream indexes created successfully');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Error creating stream indexes:', error);
    }
  }

  /**
   * Create indexes for User model
   */
  static async createUserIndexes(
    userModel: Model<UserDocument>
  ): Promise<void> {
    try {
      // Unique index for username
      await userModel.collection.createIndex(
        { username: 1 },
        { unique: true, name: 'username_unique_idx' }
      );

      // Unique index for email
      await userModel.collection.createIndex(
        { email: 1 },
        { unique: true, name: 'email_unique_idx' }
      );

      // Index for role-based queries
      await userModel.collection.createIndex(
        { role: 1, isActive: 1 },
        { name: 'role_active_idx' }
      );

      // eslint-disable-next-line no-console
      console.log('✅ User indexes created successfully');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Error creating user indexes:', error);
    }
  }

  /**
   * Create indexes for VOD model
   */
  static async createVodIndexes(vodModel: Model<VodDocument>): Promise<void> {
    try {
      // Index for user VODs
      await vodModel.collection.createIndex(
        { userId: 1, createdAt: -1 },
        { name: 'user_vods_idx' }
      );

      // Index for stream VODs
      await vodModel.collection.createIndex(
        { streamId: 1 },
        { name: 'stream_vod_idx' }
      );

      // Index for VOD status
      await vodModel.collection.createIndex(
        { status: 1, createdAt: -1 },
        { name: 'vod_status_idx' }
      );

      // eslint-disable-next-line no-console
      console.log('✅ VOD indexes created successfully');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Error creating VOD indexes:', error);
    }
  }

  /**
   * Create all indexes
   */
  static async createAllIndexes(models: {
    streamModel: Model<StreamDocument>;
    userModel: Model<UserDocument>;
    vodModel: Model<VodDocument>;
  }): Promise<void> {
    await Promise.all([
      this.createStreamIndexes(models.streamModel),
      this.createUserIndexes(models.userModel),
      this.createVodIndexes(models.vodModel),
    ]);
  }
}
