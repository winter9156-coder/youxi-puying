#!/bin/bash
# ========== 幼析·育见 一键启动脚本 ==========
# 此脚本清理 NODE_OPTIONS 环境变量后启动全部服务
# 使用方式: ./launch.sh
export NODE_OPTIONS=""

PROJECT_DIR="/Users/chuningwang/WorkBuddy/20260504230058"
LOG_DIR="$PROJECT_DIR/logs"
mkdir -p "$LOG_DIR"

echo "=========================================="
echo "  幼析·育见 一键启动"
echo "  $(date)"
echo "=========================================="

# 1. 清理旧进程
echo "[1/4] 清理旧进程..."
pkill -9 -f "node server.cjs" 2>/dev/null
pkill -9 -f "cloudflared" 2>/dev/null
sleep 2

# 2. 启动本地服务
echo "[2/4] 启动本地服务器..."
cd "$PROJECT_DIR"
NODE_OPTIONS="" node server.cjs > "$LOG_DIR/server.log" 2>&1 &
SERVER_PID=$!
echo "  服务 PID: $SERVER_PID"

# 等待服务就绪
for i in $(seq 1 10); do
  sleep 1
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/ 2>/dev/null)
  if [ "$STATUS" = "200" ]; then
    echo "  ✅ 服务已就绪 (PID: $SERVER_PID)"
    break
  fi
  if [ "$i" = "10" ]; then
    echo "  ❌ 服务启动失败，查看 logs/server.log"
    cat "$LOG_DIR/server.log"
    exit 1
  fi
done

# 3. 启动 Cloudflare 隧道
echo "[3/4] 启动 Cloudflare 隧道..."
rm -f /tmp/puying_url.txt
CLOUDFLARED_BIN="/Users/chuningwang/.npm/_npx/8a26fc3a61fe4212/node_modules/cloudflared/bin/cloudflared"
if [ ! -f "$CLOUDFLARED_BIN" ]; then
  # 动态查找
  CLOUDFLARED_BIN=$(find /Users/chuningwang/.npm/_npx -name "cloudflared" -type f -path "*/bin/*" 2>/dev/null | head -1)
fi

if [ -f "$CLOUDFLARED_BIN" ]; then
  NODE_OPTIONS="" "$CLOUDFLARED_BIN" tunnel --url http://localhost:5173 > "$LOG_DIR/tunnel.log" 2>&1 &
  TUNNEL_PID=$!
  
  # 等待隧道获取 URL（最多60秒）
  for i in $(seq 1 30); do
    sleep 2
    if [ -f /tmp/puying_url.txt ]; then
      TUNNEL_URL=$(cat /tmp/puying_url.txt)
      echo "  ✅ 隧道已就绪"
      echo "  🌐 外部访问: $TUNNEL_URL"
      break
    fi
    # 也尝试从日志中提取
    TUNNEL_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_DIR/tunnel.log" 2>/dev/null | head -1)
    if [ -n "$TUNNEL_URL" ]; then
      echo "$TUNNEL_URL" > /tmp/puying_url.txt
      echo "  ✅ 隧道已就绪"
      echo "  🌐 外部访问: $TUNNEL_URL"
      break
    fi
  done
else
  echo "  ⚠️ cloudflared 二进制未找到，跳过隧道"
  TUNNEL_URL="http://localhost:5173"
fi

# 4. 最终验证
echo "[4/4] 最终验证..."
sleep 2
LOCAL_OK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/ 2>/dev/null)
echo "  本地服务: $LOCAL_OK"

if [ -n "$TUNNEL_URL" ]; then
  TUNNEL_OK=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$TUNNEL_URL" 2>/dev/null)
  echo "  隧道: $TUNNEL_OK ($TUNNEL_URL)"
fi

echo ""
echo "=========================================="
echo "  ✅ 启动完成！"
echo "  本地访问: http://localhost:5173/"
echo "  外部访问: ${TUNNEL_URL:-隧道未启动}"
echo "  PID文件: $LOG_DIR/pids.txt"
echo "=========================================="

# 保存 PID 方便后续管理
echo "server=$SERVER_PID" > "$LOG_DIR/pids.txt"
echo "tunnel=$TUNNEL_PID" >> "$LOG_DIR/pids.txt"
