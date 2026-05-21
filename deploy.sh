#!/bin/bash
# ============================================
# 幼析·育见 一键部署脚本
# 适用于 Ubuntu 22.04 + MySQL + Node.js
# ============================================

set -e

echo "========================================="
echo "  幼析·育见 部署脚本 v1.0"
echo "========================================="

# 配置区（如需修改，请在此处调整）
DB_NAME="youxi"
DB_USER="youxi_admin"
DB_PASSWORD=$(openssl rand -base64 16)
PROJECT_DIR="/opt/youxi"
DOMAIN=""  # 如有域名，填写如 youxi.example.com

# 1. 更新系统
echo "[1/8] 更新系统包..."
sudo apt update -y && sudo apt upgrade -y

# 2. 安装 Node.js 22
echo "[2/8] 安装 Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt install -y nodejs git
node -v && npm -v

# 3. 安装 MySQL
echo "[3/8] 安装 MySQL 8.0..."
sudo apt install -y mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql

# 4. 创建数据库和用户
echo "[4/8] 创建数据库..."
sudo mysql -e "
  CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
  GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
  FLUSH PRIVILEGES;
"

echo "数据库名称: ${DB_NAME}"
echo "数据库用户: ${DB_USER}"
echo "数据库密码: ${DB_PASSWORD}"

# 5. 克隆/更新项目代码
echo "[5/8] 获取项目代码..."
if [ -d "$PROJECT_DIR" ]; then
  cd $PROJECT_DIR && git pull
else
  sudo mkdir -p $PROJECT_DIR
  # 手动提示
  echo "请将项目文件上传到 ${PROJECT_DIR} 目录，然后继续执行"
  echo "或者设置 git 仓库地址:"
  read -p "Git 仓库地址 (留空跳过): " GIT_URL
  if [ -n "$GIT_URL" ]; then
    sudo git clone $GIT_URL $PROJECT_DIR
  else
    echo "请手动上传项目文件到 ${PROJECT_DIR}"
    exit 1
  fi
fi

cd $PROJECT_DIR

# 6. 安装依赖
echo "[6/8] 安装项目依赖..."
npm install --production
npm install -g pm2

# 7. 配置环境变量
echo "[7/8] 配置环境变量..."
cat > .env << EOF
DB_HOST=localhost
DB_PORT=3306
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}
EOF

# 8. 启动服务
echo "[8/8] 启动服务..."
pm2 delete youxi 2>/dev/null || true
pm2 start server.cjs --name "youxi" -o /var/log/youxi.log -e /var/log/youxi-error.log
pm2 save
pm2 startup

echo ""
echo "========================================="
echo "  部署完成！"
echo "========================================="
echo ""
echo "访问地址: http://$(curl -s ifconfig.me):5173"
echo ""
if [ -n "$DOMAIN" ]; then
  echo "如配置域名，请将 $DOMAIN 解析到本机 IP，然后配置 Nginx 反向代理"
fi
echo "数据库密码已保存到 .env 文件中，请妥善保管"
echo ""
echo "管理命令:"
echo "  pm2 status           - 查看运行状态"
echo "  pm2 logs youxi       - 查看日志"
echo "  pm2 restart youxi    - 重启服务"
echo ""

# 如果提供了域名，配置 Nginx
if [ -n "$DOMAIN" ]; then
  echo "配置 Nginx HTTPS..."
  sudo apt install -y nginx certbot python3-certbot-nginx
  
  cat > /tmp/youxi_nginx << EOF
server {
    listen 80;
    server_name ${DOMAIN};
    
    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
}
EOF
  
  sudo mv /tmp/youxi_nginx /etc/nginx/sites-available/youxi
  sudo ln -sf /etc/nginx/sites-available/youxi /etc/nginx/sites-enabled/
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo nginx -t && sudo systemctl reload nginx
  
  echo "申请 SSL 证书..."
  sudo certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN} || true
  
  echo "HTTPS 已配置: https://${DOMAIN}"
fi
