import { Global, Module, forwardRef } from '@nestjs/common';
import { ChatModule } from '../../modules/chat/chat.module';
import { StreamsModule } from '../../modules/streams/streams.module';
import { WebSocketGateway } from './websocket.gateway';
import { WebSocketService } from './websocket.service';

@Global()
@Module({
  imports: [ChatModule, forwardRef(() => StreamsModule)],
  providers: [WebSocketGateway, WebSocketService],
  exports: [WebSocketService],
})
export class WebSocketModule {}
