import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WebSocketGateway } from './websocket.gateway';
import { WebSocketService } from './websocket.service';

@Global()
@Module({
  imports: [EventEmitterModule],
  providers: [WebSocketGateway, WebSocketService],
  exports: [WebSocketService],
})
export class WebSocketModule {}
