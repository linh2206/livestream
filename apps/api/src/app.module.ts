import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { StreamsModule } from './modules/streams/streams.module';
import { ChatModule } from './modules/chat/chat.module';
import { RtmpModule } from './modules/rtmp/rtmp.module';
import { BandwidthModule } from './modules/bandwidth/bandwidth.module';
import { HealthModule } from './modules/health/health.module';
import { HlsModule } from './modules/hls/hls.module';

import { DatabaseModule } from './shared/database/database.module';
import { RedisModule } from './shared/redis/redis.module';
import { WebSocketModule } from './shared/websocket/websocket.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/livestream'),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
    DatabaseModule,
    RedisModule,
    WebSocketModule,
    AuthModule,
    UsersModule,
    StreamsModule,
    ChatModule,
    RtmpModule,
    BandwidthModule,
    HealthModule,
    HlsModule,
  ],
})
export class AppModule {}
