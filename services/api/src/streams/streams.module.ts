import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StreamsController } from './streams.controller';
import { StreamsService } from './streams.service';
import { Stream, StreamSchema } from './schemas/stream.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Stream.name, schema: StreamSchema }])
  ],
  controllers: [StreamsController],
  providers: [StreamsService],
  exports: [StreamsService],
})
export class StreamsModule {}
