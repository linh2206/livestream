import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RtmpController } from './rtmp.controller';
import { RtmpService } from './rtmp.service';
import { Stream, StreamSchema } from '../streams/schemas/stream.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Stream.name, schema: StreamSchema }]),
  ],
  controllers: [RtmpController],
  providers: [RtmpService],
  exports: [RtmpService],
})
export class RtmpModule {}
