# Hướng dẫn Deploy với GitHub Actions

## 1. Chuẩn bị VPS

### Tạo VPS (Ubuntu 20.04+)
```bash
# Cài đặt Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Cài đặt Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Cài đặt Git
sudo apt update
sudo apt install git -y
```

### Tạo SSH Key
```bash
# Trên máy local
ssh-keygen -t rsa -b 4096 -C "github-actions"
# Lưu vào ~/.ssh/github_actions_key

# Copy public key lên VPS
ssh-copy-id -i ~/.ssh/github_actions_key.pub user@your-vps-ip
```

## 2. Setup GitHub Secrets

Vào **GitHub Repository > Settings > Secrets and variables > Actions**

Thêm các secrets:
- `VPS_HOST`: IP của VPS (ví dụ: 123.456.789.0)
- `VPS_USERNAME`: Username VPS (ví dụ: root hoặc ubuntu)
- `VPS_SSH_KEY`: Nội dung file private key (~/.ssh/github_actions_key)

## 3. Setup VPS

### Clone repository
```bash
cd /home
git clone https://github.com/your-username/livestream.git
cd livestream
```

### Tạo thư mục cần thiết
```bash
mkdir -p hls/stream
mkdir -p vod
mkdir -p logs
chmod 755 hls vod logs
```

### Cấu hình firewall
```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 1935  # RTMP
sudo ufw allow 8080  # HLS
sudo ufw allow 3000  # Frontend
sudo ufw allow 9000  # Backend
sudo ufw enable
```

## 4. Test Deployment

### Push code để trigger deployment
```bash
git add .
git commit -m "test: trigger deployment"
git push origin main
```

### Kiểm tra logs
```bash
# Trên VPS
cd /home/livestream
docker-compose logs -f

# Kiểm tra containers
docker ps
```

## 5. Cấu hình Domain (Optional)

### Nginx Reverse Proxy
```bash
sudo apt install nginx -y

# Tạo config
sudo nano /etc/nginx/sites-available/livestream
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /hls {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/livestream /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL với Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

## 6. Monitoring

### Kiểm tra status
```bash
# Containers
docker ps

# Logs
docker-compose logs -f

# Resources
docker stats

# Disk space
df -h
```

### Auto restart nếu crash
```bash
# Thêm vào crontab
crontab -e

# Thêm dòng này
*/5 * * * * cd /home/livestream && docker-compose ps | grep -q "Exit" && docker-compose up -d
```

## 7. Backup

### Backup database
```bash
# Tạo script backup
nano /home/backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec livestream-mongodb mongodump --out /backup/$DATE
tar -czf /home/backups/mongodb_$DATE.tar.gz /home/livestream/mongodb_data
```

```bash
chmod +x /home/backup.sh

# Chạy backup hàng ngày
crontab -e
# Thêm: 0 2 * * * /home/backup.sh
```

## 8. Troubleshooting

### Lỗi thường gặp:

1. **SSH connection failed**
   - Kiểm tra VPS_HOST, VPS_USERNAME, VPS_SSH_KEY
   - Test SSH: `ssh -i ~/.ssh/github_actions_key user@vps-ip`

2. **Docker build failed**
   - Kiểm tra Dockerfile
   - Kiểm tra disk space: `df -h`

3. **Port already in use**
   - Kiểm tra port: `netstat -tulpn | grep :3000`
   - Kill process: `sudo kill -9 PID`

4. **Health check failed**
   - Kiểm tra containers: `docker ps`
   - Kiểm tra logs: `docker-compose logs`

### Debug commands:
```bash
# Kiểm tra GitHub Actions logs
# Vào GitHub > Actions > Workflow runs

# Kiểm tra VPS
ssh user@vps-ip
cd /home/livestream
docker-compose logs -f
```

## 9. Security

### Cập nhật hệ thống
```bash
sudo apt update && sudo apt upgrade -y
```

### Cấu hình SSH
```bash
sudo nano /etc/ssh/sshd_config
# Thay đổi port SSH, disable root login
sudo systemctl restart ssh
```

### Firewall rules
```bash
sudo ufw status
sudo ufw deny 22  # Nếu dùng port SSH khác
```

## 10. Performance

### Tối ưu Docker
```bash
# Tăng memory limit
echo '{"default-ulimits":{"memlock":{"Hard":-1,"Name":"memlock","Soft":-1}}}' | sudo tee /etc/docker/daemon.json
sudo systemctl restart docker
```

### Monitoring resources
```bash
# Cài đặt htop
sudo apt install htop -y
htop
```

## Kết quả

Sau khi setup xong:
- ✅ Code push lên GitHub sẽ tự động deploy
- ✅ VPS sẽ tự động update và restart containers
- ✅ Health check đảm bảo service hoạt động
- ✅ Có thể truy cập qua domain hoặc IP

**URLs:**
- Frontend: http://your-domain.com hoặc http://vps-ip:3000
- Backend API: http://your-domain.com/api hoặc http://vps-ip:9000
- RTMP: rtmp://your-domain.com:1935/live
- HLS: http://your-domain.com:8080/hls
