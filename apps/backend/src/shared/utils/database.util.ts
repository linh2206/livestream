import { Types } from 'mongoose';

export class DatabaseUtil {
  /**
   * Safe ObjectId conversion
   */
  static toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error(`Invalid ObjectId: ${id}`);
    }
    return new Types.ObjectId(id);
  }

  /**
   * Build pagination query
   */
  static buildPaginationQuery(page: number, limit: number) {
    const skip = (page - 1) * limit;
    return { skip, limit };
  }

  /**
   * Build search query for streams
   */
  static buildStreamSearchQuery(
    searchTerm?: string,
    category?: string,
    tags?: string[]
  ) {
    const query: any = {};

    if (searchTerm) {
      query.$or = [
        { title: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
      ];
    }

    if (category) {
      query.category = category;
    }

    if (tags && tags.length > 0) {
      query.tags = { $in: tags };
    }

    return query;
  }

  /**
   * Build sort options
   */
  static buildSortOptions(sortBy?: string, sortOrder?: 'asc' | 'desc') {
    const sort: any = {};

    switch (sortBy) {
      case 'title':
        sort.title = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'createdAt':
        sort.createdAt = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'viewerCount':
        sort.viewerCount = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'likeCount':
        sort.likeCount = sortOrder === 'desc' ? -1 : 1;
        break;
      default:
        sort.createdAt = -1; // Default: newest first
    }

    return sort;
  }

  /**
   * Build aggregation pipeline for stream statistics
   */
  static buildStreamStatsPipeline(userId?: string) {
    const pipeline: any[] = [];

    if (userId) {
      pipeline.push({
        $match: { userId: new Types.ObjectId(userId) },
      });
    }

    pipeline.push({
      $group: {
        _id: null,
        totalStreams: { $sum: 1 },
        totalViews: { $sum: '$viewerCount' },
        totalLikes: { $sum: '$likeCount' },
        averageViewerCount: { $avg: '$viewerCount' },
        activeStreams: {
          $sum: {
            $cond: [{ $eq: ['$status', 'live'] }, 1, 0],
          },
        },
      },
    });

    return pipeline;
  }
}
