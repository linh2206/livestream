import { apiClient } from './client';

export interface HealthStatus {
  status: string;
  timestamp: string;
  services: {
    database: boolean;
    redis: boolean;
    rtmp: boolean;
  };
}

export interface BandwidthStats {
  network: {
    bytesReceived: number;
    bytesSent: number;
    packetsReceived: number;
    packetsSent: number;
  };
  rtmp: {
    activeConnections: number;
    totalConnections: number;
    bytesReceived: number;
    bytesSent: number;
  };
  timestamp: string;
}

export class SystemService {
  /**
   * Health check
   */
  async healthCheck(): Promise<HealthStatus> {
    return apiClient.get<HealthStatus>('/health');
  }

  /**
   * Get bandwidth statistics
   */
  async getBandwidthStats(): Promise<BandwidthStats> {
    return apiClient.get<BandwidthStats>('/bandwidth');
  }

  /**
   * Get system information
   */
  async getSystemInfo(): Promise<any> {
    return apiClient.get<any>('/system/info');
  }

  /**
   * Get server logs
   */
  async getLogs(limit: number = 100): Promise<string[]> {
    return apiClient.get<string[]>(`/system/logs?limit=${limit}`);
  }
}

// Export singleton instance
export const systemService = new SystemService();
