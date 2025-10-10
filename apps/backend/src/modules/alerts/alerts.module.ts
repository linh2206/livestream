import { Module } from '@nestjs/common';
import { WebSocketModule } from '../../shared/websocket/websocket.module';
import { AlertsController } from './alerts.controller';
import { WebhookService } from './webhook.service';

@Module({
  imports: [WebSocketModule],
  controllers: [AlertsController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class AlertsModule {}
