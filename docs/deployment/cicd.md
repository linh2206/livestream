# Hướng dẫn Setup CI/CD với GitHub Actions

## Tổng quan

Project sử dụng 2 workflows riêng biệt:
- **CI (Continuous Integration)**: Test, lint, build code
- **CD (Continuous Deployment)**: Deploy lên server

## 1. CI - Continuous Integration

### Khi nào chạy?
- Push code lên branch `main` hoặc `develop`
- Tạo Pull Request vào branch `main`

### Làm gì?
1. **Lint**: Kiểm tra code style
2. **Type Check**: Kiểm tra TypeScript
3. **Build**: Build frontend và backend
4. **Security Scan**: Quét lỗ hổng bảo mật
5. **Docker Build Test**: Test build Docker images

### Xem kết quả:
`GitHub Repository > Actions > CI (Continuous Integration)`

---

## 2. CD - Continuous Deployment

### Khi nào chạy?
- Sau khi CI chạy thành công
- Branch `develop` → Deploy to Staging
- Branch `main` → Deploy to Production

### Làm gì?
1. SSH vào server
2. Pull code mới
3. Build và restart Docker containers
4. Health check
5. Rollback nếu failed (chỉ production)

---

## 3. Setup GitHub Secrets

### Vào: `Repository > Settings > Secrets and variables > Actions`

#### Cho Staging:
```
STAGING_HOST          = IP server staging (vd: 192.168.1.100)
STAGING_USERNAME      = Username SSH (vd: ubuntu)
STAGING_SSH_KEY       = Private SSH key (toàn bộ nội dung file)
STAGING_PORT          = SSH port (optional, default 22)
```

#### Cho Production:
```
PRODUCTION_HOST       = IP server production (vd: 123.45.67.89)
PRODUCTION_USERNAME   = Username SSH (vd: ubuntu)
PRODUCTION_SSH_KEY    = Private SSH key (toàn bộ nội dung file)
PRODUCTION_PORT       = SSH port (optional, default 22)
```

---

## 4. Setup Server

### 4.1. Tạo SSH Key (trên máy local)

```bash
# Tạo key mới
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions

# Xem private key để copy vào GitHub Secrets
cat ~/.ssh/github_actions

# Copy public key lên server
ssh-copy-id -i ~/.ssh/github_actions.pub ubuntu@YOUR_SERVER_IP
```

### 4.2. Setup Staging Server

```bash
# SSH vào server staging
ssh ubuntu@STAGING_IP

# Cài Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Cài Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone project
cd /home
sudo git clone https://github.com/YOUR_USERNAME/livestream.git livestream-staging
cd livestream-staging
sudo git checkout develop

# Set permissions
sudo chown -R $USER:$USER /home/livestream-staging
chmod 755 /home/livestream-staging

# Tạo thư mục cần thiết
mkdir -p hls/stream vod logs
chmod 755 hls vod logs

# Test run
docker-compose up -d
```

### 4.3. Setup Production Server

```bash
# SSH vào server production
ssh ubuntu@PRODUCTION_IP

# Cài Docker (same as staging)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Cài Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone project
cd /home
sudo git clone https://github.com/YOUR_USERNAME/livestream.git livestream
cd livestream

# Set permissions
sudo chown -R $USER:$USER /home/livestream
chmod 755 /home/livestream

# Tạo thư mục cần thiết
mkdir -p hls/stream vod logs
chmod 755 hls vod logs

# Test run
docker-compose up -d
```

### 4.4. Cấu hình Firewall

```bash
# Cho phép các port cần thiết
sudo ufw allow 22     # SSH
sudo ufw allow 80     # HTTP
sudo ufw allow 443    # HTTPS
sudo ufw allow 1935   # RTMP
sudo ufw allow 8080   # HLS
sudo ufw allow 3000   # Frontend
sudo ufw allow 9000   # Backend

# Enable firewall
sudo ufw enable
sudo ufw status
```

---

## 5. Test CI/CD

### Test CI:
```bash
# Tạo commit nhỏ
echo "# Test CI" >> README.md
git add README.md
git commit -m "test: trigger CI pipeline"
git push origin develop

# Xem kết quả tại: GitHub > Actions
```

### Test CD:
```bash
# Sau khi CI pass, CD sẽ tự động chạy
# Kiểm tra logs tại: GitHub > Actions > CD

# Kiểm tra trên server
ssh ubuntu@STAGING_IP
cd /home/livestream-staging
docker-compose ps
docker-compose logs -f
```

---

## 6. Workflow

### Development Flow:
```bash
# 1. Tạo feature branch
git checkout -b feature/new-feature

# 2. Code và commit
git add .
git commit -m "feat: add new feature"

# 3. Push và tạo PR
git push origin feature/new-feature
# Tạo PR trên GitHub

# 4. CI sẽ chạy tự động trên PR
# 5. Sau khi review, merge vào develop
# 6. CD sẽ deploy lên Staging
```

### Production Release Flow:
```bash
# 1. Test kỹ trên staging
# 2. Tạo PR từ develop vào main
# 3. Review kỹ
# 4. Merge vào main
# 5. CD sẽ deploy lên Production
```

---

## 7. Monitoring

### Check CI/CD status:
- Vào `GitHub > Actions`
- Xem logs chi tiết của từng job

### Check server status:
```bash
# SSH vào server
ssh ubuntu@SERVER_IP

# Kiểm tra containers
docker ps

# Xem logs
docker-compose logs -f

# Kiểm tra resources
docker stats
```

---

## 8. Troubleshooting

### CI Failed:

1. **Lint errors**:
   - Fix code theo lint rules
   - Hoặc update ESLint config

2. **Build errors**:
   - Kiểm tra dependencies
   - Kiểm tra TypeScript errors

3. **Docker build failed**:
   - Kiểm tra Dockerfile
   - Kiểm tra docker-compose.yml

### CD Failed:

1. **SSH connection failed**:
   ```bash
   # Test SSH từ local
   ssh -i ~/.ssh/github_actions ubuntu@SERVER_IP
   
   # Kiểm tra SSH key trong GitHub Secrets
   # Đảm bảo format đúng (bao gồm cả -----BEGIN... và -----END...)
   ```

2. **Git pull failed**:
   ```bash
   # Trên server, kiểm tra git status
   cd /home/livestream
   git status
   git pull origin main  # hoặc develop
   ```

3. **Docker build failed**:
   ```bash
   # Trên server, check logs
   docker-compose logs -f
   
   # Kiểm tra disk space
   df -h
   
   # Clean up
   docker system prune -af
   ```

4. **Health check failed**:
   ```bash
   # Kiểm tra containers
   docker ps
   
   # Kiểm tra logs
   docker-compose logs backend
   
   # Test health endpoint
   curl http://localhost:3000/api/v1/health
   ```

---

## 9. Advanced

### Add Slack Notification:

Thêm vào cuối file `.github/workflows/cd.yml`:

```yaml
      - name: Notify Slack
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Production deployment ${{ job.status }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Add Rollback Button:

Tạo file `.github/workflows/rollback.yml`:

```yaml
name: Rollback Production

on:
  workflow_dispatch:

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Rollback
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.PRODUCTION_USERNAME }}
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          script: |
            cd /home/livestream
            git reset --hard HEAD~1
            docker-compose down
            docker-compose up -d --build
```

---

## 10. Checklist

Trước khi production:

- [ ] CI chạy thành công trên develop
- [ ] CD deploy thành công lên staging
- [ ] Test kỹ trên staging
- [ ] Backup database production
- [ ] Review code kỹ
- [ ] Merge develop vào main
- [ ] Monitor deployment logs
- [ ] Health check production
- [ ] Test các chức năng chính

---

## Branch Protection

### Setup Branch Protection Rules:

1. Vào: https://github.com/linh2206/livestream/settings/branches
2. Click "Add branch protection rule"
3. Branch name pattern: `main`
4. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
     - Select: Test frontend, Test backend, CI Success
   - ✅ Require conversation resolution before merging
5. Click "Create"

### Workflow với Branch Protection:

```
Feature → PR → CI runs → Tests pass → Merge → CD deploys
```

Không thể push trực tiếp vào main!

---

## Kết luận

Sau khi setup xong:
- ✅ Push code → CI tự động test
- ✅ CI pass → CD tự động deploy
- ✅ develop branch → Staging
- ✅ main branch → Production
- ✅ Có rollback nếu failed
- ✅ Branch protection bảo vệ main
- ✅ Tests chạy trước khi merge

**Happy deploying! 🚀**
