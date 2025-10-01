import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { StreamsController } from './streams.controller';
import { StreamsService } from './streams.service';

import { Stream, StreamSchema } from '../../shared/database/schemas/stream.schema';
import { User, UserSchema } from '../../shared/database/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Stream.name, schema: StreamSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [StreamsController],
  providers: [StreamsService],
  exports: [StreamsService],
})
export class StreamsModule {}
