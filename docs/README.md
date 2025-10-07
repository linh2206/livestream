# Documentation

Tài liệu hướng dẫn cho LiveStream Platform.

## 📚 Danh sách tài liệu

### 1. [CI/CD Setup](./CICD-SETUP.md)
Hướng dẫn setup CI/CD với GitHub Actions:
- Setup GitHub Secrets
- Cấu hình server (staging/production)
- SSH key generation
- Branch Protection
- Troubleshooting

### 2. [Testing Guide](./TESTING.md)
Hướng dẫn viết và chạy tests:
- Unit tests (backend/frontend)
- Integration tests
- E2E tests
- Test coverage
- Vercel preview deployment

### 3. [Development Workflow](./WORKFLOW.md)
Quy trình phát triển và git workflow:
- Branching strategy
- Commit conventions
- Pull request process
- Code review

### 4. [FFmpeg Setup](./FFMPEG-README.md)
Hướng dẫn cài đặt và sử dụng FFmpeg:
- Installation methods
- Compilation from source
- Troubleshooting

---

## 🚀 Quick Start

### Development:
```bash
# Clone project
git clone https://github.com/linh2206/livestream.git
cd livestream

# Start services
docker-compose up -d

# Hoặc dùng Makefile
make start
```

### Testing:
```bash
# Backend tests
cd apps/backend
npm test

# Frontend tests
cd apps/frontend
npm test
```

### Deployment:
```bash
# Push code
git push origin main

# CI/CD tự động:
# 1. CI chạy tests
# 2. CD deploy lên production
```

---

## 📖 Chi tiết

Xem từng file docs để biết thêm chi tiết về:
- CI/CD pipeline
- Testing strategies
- Development workflow
- FFmpeg configuration

---

## 🆘 Support

Nếu gặp vấn đề:
1. Kiểm tra GitHub Actions logs
2. Xem Troubleshooting sections
3. Tạo issue trên GitHub

