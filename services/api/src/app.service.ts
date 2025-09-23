import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class AppService {
  getHello() {
    return {
      message: 'Welcome to LiveStream API!',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  getHealth() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'livestream-backend',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  getStatus() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'livestream-backend',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      endpoints: {
        health: '/health',
        status: '/status',
        rtmp: '/rtmp',
        hls: '/rtmp/hls',
        streams: '/streams',
        users: '/users',
        auth: '/auth',
        chat: '/chat',
      },
    };
  }

  async getBandwidth() {
    try {
      // Get network interface stats
      const { stdout: networkStats } = await execAsync('cat /proc/net/dev');
      const lines = networkStats.split('\n');
      
      // Parse network stats (simplified)
      const interfaces = {};
      lines.forEach(line => {
        if (line.includes(':')) {
          const parts = line.split(':');
          const name = parts[0].trim();
          const stats = parts[1].trim().split(/\s+/);
          if (stats.length >= 9) {
            interfaces[name] = {
              rx_bytes: parseInt(stats[0]),
              rx_packets: parseInt(stats[1]),
              tx_bytes: parseInt(stats[8]),
              tx_packets: parseInt(stats[9]),
            };
          }
        }
      });

      // Get RTMP server stats if available
      let rtmpStats = null;
      try {
        const { stdout: rtmpData } = await execAsync('curl -s http://localhost:8080/stat 2>/dev/null || echo "{}"');
        rtmpStats = JSON.parse(rtmpData);
      } catch (error) {
        // RTMP stats not available
      }

      // Get system load
      const { stdout: loadAvg } = await execAsync('cat /proc/loadavg');
      const [load1, load5, load15] = loadAvg.trim().split(' ');

      return {
        timestamp: new Date().toISOString(),
        network_interfaces: interfaces,
        rtmp_stats: rtmpStats,
        system_load: {
          load1: parseFloat(load1),
          load5: parseFloat(load5),
          load15: parseFloat(load15),
        },
        memory_usage: process.memoryUsage(),
      };
    } catch (error) {
      return {
        error: 'Failed to get bandwidth stats',
        timestamp: new Date().toISOString(),
        message: error.message,
      };
    }
  }
}
