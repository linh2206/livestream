import { Logger } from '@nestjs/common';

/**
 * Performance monitoring utilities
 */
export class PerformanceUtil {
  private static readonly logger = new Logger(PerformanceUtil.name);

  /**
   * Measure execution time of a function
   */
  static async measureTime<T>(
    fn: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;

      if (duration > 1000) {
        this.logger.warn(
          `⚠️ Slow operation: ${operationName} took ${duration}ms`
        );
      } else {
        this.logger.debug(`✅ ${operationName} completed in ${duration}ms`);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.logger.error(
        `❌ ${operationName} failed after ${duration}ms: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Measure database query performance
   */
  static async measureQuery<T>(
    queryFn: () => Promise<T>,
    queryName: string
  ): Promise<T> {
    return this.measureTime(queryFn, `DB Query: ${queryName}`);
  }

  /**
   * Measure API endpoint performance
   */
  static async measureApi<T>(
    apiFn: () => Promise<T>,
    endpoint: string
  ): Promise<T> {
    return this.measureTime(apiFn, `API: ${endpoint}`);
  }

  /**
   * Log memory usage
   */
  static logMemoryUsage(context: string): void {
    const memUsage = process.memoryUsage();
    const formatBytes = (bytes: number) => (bytes / 1024 / 1024).toFixed(2);

    this.logger.debug(
      `📊 Memory Usage [${context}]: ` +
        `RSS: ${formatBytes(memUsage.rss)}MB, ` +
        `Heap Used: ${formatBytes(memUsage.heapUsed)}MB, ` +
        `Heap Total: ${formatBytes(memUsage.heapTotal)}MB`
    );
  }

  /**
   * Create performance decorator
   */
  static performance(_operationName: string) {
    return function (
      target: unknown,
      propertyName: string,
      descriptor: PropertyDescriptor
    ) {
      const method = descriptor.value;

      descriptor.value = async function (...args: unknown[]) {
        return PerformanceUtil.measureTime(
          () => method.apply(this, args),
          `${(target as { constructor: { name: string } }).constructor.name}.${propertyName}`
        );
      };
    };
  }
}
