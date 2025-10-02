import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * Logging interceptor for API requests
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, ip } = request;
    const userAgent = request.get('User-Agent') || '';
    const startTime = Date.now();

    this.logger.log(`📥 ${method} ${url} - ${ip} - ${userAgent}`);

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const { statusCode } = response;
        this.logger.log(`📤 ${method} ${url} - ${statusCode} - ${duration}ms`);
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.logger.error(`❌ ${method} ${url} - ${error.status || 500} - ${duration}ms - ${error.message}`);
        return throwError(() => error);
      }),
    );
  }
}

/**
 * Response transformation interceptor
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap((data) => {
        // Transform response data if needed
        if (data && typeof data === 'object') {
          // Add timestamp to response
          data.timestamp = new Date().toISOString();
        }
      }),
    );
  }
}

/**
 * Cache interceptor for GET requests
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    
    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Add cache headers
    const response = context.switchToHttp().getResponse<Response>();
    response.setHeader('Cache-Control', 'public, max-age=60');
    response.setHeader('ETag', `"${Date.now()}"`);

    return next.handle();
  }
}

/**
 * Performance monitoring interceptor
 */
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        
        // Log slow requests (> 1 second)
        if (duration > 1000) {
          this.logger.warn(`🐌 Slow request: ${method} ${url} - ${duration}ms`);
        }
        
        // Log very slow requests (> 5 seconds)
        if (duration > 5000) {
          this.logger.error(`🚨 Very slow request: ${method} ${url} - ${duration}ms`);
        }
      }),
    );
  }
}




