import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Stream,
  StreamSchema,
} from '../../shared/database/schemas/stream.schema';
import { User, UserSchema } from '../../shared/database/schemas/user.schema';
import { Vod, VodSchema } from '../../shared/database/schemas/vod.schema';
import { RedisModule } from '../../shared/redis/redis.module';
import { WebSocketModule } from '../../shared/websocket/websocket.module';
import { AnalyticsSchedulerService } from './analytics-scheduler.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Stream.name, schema: StreamSchema },
      { name: User.name, schema: UserSchema },
      { name: Vod.name, schema: VodSchema },
    ]),
    RedisModule,
    WebSocketModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsSchedulerService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
