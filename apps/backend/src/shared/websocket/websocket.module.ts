import { Module, Global } from '@nestjs/common';
import { WebSocketGateway } from './websocket.gateway';
import { WebSocketService } from './websocket.service';
import { ChatModule } from '../../modules/chat/chat.module';

@Global()
@Module({
  imports: [ChatModule],
  providers: [WebSocketGateway, WebSocketService],
  exports: [WebSocketService],
})
export class WebSocketModule {}

