import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  register,
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
} from 'prom-client';
import { User } from '../../shared/database/schemas/user.schema';
import { Stream } from '../../shared/database/schemas/stream.schema';
import { ChatMessage } from '../../shared/database/schemas/chat-message.schema';
import { RedisService } from '../../shared/redis/redis.service';
import { WebSocketService } from '../../shared/websocket/websocket.service';

@Injectable()
export class MetricsService {
  // Custom metrics
  private readonly activeStreamsGauge: Gauge<string>;
  private readonly totalUsersGauge: Gauge<string>;
  private readonly websocketConnectionsGauge: Gauge<string>;
  private readonly streamViewersGauge: Gauge<string>;
  private readonly totalMessagesGauge: Gauge<string>;
  private readonly totalLikesGauge: Gauge<string>;
  private readonly httpRequestsTotal: Counter<string>;
  private readonly httpRequestDuration: Histogram<string>;
  private readonly databaseOperationsTotal: Counter<string>;
  private readonly redisOperationsTotal: Counter<string>;

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Stream.name) private streamModel: Model<Stream>,
    @InjectModel(ChatMessage.name) private chatModel: Model<ChatMessage>,
    private redisService: RedisService,
    private webSocketService: WebSocketService
  ) {
    // Initialize default metrics
    collectDefaultMetrics({ register });

    // Initialize custom metrics
    this.activeStreamsGauge = new Gauge({
      name: 'livestream_active_streams',
      help: 'Number of active streams',
      labelNames: ['status'],
    });

    this.totalUsersGauge = new Gauge({
      name: 'livestream_total_users',
      help: 'Total number of users',
      labelNames: ['status'],
    });

    this.websocketConnectionsGauge = new Gauge({
      name: 'livestream_websocket_connections',
      help: 'Number of WebSocket connections',
    });

    this.streamViewersGauge = new Gauge({
      name: 'livestream_stream_viewers',
      help: 'Number of viewers per stream',
      labelNames: ['stream_id', 'stream_title'],
    });

    this.totalMessagesGauge = new Gauge({
      name: 'livestream_total_messages',
      help: 'Total number of chat messages',
    });

    this.totalLikesGauge = new Gauge({
      name: 'livestream_total_likes',
      help: 'Total number of stream likes',
    });

    this.httpRequestsTotal = new Counter({
      name: 'livestream_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.httpRequestDuration = new Histogram({
      name: 'livestream_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    });

    this.databaseOperationsTotal = new Counter({
      name: 'livestream_database_operations_total',
      help: 'Total number of database operations',
      labelNames: ['operation', 'collection'],
    });

    this.redisOperationsTotal = new Counter({
      name: 'livestream_redis_operations_total',
      help: 'Total number of Redis operations',
      labelNames: ['operation'],
    });

    // Register custom metrics
    register.registerMetric(this.activeStreamsGauge);
    register.registerMetric(this.totalUsersGauge);
    register.registerMetric(this.websocketConnectionsGauge);
    register.registerMetric(this.streamViewersGauge);
    register.registerMetric(this.totalMessagesGauge);
    register.registerMetric(this.totalLikesGauge);
    register.registerMetric(this.httpRequestsTotal);
    register.registerMetric(this.httpRequestDuration);
    register.registerMetric(this.databaseOperationsTotal);
    register.registerMetric(this.redisOperationsTotal);

    // Start metrics collection
    this.startMetricsCollection();
  }

  async getMetrics(): Promise<string> {
    // Update metrics before returning
    await this.updateMetrics();
    return register.metrics();
  }

  private async startMetricsCollection(): Promise<void> {
    // Update metrics every 30 seconds
    setInterval(async () => {
      try {
        await this.updateMetrics();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error updating metrics:', error);
      }
    }, 30000);
  }

  private async updateMetrics(): Promise<void> {
    try {
      // Update stream metrics
      const [
        activeStreams,
        totalStreams,
        totalUsers,
        activeUsers,
        totalMessages,
        totalLikes,
      ] = await Promise.all([
        this.streamModel.countDocuments({ isLive: true }),
        this.streamModel.countDocuments(),
        this.userModel.countDocuments(),
        this.userModel.countDocuments({ isActive: true }),
        this.chatModel.countDocuments(),
        this.streamModel
          .aggregate([{ $group: { _id: null, total: { $sum: '$likeCount' } } }])
          .then(r => r[0]?.total || 0),
      ]);

      this.activeStreamsGauge.set({ status: 'active' }, activeStreams);
      this.activeStreamsGauge.set({ status: 'total' }, totalStreams);
      this.totalUsersGauge.set({ status: 'total' }, totalUsers);
      this.totalUsersGauge.set({ status: 'active' }, activeUsers);
      this.totalMessagesGauge.set(totalMessages);
      this.totalLikesGauge.set(totalLikes);

      // Update WebSocket connections
      const wsStats = this.webSocketService.getConnectionStats();
      this.websocketConnectionsGauge.set(wsStats.totalConnections);

      // Update stream viewer counts
      const liveStreams = await this.streamModel
        .find({ isLive: true }, { _id: 1, title: 1, viewerCount: 1 })
        .lean();

      // Reset all stream viewer gauges
      this.streamViewersGauge.reset();

      // Set current viewer counts
      liveStreams.forEach(stream => {
        this.streamViewersGauge.set(
          {
            stream_id: stream._id.toString(),
            stream_title: stream.title || 'Untitled',
          },
          stream.viewerCount || 0
        );
      });
    } catch (error) {
      console.error('Error updating metrics:', error);
    }
  }

  // Methods to increment counters
  incrementHttpRequests(
    method: string,
    route: string,
    statusCode: number
  ): void {
    this.httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode.toString(),
    });
  }

  recordHttpRequestDuration(
    method: string,
    route: string,
    duration: number
  ): void {
    this.httpRequestDuration.observe({ method, route }, duration);
  }

  incrementDatabaseOperations(operation: string, collection: string): void {
    this.databaseOperationsTotal.inc({ operation, collection });
  }

  incrementRedisOperations(operation: string): void {
    this.redisOperationsTotal.inc({ operation });
  }
}
