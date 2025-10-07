# Backend Testing

## Cấu trúc

```
test/
└── unit/
    ├── jest.config.js
    └── simple.spec.ts
```

## Chạy tests

```bash
# Chạy tất cả tests
npm test

# Chạy unit tests
npm run test:unit

# Watch mode
npm run test:watch

# Coverage
npm run test:cov
```

## Kết quả

```
✓ Simple Unit Tests (4 tests)
  ✓ should pass basic math test
  ✓ should handle strings correctly
  ✓ should work with arrays
  ✓ should work with objects
```

## Thêm tests mới

Tạo file mới trong `test/unit/*.spec.ts`

```typescript
describe('YourService', () => {
  it('should do something', () => {
    expect(true).toBe(true);
  });
});
```

