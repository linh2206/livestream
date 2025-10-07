import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VodController } from './vod.controller';
import { VodService } from './vod.service';
import { Stream, StreamSchema } from '../../shared/database/schemas/stream.schema';
import { StreamsModule } from '../streams/streams.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Stream.name, schema: StreamSchema },
    ]),
    forwardRef(() => StreamsModule),
  ],
  controllers: [VodController],
  providers: [VodService],
  exports: [VodService],
})
export class VodModule {}
