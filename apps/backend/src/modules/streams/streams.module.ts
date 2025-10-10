import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { RedisModule } from '../../shared/redis/redis.module';
import { WebSocketModule } from '../../shared/websocket/websocket.module';
import { VodModule } from '../vod/vod.module';

import { StreamStatusService } from './stream-status.service';
import { StreamsController } from './streams.controller';
import { StreamsService } from './streams.service';

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    WebSocketModule,
    forwardRef(() => VodModule),
  ],
  controllers: [StreamsController],
  providers: [StreamsService, StreamStatusService],
  exports: [StreamsService, StreamStatusService],
})
export class StreamsModule {}
