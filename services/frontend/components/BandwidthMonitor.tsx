import React, { useEffect, useState } from 'react';

interface BandwidthData {
  timestamp: string;
  network_interfaces: {
    [key: string]: {
      rx_bytes: number;
      rx_packets: number;
      tx_bytes: number;
      tx_packets: number;
    };
  };
  rtmp_stats: any;
  system_load: {
    load1: number;
    load5: number;
    load15: number;
  };
  memory_usage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  error?: string;
}

const BandwidthMonitor: React.FC = () => {
  const [bandwidthData, setBandwidthData] = useState<BandwidthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBandwidthData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
      }
      const response = await fetch(`${apiUrl}/bandwidth`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setBandwidthData(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBandwidthData();
    const interval = setInterval(fetchBandwidthData, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="bg-glass-white backdrop-blur-md rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Bandwidth Monitor</h2>
        <div className="text-white">Loading bandwidth data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-glass-white backdrop-blur-md rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Bandwidth Monitor</h2>
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!bandwidthData) {
    return (
      <div className="bg-glass-white backdrop-blur-md rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Bandwidth Monitor</h2>
        <div className="text-gray-400">No bandwidth data available</div>
      </div>
    );
  }

  return (
    <div className="bg-glass-white backdrop-blur-md rounded-2xl p-6">
      <h2 className="text-2xl font-bold text-white mb-4">📊 Bandwidth Monitor</h2>
      
      {/* System Load */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">System Load</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-glass-black rounded-lg p-4">
            <div className="text-sm text-gray-400">Load 1m</div>
            <div className="text-xl font-bold text-white">{bandwidthData.system_load.load1.toFixed(2)}</div>
          </div>
          <div className="bg-glass-black rounded-lg p-4">
            <div className="text-sm text-gray-400">Load 5m</div>
            <div className="text-xl font-bold text-white">{bandwidthData.system_load.load5.toFixed(2)}</div>
          </div>
          <div className="bg-glass-black rounded-lg p-4">
            <div className="text-sm text-gray-400">Load 15m</div>
            <div className="text-xl font-bold text-white">{bandwidthData.system_load.load15.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Memory Usage */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Memory Usage</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-glass-black rounded-lg p-4">
            <div className="text-sm text-gray-400">RSS</div>
            <div className="text-xl font-bold text-white">{formatBytes(bandwidthData.memory_usage.rss)}</div>
          </div>
          <div className="bg-glass-black rounded-lg p-4">
            <div className="text-sm text-gray-400">Heap Used</div>
            <div className="text-xl font-bold text-white">{formatBytes(bandwidthData.memory_usage.heapUsed)}</div>
          </div>
        </div>
      </div>

      {/* Network Interfaces */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Network Interfaces</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-glass-black rounded-lg overflow-hidden">
            <thead>
              <tr className="text-left text-gray-300">
                <th className="py-3 px-4 font-semibold">Interface</th>
                <th className="py-3 px-4 font-semibold">RX Bytes</th>
                <th className="py-3 px-4 font-semibold">TX Bytes</th>
                <th className="py-3 px-4 font-semibold">RX Packets</th>
                <th className="py-3 px-4 font-semibold">TX Packets</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(bandwidthData.network_interfaces).map(([name, stats]) => (
                <tr key={name} className="border-t border-gray-700">
                  <td className="py-3 px-4 text-white font-mono">{name}</td>
                  <td className="py-3 px-4 text-green-400">{formatBytes(stats.rx_bytes)}</td>
                  <td className="py-3 px-4 text-blue-400">{formatBytes(stats.tx_bytes)}</td>
                  <td className="py-3 px-4 text-gray-300">{stats.rx_packets.toLocaleString()}</td>
                  <td className="py-3 px-4 text-gray-300">{stats.tx_packets.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      {/* Last Updated */}
      <div className="mt-4 text-sm text-gray-400">
        Last updated: {new Date(bandwidthData.timestamp).toLocaleString()}
      </div>
    </div>
  );
};

export default BandwidthMonitor;
