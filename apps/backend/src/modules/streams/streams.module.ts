import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { RedisModule } from '../../shared/redis/redis.module';
import { VodModule } from '../vod/vod.module';

import { StreamsController } from './streams.controller';
import { StreamsService } from './streams.service';

@Module({
  imports: [DatabaseModule, RedisModule, forwardRef(() => VodModule)],
  controllers: [StreamsController],
  providers: [StreamsService],
  exports: [StreamsService],
})
export class StreamsModule {}
