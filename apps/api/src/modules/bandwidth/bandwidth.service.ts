import { Injectable } from '@nestjs/common';
import { RedisService } from '../../shared/redis/redis.service';
import { WebSocketService } from '../../shared/websocket/websocket.service';

export interface BandwidthStats {
  timestamp: Date;
  totalBandwidth: number;
  incomingBandwidth: number;
  outgoingBandwidth: number;
  activeConnections: number;
  totalConnections: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  rtmpStats: {
    activeStreams: number;
    totalPublishers: number;
    totalViewers: number;
    totalBandwidth: number;
  };
  hlsStats: {
    activeStreams: number;
    totalSegments: number;
    totalBandwidth: number;
  };
}

@Injectable()
export class BandwidthService {
  constructor(
    private redisService: RedisService,
    private webSocketService: WebSocketService,
  ) {}

  async getBandwidthStats(): Promise<BandwidthStats> {
    // Get system stats from Redis (these would be updated by monitoring scripts)
    const [
      totalBandwidth,
      incomingBandwidth,
      outgoingBandwidth,
      activeConnections,
      totalConnections,
      cpuUsage,
      memoryUsage,
      diskUsage,
      networkLatency,
    ] = await Promise.all([
      this.redisService.get('system:bandwidth:total') || '0',
      this.redisService.get('system:bandwidth:incoming') || '0',
      this.redisService.get('system:bandwidth:outgoing') || '0',
      this.redisService.get('system:connections:active') || '0',
      this.redisService.get('system:connections:total') || '0',
      this.redisService.get('system:cpu:usage') || '0',
      this.redisService.get('system:memory:usage') || '0',
      this.redisService.get('system:disk:usage') || '0',
      this.redisService.get('system:network:latency') || '0',
    ]);

    // Get RTMP stats
    const rtmpStats = await this.getRtmpStats();
    
    // Get HLS stats
    const hlsStats = await this.getHlsStats();

    return {
      timestamp: new Date(),
      totalBandwidth: parseInt(totalBandwidth),
      incomingBandwidth: parseInt(incomingBandwidth),
      outgoingBandwidth: parseInt(outgoingBandwidth),
      activeConnections: parseInt(activeConnections),
      totalConnections: parseInt(totalConnections),
      cpuUsage: parseFloat(cpuUsage),
      memoryUsage: parseFloat(memoryUsage),
      diskUsage: parseFloat(diskUsage),
      networkLatency: parseFloat(networkLatency),
      rtmpStats,
      hlsStats,
    };
  }

  private async getRtmpStats(): Promise<BandwidthStats['rtmpStats']> {
    const [
      activeStreams,
      totalPublishers,
      totalViewers,
      totalBandwidth,
    ] = await Promise.all([
      this.redisService.get('rtmp:active_streams') || '0',
      this.redisService.get('rtmp:total_publishers') || '0',
      this.redisService.get('rtmp:total_viewers') || '0',
      this.redisService.get('rtmp:total_bandwidth') || '0',
    ]);

    return {
      activeStreams: parseInt(activeStreams),
      totalPublishers: parseInt(totalPublishers),
      totalViewers: parseInt(totalViewers),
      totalBandwidth: parseInt(totalBandwidth),
    };
  }

  private async getHlsStats(): Promise<BandwidthStats['hlsStats']> {
    const [
      activeStreams,
      totalSegments,
      totalBandwidth,
    ] = await Promise.all([
      this.redisService.get('hls:active_streams') || '0',
      this.redisService.get('hls:total_segments') || '0',
      this.redisService.get('hls:total_bandwidth') || '0',
    ]);

    return {
      activeStreams: parseInt(activeStreams),
      totalSegments: parseInt(totalSegments),
      totalBandwidth: parseInt(totalBandwidth),
    };
  }

  async updateBandwidthStats(stats: Partial<BandwidthStats>): Promise<void> {
    const updates: Array<[string, string, number?]> = [];

    if (stats.totalBandwidth !== undefined) {
      updates.push(['system:bandwidth:total', stats.totalBandwidth.toString()]);
    }
    if (stats.incomingBandwidth !== undefined) {
      updates.push(['system:bandwidth:incoming', stats.incomingBandwidth.toString()]);
    }
    if (stats.outgoingBandwidth !== undefined) {
      updates.push(['system:bandwidth:outgoing', stats.outgoingBandwidth.toString()]);
    }
    if (stats.activeConnections !== undefined) {
      updates.push(['system:connections:active', stats.activeConnections.toString()]);
    }
    if (stats.totalConnections !== undefined) {
      updates.push(['system:connections:total', stats.totalConnections.toString()]);
    }
    if (stats.cpuUsage !== undefined) {
      updates.push(['system:cpu:usage', stats.cpuUsage.toString()]);
    }
    if (stats.memoryUsage !== undefined) {
      updates.push(['system:memory:usage', stats.memoryUsage.toString()]);
    }
    if (stats.diskUsage !== undefined) {
      updates.push(['system:disk:usage', stats.diskUsage.toString()]);
    }
    if (stats.networkLatency !== undefined) {
      updates.push(['system:network:latency', stats.networkLatency.toString()]);
    }

    // Update Redis with TTL of 1 hour
    for (const [key, value] of updates) {
      await this.redisService.set(key, value, 3600);
    }

    // Broadcast stats update
    this.webSocketService.broadcastBandwidthUpdate(stats);
  }

  async getHistoricalStats(hours: number = 24): Promise<BandwidthStats[]> {
    // This would typically query a time-series database
    // For now, we'll return empty array
    return [];
  }

  async getTopStreamsByBandwidth(limit: number = 10): Promise<Array<{ streamKey: string; bandwidth: number }>> {
    // This would query the database for streams with highest bandwidth usage
    // For now, we'll return empty array
    return [];
  }
}
