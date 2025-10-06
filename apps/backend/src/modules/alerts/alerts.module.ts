import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { WebhookService } from './webhook.service';
import { WebSocketModule } from '../../shared/websocket/websocket.module';

@Module({
  imports: [WebSocketModule],
  controllers: [AlertsController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class AlertsModule {}










