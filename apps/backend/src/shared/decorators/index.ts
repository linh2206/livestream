import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { UserRole } from '../constants';

/**
 * Roles decorator for role-based access control
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Public endpoint decorator (skip authentication)
 */
export const Public = () => SetMetadata('isPublic', true);

/**
 * Admin only decorator
 */
export const AdminOnly = () => applyDecorators(
  Roles(UserRole.ADMIN),
  UseGuards(JwtAuthGuard),
  ApiBearerAuth(),
  ApiOperation({ summary: 'Admin only endpoint' }),
  ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
);

/**
 * Authenticated user decorator
 */
export const AuthRequired = () => applyDecorators(
  UseGuards(JwtAuthGuard),
  ApiBearerAuth(),
  ApiOperation({ summary: 'Authentication required' }),
  ApiResponse({ status: 401, description: 'Unauthorized' })
);

/**
 * Stream owner or admin decorator
 */
export const StreamOwnerOrAdmin = () => applyDecorators(
  Roles(UserRole.ADMIN),
  UseGuards(JwtAuthGuard),
  ApiBearerAuth(),
  ApiOperation({ summary: 'Stream owner or admin access required' }),
  ApiResponse({ status: 403, description: 'Forbidden - Stream owner or admin access required' })
);

/**
 * API documentation decorator
 */
export const ApiDocumentation = (tag: string, summary: string, description?: string) => 
  applyDecorators(
    ApiTags(tag),
    ApiOperation({ summary, description }),
    ApiResponse({ status: 200, description: 'Success' }),
    ApiResponse({ status: 400, description: 'Bad Request' }),
    ApiResponse({ status: 500, description: 'Internal Server Error' })
  );

/**
 * Pagination decorator
 */
export const Pagination = () => applyDecorators(
  ApiOperation({ summary: 'Get paginated results' }),
  ApiResponse({ 
    status: 200, 
    description: 'Paginated results',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array' },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
            hasNext: { type: 'boolean' },
            hasPrev: { type: 'boolean' }
          }
        }
      }
    }
  })
);

/**
 * Stream operations decorator
 */
export const StreamOperations = () => applyDecorators(
  ApiTags('Streams'),
  ApiOperation({ summary: 'Stream operations' }),
  ApiResponse({ status: 200, description: 'Stream operation successful' }),
  ApiResponse({ status: 404, description: 'Stream not found' })
);

/**
 * HLS operations decorator
 */
export const HlsOperations = () => applyDecorators(
  ApiTags('HLS'),
  ApiOperation({ summary: 'HLS streaming operations' }),
  ApiResponse({ status: 200, description: 'HLS operation successful' }),
  ApiResponse({ status: 404, description: 'Stream not found or offline' })
);

/**
 * User operations decorator
 */
export const UserOperations = () => applyDecorators(
  ApiTags('Users'),
  ApiOperation({ summary: 'User operations' }),
  ApiResponse({ status: 200, description: 'User operation successful' }),
  ApiResponse({ status: 404, description: 'User not found' })
);

/**
 * Chat operations decorator
 */
export const ChatOperations = () => applyDecorators(
  ApiTags('Chat'),
  ApiOperation({ summary: 'Chat operations' }),
  ApiResponse({ status: 200, description: 'Chat operation successful' })
);

/**
 * Metrics operations decorator
 */
export const MetricsOperations = () => applyDecorators(
  ApiTags('Metrics'),
  ApiOperation({ summary: 'System and stream metrics' }),
  ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
);
