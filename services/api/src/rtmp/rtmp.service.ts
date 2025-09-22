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
    
    // Update stream status in database
    await this.streamModel.findOneAndUpdate(
      { streamKey: name },
      { 
        isLive: true, 
        startTime: new Date(),
        viewerCount: 0 
      },
      { upsert: true }
    );

    return { status: 'ok' };
  }

  async handlePublishDone(data: any) {
    const { name, addr } = data;
    console.log(`Stream ended: ${name} from ${addr}`);
    
    // Update stream status in database
    await this.streamModel.findOneAndUpdate(
      { streamKey: name },
      { 
        isLive: false, 
        endTime: new Date() 
      }
    );

    return { status: 'ok' };
  }

  async handlePlay(data: any) {
    const { name, addr } = data;
    console.log(`Viewer joined: ${name} from ${addr}`);
    
    // Increment viewer count
    await this.streamModel.findOneAndUpdate(
      { streamKey: name },
      { $inc: { viewerCount: 1 } }
    );

    return { status: 'ok' };
  }

  async handlePlayDone(data: any) {
    const { name, addr } = data;
    console.log(`Viewer left: ${name} from ${addr}`);
    
    // Decrement viewer count
    await this.streamModel.findOneAndUpdate(
      { streamKey: name },
      { $inc: { viewerCount: -1 } }
    );

    return { status: 'ok' };
  }

  async serveHlsStream(streamKey: string, res: Response) {
    // Redirect to Nginx HLS serving
    return res.redirect(`/hls/${streamKey}.m3u8`);
  }

  async serveHlsDirectory(res: Response) {
    const hlsDir = '/tmp/hls';
    
    if (!fs.existsSync(hlsDir)) {
      return res.status(404).json({ error: 'HLS directory not found' });
    }

    const files = fs.readdirSync(hlsDir)
      .filter(file => file.endsWith('.m3u8'))
      .map(file => ({
        name: file.replace('.m3u8', ''),
        url: `/hls/${file}`
      }));

    return res.json({ streams: files });
  }
}
