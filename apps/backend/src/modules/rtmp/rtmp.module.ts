import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { RedisModule } from '../../shared/redis/redis.module';
import { WebSocketModule } from '../../shared/websocket/websocket.module';

import { RtmpController } from './rtmp.controller';
import { RtmpService } from './rtmp.service';
import { RtmpCleanupService } from './rtmp-cleanup.service';

@Module({
  imports: [DatabaseModule, RedisModule, WebSocketModule],
  controllers: [RtmpController],
  providers: [RtmpService, RtmpCleanupService],
  exports: [RtmpService],
})
export class RtmpModule {}
