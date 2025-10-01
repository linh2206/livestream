import { Module } from '@nestjs/common';
import { HlsController } from './hls.controller';

@Module({
  controllers: [HlsController],
})
export class HlsModule {}
