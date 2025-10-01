import { Injectable } from '@nestjs/common';
import { RedisService } from '../../shared/redis/redis.service';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    websocket: ServiceHealth;
    rtmp: ServiceHealth;
    hls: ServiceHealth;
  };
  system: {
    uptime: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
    disk: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  lastCheck: Date;
  error?: string;
}

@Injectable()
export class HealthService {
  constructor(private redisService: RedisService) {}

  async getHealthStatus(): Promise<HealthStatus> {
    const [databaseHealth, redisHealth, websocketHealth, rtmpHealth, hlsHealth] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkRedisHealth(),
      this.checkWebSocketHealth(),
      this.checkRtmpHealth(),
      this.checkHlsHealth(),
    ]);

    const systemInfo = await this.getSystemInfo();

    // Determine overall status
    const serviceStatuses = [databaseHealth, redisHealth, websocketHealth, rtmpHealth, hlsHealth];
    const unhealthyCount = serviceStatuses.filter(s => s.status === 'unhealthy').length;
    const degradedCount = serviceStatuses.filter(s => s.status === 'degraded').length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedCount > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    return {
      status: overallStatus,
      timestamp: new Date(),
      services: {
        database: databaseHealth,
        redis: redisHealth,
        websocket: websocketHealth,
        rtmp: rtmpHealth,
        hls: hlsHealth,
      },
      system: systemInfo,
    };
  }

  private async checkDatabaseHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // This would typically ping the database
      // For now, we'll simulate a check
      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime < 100 ? 'healthy' : responseTime < 500 ? 'degraded' : 'unhealthy',
        responseTime,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date(),
        error: error.message,
      };
    }
  }

  private async checkRedisHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      await this.redisService.getClient().ping();
      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime < 50 ? 'healthy' : responseTime < 200 ? 'degraded' : 'unhealthy',
        responseTime,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date(),
        error: error.message,
      };
    }
  }

  private async checkWebSocketHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Check if WebSocket service is running
      // This would typically check the WebSocket server status
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date(),
        error: error.message,
      };
    }
  }

  private async checkRtmpHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Check RTMP server health
      // This would typically ping the RTMP server
      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime < 100 ? 'healthy' : responseTime < 500 ? 'degraded' : 'unhealthy',
        responseTime,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date(),
        error: error.message,
      };
    }
  }

  private async checkHlsHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Check HLS server health
      // This would typically check if HLS files are being generated
      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime < 100 ? 'healthy' : responseTime < 500 ? 'degraded' : 'unhealthy',
        responseTime,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date(),
        error: error.message,
      };
    }
  }

  private async getSystemInfo(): Promise<HealthStatus['system']> {
    const uptime = process.uptime();
    
    // Get system info from Redis (updated by monitoring scripts)
    const [memoryUsed, memoryTotal, cpuUsage, diskUsed, diskTotal] = await Promise.all([
      this.redisService.get('system:memory:used') || '0',
      this.redisService.get('system:memory:total') || '0',
      this.redisService.get('system:cpu:usage') || '0',
      this.redisService.get('system:disk:used') || '0',
      this.redisService.get('system:disk:total') || '0',
    ]);

    const memUsed = parseInt(memoryUsed);
    const memTotal = parseInt(memoryTotal);
    const diskUsedNum = parseInt(diskUsed);
    const diskTotalNum = parseInt(diskTotal);

    return {
      uptime,
      memory: {
        used: memUsed,
        total: memTotal,
        percentage: memTotal > 0 ? (memUsed / memTotal) * 100 : 0,
      },
      cpu: {
        usage: parseFloat(cpuUsage),
      },
      disk: {
        used: diskUsedNum,
        total: diskTotalNum,
        percentage: diskTotalNum > 0 ? (diskUsedNum / diskTotalNum) * 100 : 0,
      },
    };
  }

  async ping(): Promise<{ message: string; timestamp: Date }> {
    return {
      message: 'pong',
      timestamp: new Date(),
    };
  }
}
