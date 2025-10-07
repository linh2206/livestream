# Frontend Testing

## Cấu trúc

```
__tests__/
├── components/
│   └── Button.test.tsx
└── lib/
    └── utils.test.ts
```

## Chạy tests

```bash
# Chạy tất cả tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov
```

## Kết quả

```
✓ Button Component (4 tests)
✓ Utils (3 tests)

Total: 7 tests passed
```

## Thêm tests mới

### Component test:
```typescript
// __tests__/components/MyComponent.test.tsx
import { render, screen } from '@testing-library/react';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Utility test:
```typescript
// __tests__/lib/myUtil.test.ts
import { myFunction } from '@/lib/myUtil';

describe('myFunction', () => {
  it('should return correct value', () => {
    expect(myFunction(1, 2)).toBe(3);
  });
});
```

