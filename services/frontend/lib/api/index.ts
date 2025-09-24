// Export API client
export { apiClient } from './client';

// Export SWR hooks
export { useSWRData, usePolling, useOnce } from '../useApi';
export type { SWROptions } from '../useApi';

// Export all services
export { authService, AuthService } from './auth.service';
export { userService, UserService } from './user.service';
export { streamService, StreamService } from './stream.service';
export { chatService, ChatService } from './chat.service';
export { systemService, SystemService } from './system.service';

// Export types
export type {
  LoginRequest,
  RegisterRequest,
  GoogleLoginRequest,
  AuthResponse,
  UserProfile,
} from './auth.service';

export type {
  User,
  CreateUserRequest,
  UpdateUserRequest,
} from './user.service';

export type {
  Stream,
  CreateStreamRequest,
  UpdateStreamRequest,
} from './stream.service';

export type {
  ChatMessage,
  GetMessagesRequest,
} from './chat.service';

export type {
  HealthStatus,
  BandwidthStats,
} from './system.service';
