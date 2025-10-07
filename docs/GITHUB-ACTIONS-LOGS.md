# Hướng dẫn đọc GitHub Actions Logs

## 1. Vào xem logs

1. Truy cập: https://github.com/linh2206/livestream/actions
2. Click vào workflow run (dòng đầu tiên)
3. Bạn sẽ thấy:

```
┌─────────────────────────────┐
│ CI (Workflow)               │
├─────────────────────────────┤
│ ✅ Test frontend            │
│ ✅ Test backend             │
│ ✅ Security scan            │
│ ✅ Docker build test        │
│ ✅ CI Success               │
└─────────────────────────────┘

┌─────────────────────────────┐
│ CD (Workflow)               │
├─────────────────────────────┤
│ ❌ Deploy to Production      │
│ ❌ Rollback on Failure      │
└─────────────────────────────┘
```

---

## 2. Đọc logs khi THÀNH CÔNG

### CI thành công:
```
✅ Test frontend
  ├── Checkout code
  ├── Setup Node.js
  ├── Install dependencies
  ├── Run linter (warnings OK)
  ├── Type check (pass)
  └── Build (success)

✅ Test backend
  ├── Checkout code
  ├── Setup Node.js
  ├── Install dependencies
  ├── Run linter (warnings OK)
  ├── Type check (pass)
  └── Build (success)

✅ Docker build test
  ├── Checkout code
  ├── Set up Docker Buildx
  ├── Install Docker Compose
  ├── Build Docker images (success)
  └── Test containers (up/down OK)
```

---

## 3. Đọc logs khi LỖI

### Các lỗi thường gặp:

#### ❌ Lỗi 1: "ssh: no key found"
**Nghĩa là:** Private key trong GitHub Secret sai format

**Fix:**
1. Vào: Repository > Settings > Secrets > Actions
2. Update `PRODUCTION_SSH_KEY`
3. Copy lại private key từ máy LOCAL: `cat ~/.ssh/github_actions`
4. Paste TOÀN BỘ (bao gồm BEGIN và END)

---

#### ❌ Lỗi 2: "Permission denied (publickey)"
**Nghĩa là:** Public key chưa có trên VPS

**Fix:**
```bash
# SSH vào VPS
ssh root@192.168.150.249

# Add public key
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICIGjLcHKPhiAAVJcvIe14X+mpsyi+k0jLzVUoSq0u90 github-actions-deploy" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

---

#### ❌ Lỗi 3: "dial tcp: i/o timeout"
**Nghĩa là:** Không kết nối được VPS

**Fix:**
- Kiểm tra VPS có online không
- Kiểm tra firewall: `sudo ufw allow 22`
- Kiểm tra IP đúng không

---

#### ❌ Lỗi 4: "No such file or directory: /home/livestream"
**Nghĩa là:** Project chưa clone trên VPS

**Fix:**
```bash
# SSH vào VPS
ssh root@192.168.150.249

# Clone project
cd /home
git clone https://github.com/linh2206/livestream.git
```

---

#### ❌ Lỗi 5: "docker-compose: command not found"
**Nghĩa là:** Docker chưa cài trên VPS

**Fix:**
```bash
# SSH vào VPS
ssh root@192.168.150.249

# Cài Docker
curl -fsSL https://get.docker.com | sh

# Cài Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

---

#### ❌ Lỗi 6: "Health Check failed"
**Nghĩa là:** Containers không start được hoặc port sai

**Fix:**
```bash
# SSH vào VPS
ssh root@192.168.150.249

# Kiểm tra containers
cd /home/livestream
docker-compose ps
docker-compose logs -f
```

---

## 4. Logs hiện tại của bạn

Từ screenshot:
```
❌ Deploy to Production Server (31s)
  → Container ID: e00c79b484f...
  → Đang chạy appleboy/ssh-action
  → Có nhiều environment variables
  
❌ Rollback on Failure (30s)
  → Đang rollback vì deploy failed
```

**Nghĩa là:** Deploy failed, đang rollback.

---

## 5. Cách debug nhanh

### Xem lỗi cụ thể:
1. Vào: https://github.com/linh2206/livestream/actions
2. Click vào workflow run mới nhất
3. Click vào job **Deploy to Production Server** (màu đỏ)
4. Tìm dòng có icon ❌ hoặc màu đỏ
5. Đọc message lỗi

**Lỗi thường sẽ có 1 trong những message trên ⬆️**

---

## 6. Quick fix checklist

Kiểm tra VPS có đủ không:
```bash
ssh root@192.168.150.249

# 1. Kiểm tra Docker
docker --version

# 2. Kiểm tra project
ls -la /home/livestream

# 3. Kiểm tra SSH key
cat ~/.ssh/authorized_keys | grep github-actions

# 4. Test Docker
cd /home/livestream
docker-compose ps
```

---

**Bạn muốn tôi giúp gì tiếp theo?**
- Hướng dẫn fix lỗi cụ thể?
- Hướng dẫn setup VPS từ đầu?
- Tắt CD tạm thời để chỉ chạy CI?
