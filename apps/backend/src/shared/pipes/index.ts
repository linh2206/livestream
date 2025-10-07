import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { Types } from 'mongoose';

/**
 * Validation pipe for DTOs
 */
@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToClass(metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      const errorMessages = errors.map(error => ({
        property: error.property,
        constraints: error.constraints,
      }));

      throw new BadRequestException({
        message: 'Validation failed',
        errors: errorMessages,
      });
    }

    return value;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}

/**
 * Parse ObjectId pipe
 */
@Injectable()
export class ParseObjectIdPipe
  implements PipeTransform<string, Types.ObjectId>
{
  transform(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException('Invalid ObjectId format');
    }
    return new Types.ObjectId(value);
  }
}

/**
 * Parse pagination pipe
 */
@Injectable()
export class ParsePaginationPipe implements PipeTransform {
  transform(value: any) {
    const page = parseInt(value.page, 10) || 1;
    const limit = parseInt(value.limit, 10) || 10;

    if (page < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }

    if (limit < 1 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    return {
      page: Math.max(1, page),
      limit: Math.min(100, Math.max(1, limit)),
    };
  }
}

/**
 * Sanitize string pipe
 */
@Injectable()
export class SanitizeStringPipe implements PipeTransform {
  transform(value: string): string {
    if (typeof value !== 'string') {
      return value;
    }

    return value
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .substring(0, 1000); // Limit length
  }
}

/**
 * Parse boolean pipe
 */
@Injectable()
export class ParseBooleanPipe implements PipeTransform {
  transform(value: string): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }

    return false;
  }
}

/**
 * Parse array pipe
 */
@Injectable()
export class ParseArrayPipe implements PipeTransform {
  constructor(private readonly separator: string = ',') {}

  transform(value: string): string[] {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value;
    }

    return value
      .split(this.separator)
      .map(item => item.trim())
      .filter(Boolean);
  }
}
