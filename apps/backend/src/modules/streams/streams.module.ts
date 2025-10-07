import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { RedisModule } from '../../shared/redis/redis.module';
import { WebSocketModule } from '../../shared/websocket/websocket.module';

import { StreamsController } from './streams.controller';
import { StreamsService } from './streams.service';

@Module({
  imports: [DatabaseModule, RedisModule, WebSocketModule],
  controllers: [StreamsController],
  providers: [StreamsService],
  exports: [StreamsService],
})
export class StreamsModule {}
