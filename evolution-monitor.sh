#!/bin/bash

################################################################################
# OpenClaw Evolution System - Real-time Monitor
################################################################################

set -e

SERVER="root@43.167.189.165"
SERVICE="openclaw-evolution"
LOG_FILE="/tmp/evolution-monitor.log"
ERROR_LOG="/tmp/evolution-errors.log"
LAST_CHECK_FILE="/tmp/evolution-last-check"

# Telegram 配置（使用 OpenClaw message 工具）
NOTIFY_ENABLED=true

################################################################################
# Helper Functions
################################################################################

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ ERROR: $*" | tee -a "$ERROR_LOG"
}

notify() {
    local title="$1"
    local message="$2"
    
    if [ "$NOTIFY_ENABLED" = "true" ]; then
        echo "[通知] $title: $message"
        # 这里使用 openclaw message 发送通知
        # 实际运行时会被 OpenClaw 调用
    fi
}

################################################################################
# Check Service Status
################################################################################

check_service_status() {
    log "检查服务状态..."
    
    local status=$(ssh "$SERVER" "systemctl is-active $SERVICE 2>/dev/null || echo 'unknown'")
    
    case "$status" in
        active)
            log "✅ 服务运行中"
            return 0
            ;;
        inactive|failed)
            error "服务停止: $status"
            notify "⚠️ Evolution System 服务停止" "服务状态: $status"
            return 1
            ;;
        *)
            error "服务状态未知: $status"
            return 2
            ;;
    esac
}

################################################################################
# Check Recent Errors
################################################################################

check_errors() {
    log "检查最近错误..."
    
    local error_count=$(ssh "$SERVER" "journalctl -u $SERVICE --since '5 minutes ago' -p err -q | wc -l")
    
    if [ "$error_count" -gt 0 ]; then
        local errors=$(ssh "$SERVER" "journalctl -u $SERVICE --since '5 minutes ago' -p err -n 5")
        error "发现 $error_count 个错误"
        log "错误内容:"
        echo "$errors" | head -3 | tee -a "$ERROR_LOG"
        notify "⚠️ Evolution System 发现错误" "最近 5 分钟: $error_count 个错误"
    else
        log "✅ 无错误"
    fi
}

################################################################################
# Check Resource Usage
################################################################################

check_resources() {
    log "检查资源使用..."
    
    local memory=$(ssh "$SERVER" "systemctl show $SERVICE --property=MemoryCurrent | cut -d= -f2")
    local memory_mb=$((memory / 1024 / 1024))
    local memory_limit=1024000000  # 1GB in bytes
    
    local cpu=$(ssh "$SERVER" "systemctl show $SERVICE --property=CPUUsageNSec | cut -d= -f2")
    
    log "内存: ${memory_mb}MB | CPU: ${cpu}ns"
    
    # Memory warning (> 80%)
    if [ "$memory" -gt "$((memory_limit * 80 / 100))" ]; then
        error "内存使用过高: ${memory_mb}MB"
        notify "⚠️ Evolution System 内存警告" "使用: ${memory_mb}MB (> 80%)"
    fi
}

################################################################################
# Check Learning Progress
################################################################################

check_learning_progress() {
    log "检查学习进度..."
    
    local db_path="/root/.openclaw/knowledge/evolution.db"
    
    # 检查数据库
    if ssh "$SERVER" "[ -f $db_path ]"; then
        # 获取统计数据
        local stats=$(ssh "$SERVER" "sqlite3 $db_path \"SELECT COUNT(*) as total_items FROM knowledge\"")
        local total="$stats"
        
        local total="$stats"
        
        log "知识库: 总计 $total 条内容"
        
        # 检查是否有新的优化建议
        local optimizations=$(ssh "$SERVER" "sqlite3 $db_path \"SELECT COUNT(*) FROM optimizations WHERE status = 'PENDING'\"")
        
        if [ "$optimizations" -gt 0 ]; then
            log "🎯 发现 $optimizations 个待处理优化建议"
            notify "✨ Evolution System 新优化建议" "$optimizations 个待处理"
            
            # 显示前 3 个
            local top_opt=$(ssh "$SERVER" "sqlite3 $db_path \"SELECT title, category, risk_level FROM optimizations WHERE status = 'PENDING' LIMIT 3\"")
            log "最新建议:"
            echo "$top_opt" | tee -a "$LOG_FILE"
        fi
        
        return 0
    else
        log "⚠️ 数据库不存在"
        return 1
    fi
}

################################################################################
# Check Latest Discoveries
################################################################################

check_latest_discoveries() {
    log "检查最新发现..."
    
    local db_path="/root/.openclaw/knowledge/evolution.db"
    local last_check_file="/tmp/evolution-last-items"
    
    if ssh "$SERVER" "[ ! -f $db_path ]"; then
        return 1
    fi
    
    # 保存上次的检查状态
    local last_items=0
    if [ -f "$last_check_file" ]; then
        last_items=$(cat "$last_check_file")
    fi
    
    # 获取当前总数
    local current_items=$(ssh "$SERVER" "sqlite3 $db_path \"SELECT COUNT(*) FROM knowledge\"")
    
    # 检查是否有新内容
    if [ "$current_items" -gt "$last_items" ]; then
        local new_items=$((current_items - last_items))
        log "📚 发现 $new_items 条新内容"
        
        # 获取最新的 5 条
        local latest=$(ssh "$SERVER" "sqlite3 $db_path \"SELECT id, title, source FROM knowledge ORDER BY id DESC LIMIT 5\"")
        log "最新内容:"
        echo "$latest" | tee -a "$LOG_FILE"
        
        # 通知
        notify "📚 Evolution System 发现新内容" "$new_items 条（总计: $current_items）"
        
        # 更新检查状态
        echo "$current_items" > "$last_check_file"
    fi
}

################################################################################
# Restart Service if Failed
################################################################################

restart_if_needed() {
    local status=$(ssh "$SERVER" "systemctl is-active $SERVICE 2>/dev/null || echo 'unknown'")
    
    if [ "$status" != "active" ]; then
        log "尝试重启服务..."
        
        ssh "$SERVER" "systemctl restart $SERVICE" 2>&1 | tee -a "$LOG_FILE"
        sleep 5
        
        local new_status=$(ssh "$SERVER" "systemctl is-active $SERVICE 2>/dev/null || echo 'unknown'")
        
        if [ "$new_status" = "active" ]; then
            log "✅ 服务重启成功"
            notify "✅ Evolution System 已恢复" "服务重启成功"
        else
            error "服务重启失败"
            notify "🚨 Evolution System 无法恢复" "需要人工介入"
            return 1
        fi
    fi
}

################################################################################
# Main Monitoring Loop
################################################################################

monitor() {
    log "========================================"
    log "开始监控 Evolution System"
    log "========================================"
    
    # Check 1: Service Status
    check_service_status
    if [ $? -ne 0 ]; then
        restart_if_needed
    fi
    
    # Check 2: Recent Errors
    check_errors
    
    # Check 3: Resource Usage
    check_resources
    
    # Check 4: Learning Progress
    check_learning_progress
    
    # Check 5: Latest Discoveries
    check_latest_discoveries
    
    log "========================================"
    log "监控完成 $(date '+%Y-%m-%d %H:%M:%S')"
    log "========================================"
    echo ""
}

################################################################################
# One-time Report
################################################################################

report() {
    log "========================================"
    log "Evolution System 状态报告"
    log "========================================"
    
    # Service status
    echo ""
    echo "=== 服务状态 ==="
    ssh "$SERVER" "systemctl status $SERVICE --no-pager -l | head -10"
    
    # Resource usage
    echo ""
    echo "=== 资源使用 ==="
    ssh "$SERVER" "systemctl show $SERVICE --property=MemoryCurrent,CPUUsageNSec"
    
    # Knowledge base stats
    echo ""
    echo "=== 知识库统计 ==="
    check_learning_progress
    
    # Recent logs
    echo ""
    echo "=== 最近日志（20 行）==="
    ssh "$SERVER" "journalctl -u $SERVICE -n 20 --no-pager"
    
    log "========================================"
    log "报告完成"
    log "========================================"
}

################################################################################
# Main Entry Point
################################################################################

case "${1:-monitor}" in
    monitor)
        monitor
        ;;
    report)
        report
        ;;
    *)
        echo "Usage: $0 [monitor|report]"
        echo ""
        echo "Commands:"
        echo "  monitor  - Run monitoring checks (default)"
        echo "  report   - Generate full status report"
        exit 1
        ;;
esac
