import { Module } from '@nestjs/common';
import { HlsController } from './hls.controller';
import { StreamsModule } from '../streams/streams.module';

@Module({
  imports: [StreamsModule],
  controllers: [HlsController],
})
export class HlsModule {}
