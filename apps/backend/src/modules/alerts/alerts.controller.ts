import { Controller, Post, Body, Logger } from '@nestjs/common';
import { WebhookService } from './webhook.service';

@Controller('alerts')
export class AlertsController {
  private readonly logger = new Logger(AlertsController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Post('webhook')
  async handleWebhook(@Body() alertData: any) {
    this.logger.log('Received alert webhook:', JSON.stringify(alertData, null, 2));
    
    try {
      await this.webhookService.processAlert(alertData);
      return { status: 'success', message: 'Alert processed' };
    } catch (error) {
      this.logger.error('Error processing alert:', error);
      return { status: 'error', message: 'Failed to process alert' };
    }
  }
}








