import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { APP_CONSTANTS } from './shared/constants';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { StreamsModule } from './modules/streams/streams.module';
import { ChatModule } from './modules/chat/chat.module';
import { RtmpModule } from './modules/rtmp/rtmp.module';
import { HlsModule } from './modules/hls/hls.module';
import { HealthModule } from './modules/health/health.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

import { DatabaseModule } from './shared/database/database.module';
import { RedisModule } from './shared/redis/redis.module';
import { WebSocketModule } from './shared/websocket/websocket.module';
import { databaseConfig } from './shared/database/database.config';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ScheduleModule.forRoot(),
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
  ],
})
export class AppModule {}
