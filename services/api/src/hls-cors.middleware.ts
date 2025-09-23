import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class HlsCorsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Remove CORS headers for HLS endpoints
    if (req.path.startsWith('/rtmp/hls/')) {
      res.removeHeader('Access-Control-Allow-Origin');
      res.removeHeader('Access-Control-Allow-Methods');
      res.removeHeader('Access-Control-Allow-Headers');
      res.removeHeader('Access-Control-Allow-Credentials');
      res.removeHeader('Access-Control-Max-Age');
    }
    next();
  }
}
