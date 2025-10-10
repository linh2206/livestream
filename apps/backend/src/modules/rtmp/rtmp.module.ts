import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { RedisModule } from '../../shared/redis/redis.module';
import { WebSocketModule } from '../../shared/websocket/websocket.module';
import { VodModule } from '../vod/vod.module';

import { RtmpCleanupService } from './rtmp-cleanup.service';
import { RtmpController } from './rtmp.controller';
import { RtmpService } from './rtmp.service';

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    WebSocketModule,
    forwardRef(() => VodModule),
  ],
  controllers: [RtmpController],
  providers: [RtmpService, RtmpCleanupService],
  exports: [RtmpService],
})
export class RtmpModule {}
