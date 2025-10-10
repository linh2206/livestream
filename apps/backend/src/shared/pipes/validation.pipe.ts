import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

@Injectable()
export class ValidationPipe implements PipeTransform<unknown> {
  async transform(value: unknown, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToClass(metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      const errorMessages = this.buildErrorMessages(errors);
      throw new BadRequestException({
        message: 'Validation failed',
        error: 'Bad Request',
        statusCode: 400,
        details: errorMessages,
      });
    }

    return value;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private buildErrorMessages(errors: unknown[]): Record<string, string[]> {
    const errorMessages: Record<string, string[]> = {};

    errors.forEach(error => {
      const err = error as {
        property: string;
        constraints?: Record<string, string>;
      };
      const property = err.property;
      const constraints = err.constraints;

      if (constraints) {
        errorMessages[property] = Object.values(constraints);
      }
    });

    return errorMessages;
  }
}
