import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { APP_CONSTANTS } from './shared/constants';

import { AlertsModule } from './modules/alerts/alerts.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChatModule } from './modules/chat/chat.module';
import { HealthModule } from './modules/health/health.module';
import { HlsModule } from './modules/hls/hls.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { RtmpModule } from './modules/rtmp/rtmp.module';
import { StreamsModule } from './modules/streams/streams.module';
import { UsersModule } from './modules/users/users.module';
import { VodModule } from './modules/vod/vod.module';

import { databaseConfig } from './shared/database/database.config';
import { DatabaseModule } from './shared/database/database.module';
import { RedisModule } from './shared/redis/redis.module';
import { WebSocketModule } from './shared/websocket/websocket.module';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    MongooseModule.forRoot(APP_CONSTANTS.DATABASE.MONGODB_URI, databaseConfig),
    JwtModule.register({
      global: true,
      secret: APP_CONSTANTS.JWT.SECRET,
      signOptions: { expiresIn: APP_CONSTANTS.JWT.EXPIRES_IN },
    }),
    DatabaseModule,
    RedisModule,
    WebSocketModule,
    AuthModule,
    UsersModule,
    StreamsModule,
    ChatModule,
    RtmpModule,
    HlsModule,
    HealthModule,
    MetricsModule,
    AlertsModule,
    AnalyticsModule,
    VodModule,
  ],
})
export class AppModule {}
