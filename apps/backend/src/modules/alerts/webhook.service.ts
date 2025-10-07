import { Injectable, Logger } from '@nestjs/common';
import { WebSocketService } from '../../shared/websocket/websocket.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly webSocketService: WebSocketService) {}

  async processAlert(alertData: any) {
    this.logger.log('Processing alert:', alertData);

    // Extract alert information
    const alerts = alertData.alerts || [];

    for (const alert of alerts) {
      const alertName = alert.labels?.alertname || 'Unknown';
      const severity = alert.labels?.severity || 'info';
      const status = alert.status || 'unknown';

      const alertInfo = {
        name: alertName,
        severity,
        status,
        summary: alert.annotations?.summary || 'No summary available',
        description:
          alert.annotations?.description || 'No description available',
        timestamp: new Date().toISOString(),
        labels: alert.labels || {},
      };

      // Log the alert
      this.logger.warn(
        `Alert ${status.toUpperCase()}: ${alertName} - ${alertInfo.summary}`
      );

      // Broadcast alert to connected clients via WebSocket
      this.webSocketService.broadcastToAll('alert', alertInfo);

      // Handle specific alert types
      await this.handleSpecificAlert(alertInfo);
    }
  }

  private async handleSpecificAlert(alertInfo: any) {
    const { name, severity, status } = alertInfo;

    switch (name) {
      case 'ServiceDown':
        if (status === 'firing') {
          this.logger.error(`CRITICAL: Service is down - ${alertInfo.summary}`);
          // Could trigger additional actions like sending notifications
        }
        break;

      case 'HighCPUUsage':
      case 'HighMemoryUsage':
        if (status === 'firing') {
          this.logger.warn(
            `WARNING: Resource usage high - ${alertInfo.summary}`
          );
        }
        break;

      case 'BackendDown':
        if (status === 'firing') {
          this.logger.error(
            `CRITICAL: Backend API is down - ${alertInfo.summary}`
          );
        }
        break;

      case 'HighErrorRate':
        if (status === 'firing') {
          this.logger.warn(
            `WARNING: High error rate detected - ${alertInfo.summary}`
          );
        }
        break;

      case 'NoActiveStreams':
        if (status === 'firing') {
          this.logger.log(`INFO: No active streams - ${alertInfo.summary}`);
        }
        break;

      case 'HighStreamCount':
        if (status === 'firing') {
          this.logger.warn(`WARNING: High stream count - ${alertInfo.summary}`);
        }
        break;

      default:
        this.logger.log(`Alert received: ${name} - ${alertInfo.summary}`);
    }
  }
}
