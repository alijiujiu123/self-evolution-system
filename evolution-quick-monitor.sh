#!/bin/bash

################################################################################
# Evolution System Quick Monitor (for cron)
################################################################################

SERVER="root@43.167.189.165"
SERVICE="openclaw-evolution"
LOG_FILE="/tmp/evolution-quick-monitor.log"

# Telegram 通知配置
CHANNEL="telegram"
TARGET="6546260475"

# 通知函数
notify() {
    local emoji="$1"
    local title="$2"
    local message="$3"
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $emoji $title: $message" | tee -a "$LOG_FILE"
    
    # 使用 OpenClaw message 发送通知
    if command -v openclaw &> /dev/null; then
        # 通过发送到主会话来触发通知
        echo "$emoji $title: $message" | tee /tmp/evolution-notify.txt
    fi
}

# 检查服务状态
check_service() {
    local status=$(ssh "$SERVER" "systemctl is-active $SERVICE 2>/dev/null")
    
    if [ "$status" != "active" ]; then
        notify "⚠️" "服务停止" "Evolution System 服务停止: $status"
        
        # 尝试重启
        ssh "$SERVER" "systemctl restart $SERVICE" > /dev/null 2>&1
        sleep 3
        
        local new_status=$(ssh "$SERVER" "systemctl is-active $SERVICE 2>/dev/null")
        if [ "$new_status" = "active" ]; then
            notify "✅" "服务恢复" "服务重启成功"
        else
            notify "🚨" "无法恢复" "需要人工介入！"
        fi
        return 1
    fi
    
    return 0
}

# 检查错误
check_errors() {
    local error_count=$(ssh "$SERVER" "journalctl -u $SERVICE --since '5 minutes ago' -p err -q 2>/dev/null | wc -l")
    
    if [ "$error_count" -gt 5 ]; then
        local errors=$(ssh "$SERVER" "journalctl -u $SERVICE --since '5 minutes ago' -p err -n 3 --no-pager 2>/dev/null")
        notify "⚠️" "发现错误" "最近 5 分钟: $error_count 个错误"
    fi
}

# 检查新内容
check_discoveries() {
    local last_check="/tmp/evolution-last-check"
    local db_path="/root/.openclaw/knowledge/evolution.db"
    
    local current=0
    if ssh "$SERVER" "[ -f $db_path ]"; then
        current=$(ssh "$SERVER" "sqlite3 $db_path \"SELECT COUNT(*) FROM knowledge\"")
    fi
    
    local last=0
    if [ -f "$last_check" ]; then
        last=$(cat "$last_check")
    fi
    
    if [ "$current" -gt 0 ] && [ "$current" -gt "$((last + 100))" ]; then
        local new=$((current - last))
        notify "📚" "新内容" "发现 $new 条新内容（总计: $current）"
    fi
    
    echo "$current" > "$last_check"
}

# 检查优化建议
check_optimizations() {
    local db_path="/root/.openclaw/knowledge/evolution.db"
    
    if ! ssh "$SERVER" "[ -f $db_path ]"; then
        return
    fi
    
    local pending=$(ssh "$SERVER" "sqlite3 $db_path \"SELECT COUNT(*) FROM optimizations WHERE status = 'PENDING'\"")
    
    if [ "$pending" -gt 0 ]; then
        notify "✨" "新优化建议" "$pending 个待处理优化建议"
        
        # 获取最新的建议
        local latest=$(ssh "$SERVER" "sqlite3 $db_path \"SELECT title FROM optimizations WHERE status = 'PENDING' LIMIT 1\"")
        echo "建议: $latest" >> "$LOG_FILE"
    fi
}

# 检查资源使用
check_resources() {
    local memory=$(ssh "$SERVER" "systemctl show $SERVICE --property=MemoryCurrent | cut -d= -f2")
    local memory_mb=$((memory / 1024 / 1024))
    local limit=1024000000  # 1GB
    
    if [ "$memory" -gt "$((limit * 80 / 100))" ]; then
        notify "⚠️" "内存警告" "使用: ${memory_mb}MB (> 80%)"
    fi
}

# 主监控流程
main() {
    echo "=========================================" >> "$LOG_FILE"
    echo "Quick Monitor: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
    
    check_service
    check_errors
    check_resources
    check_discoveries
    check_optimizations
    
    echo "Done" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
}

main
