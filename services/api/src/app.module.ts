import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StreamsModule } from './streams/streams.module';
import { ChatModule } from './chat/chat.module';
import { RtmpModule } from './rtmp/rtmp.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/livestream',
      {
        retryWrites: true,
        w: 'majority',
      }
    ),
    AuthModule,
    UsersModule,
    StreamsModule,
    ChatModule,
    RtmpModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
