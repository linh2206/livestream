import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Stream,
  StreamSchema,
} from '../../shared/database/schemas/stream.schema';
import { Vod, VodSchema } from '../../shared/database/schemas/vod.schema';
import { StreamsModule } from '../streams/streams.module';
import { VodController } from './vod.controller';
import { VodService } from './vod.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Stream.name, schema: StreamSchema },
      { name: Vod.name, schema: VodSchema },
    ]),
    forwardRef(() => StreamsModule),
  ],
  controllers: [VodController],
  providers: [VodService],
  exports: [VodService],
})
export class VodModule {}
