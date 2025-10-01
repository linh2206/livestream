import { Module } from '@nestjs/common';
import { BandwidthController } from './bandwidth.controller';
import { BandwidthService } from './bandwidth.service';

@Module({
  controllers: [BandwidthController],
  providers: [BandwidthService],
  exports: [BandwidthService],
})
export class BandwidthModule {}
