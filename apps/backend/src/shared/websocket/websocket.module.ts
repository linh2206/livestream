import { Global, Module, forwardRef } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WebSocketGateway } from './websocket.gateway';
import { WebSocketService } from './websocket.service';
import { StreamsModule } from '../../modules/streams/streams.module';

@Global()
@Module({
  imports: [EventEmitterModule, forwardRef(() => StreamsModule)],
  providers: [WebSocketGateway, WebSocketService],
  exports: [WebSocketService],
})
export class WebSocketModule {}
