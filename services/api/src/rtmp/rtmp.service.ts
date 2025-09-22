import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Stream } from '../streams/schemas/stream.schema';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RtmpService {
  constructor(
    @InjectModel(Stream.name) private streamModel: Model<Stream>,
  ) {}

  async handlePublish(data: any) {
    const { name, addr } = data;
    console.log(`Stream started: ${name} from ${addr}`);
    
    // Always allow RTMP publish - no database required
    return { status: 'ok' };
  }

  async handlePublishDone(data: any) {
    const { name, addr } = data;
    console.log(`Stream ended: ${name} from ${addr}`);
    
    try {
      // Update stream status in database
      await this.streamModel.findOneAndUpdate(
        { streamKey: name },
        { 
          isLive: false, 
          endTime: new Date() 
        }
      );
    } catch (error) {
      console.error('Error updating stream status:', error);
    }

    return { status: 'ok' };
  }

  async handlePlay(data: any) {
    const { name, addr } = data;
    console.log(`Viewer joined: ${name} from ${addr}`);
    
    try {
      // Increment viewer count
      await this.streamModel.findOneAndUpdate(
        { streamKey: name },
        { $inc: { viewerCount: 1 } }
      );
    } catch (error) {
      console.error('Error updating viewer count:', error);
    }

    return { status: 'ok' };
  }

  async handlePlayDone(data: any) {
    const { name, addr } = data;
    console.log(`Viewer left: ${name} from ${addr}`);
    
    try {
      // Decrement viewer count
      await this.streamModel.findOneAndUpdate(
        { streamKey: name },
        { $inc: { viewerCount: -1 } }
      );
    } catch (error) {
      console.error('Error updating viewer count:', error);
    }

    return { status: 'ok' };
  }

  async serveHlsStream(streamKey: string, res: Response) {
    try {
      const hlsPath = `/var/www/html/hls/${streamKey}`;
      const m3u8File = `${hlsPath}/index.m3u8`;
      
      // Check if HLS files exist
      if (fs.existsSync(m3u8File)) {
        const content = fs.readFileSync(m3u8File, 'utf8');
        
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Range, Origin, X-Requested-With, Accept');
        
        return res.send(content);
      } else {
        // Return empty playlist if stream not found
        const emptyPlaylist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:9.0,
#EXT-X-ENDLIST`;

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Range, Origin, X-Requested-With, Accept');
        
        return res.send(emptyPlaylist);
      }
    } catch (error) {
      console.error('Error serving HLS stream:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async serveHlsDirectory(res: Response) {
    try {
      const hlsDir = '/var/www/html/hls';
      
      if (!fs.existsSync(hlsDir)) {
        return res.status(404).json({ error: 'HLS directory not found' });
      }

      const files = fs.readdirSync(hlsDir)
        .filter(file => fs.statSync(`${hlsDir}/${file}`).isDirectory())
        .map(dir => ({
          name: dir,
          url: `/hls/${dir}`,
          playlist: `/hls/${dir}/index.m3u8`
        }));

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range, Origin, X-Requested-With, Accept');
      
      return res.json({ 
        streams: files,
        count: files.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error serving HLS directory:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
