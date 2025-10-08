# Testing Guide

## Cấu trúc Tests

```
apps/
├── backend/
│   ├── test/
│   │   ├── unit/          # Unit tests (service logic)
│   │   ├── integration/   # API integration tests
│   │   └── e2e/          # End-to-end tests
│   └── src/
│       └── modules/
│           └── **/*.spec.ts  # Moved to test/unit/
│
└── frontend/
    └── src/
        └── __tests__/
            ├── components/  # Component tests
            └── lib/        # Utility tests
```

## Backend Tests

### Chạy tests:
```bash
cd apps/backend

# Chạy tất cả tests
npm test

# Chạy từng loại
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests
npm run test:e2e          # E2E tests
npm run test:all          # Chạy tất cả

# Watch mode
npm run test:watch

# Coverage
npm run test:cov
```

### Unit Tests
- Test business logic của services
- Mock dependencies
- Nhanh, không cần database

### Integration Tests
- Test API endpoints
- Test database interactions
- Cần test database

### E2E Tests
- Test toàn bộ flow
- Giống user thật sử dụng
- Chậm nhất, test cuối cùng

## Frontend Tests

### Chạy tests:
```bash
cd apps/frontend

# Chạy tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov
```

### Component Tests
- Test React components
- Test user interactions
- Test rendering

### Utility Tests
- Test helper functions
- Test utilities

## CI/CD Integration

### CI Pipeline tự động chạy:
1. Unit tests (frontend + backend)
2. Integration tests
3. E2E tests (optional)
4. Nếu pass → Build
5. Nếu fail → Block merge

### Branch Protection:
- PR phải pass tất cả tests
- Không merge được nếu tests fail

## Vercel Preview Deployment

### Cách setup Vercel:

1. **Tạo account Vercel**
   - Vào: https://vercel.com/signup
   - Login bằng GitHub

2. **Import project**
   - Click "New Project"
   - Select repository: `linh2206/livestream`
   - Framework: Next.js
   - Root Directory: `apps/frontend`
   - Click "Deploy"

3. **Lấy Vercel tokens**
   - Vào: https://vercel.com/account/tokens
   - Tạo token mới
   - Copy token

   - Vào Project Settings > General
   - Copy Project ID và Org ID

4. **Add GitHub Secrets**
   Vào: https://github.com/linh2206/livestream/settings/secrets/actions
   
   Thêm 3 secrets:
   - `VERCEL_TOKEN` = Token vừa tạo
   - `VERCEL_ORG_ID` = Org ID từ project settings
   - `VERCEL_PROJECT_ID` = Project ID từ project settings

### Khi tạo PR:
- ✅ Vercel tự động build frontend
- ✅ Deploy preview URL
- ✅ Comment preview URL vào PR
- ✅ Test frontend trên preview
- ✅ Merge khi preview OK

## Best Practices

### 1. Test Coverage
- Aim for 80%+ coverage
- Test critical paths first
- Don't test trivial code

### 2. Test Organization
```
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should do something', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### 3. Mock Data
```typescript
const mockUser = {
  id: '123',
  username: 'testuser',
  email: 'test@test.com',
};
```

### 4. Cleanup
```typescript
afterEach(() => {
  jest.clearAllMocks();
});
```

## Examples

### Backend Unit Test:
```typescript
it('should return user by id', async () => {
  mockUserModel.findById.mockResolvedValue(mockUser);
  const result = await service.findById('123');
  expect(result).toEqual(mockUser);
});
```

### Frontend Component Test:
```typescript
it('should render button', () => {
  render(<Button>Click</Button>);
  expect(screen.getByText('Click')).toBeInTheDocument();
});
```

### Integration Test:
```typescript
it('should login successfully', () => {
  return request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ username: 'test', password: 'test' })
    .expect(200);
});
```

## Troubleshooting

### Tests không chạy:
- Check Jest config
- Check dependencies installed
- Check file naming (*.spec.ts, *.test.tsx)

### Mock không hoạt động:
- Clear mocks trong afterEach
- Check mock implementation
- Use jest.spyOn for partial mocks

### CI tests fail nhưng local pass:
- Check environment variables
- Check database connection
- Check file paths

