# OpenClaw Evolution System - 24/7 Production Deployment

**完整的生产级部署方案**

---

## 📦 包含内容

### ✅ 完整的部署文件

```
evolution-deployment/
├── systemd/
│   └── openclaw-evolution.service    # Systemd 服务文件
├── install.sh                         # 自动安装脚本
├── test.sh                            # 部署前测试脚本
├── README.md                          # 完整部署指南
└── CRON.md                            # Cron 配置示例
```

### 🎯 核心特性

**双重保障机制**:
1. **Systemd**: 主进程 24/7 运行 + 自动重启
2. **Cron**: 定期学习循环（即使主进程挂掉也能恢复）

---

## 🚀 快速开始

### 1. 测试文件（可选）

```bash
cd /root/.openclaw/workspace/evolution-deployment
bash test.sh
```

### 2. 运行安装

```bash
sudo ./install.sh
```

### 3. 验证运行

```bash
# 检查服务状态
sudo systemctl status openclaw-evolution

# 查看日志
sudo journalctl -u openclaw-evolution -f

# 手动运行学习循环
cd /usr/local/lib/node_modules/openclaw/skills/evolution
node index.js learn
```

---

## 📋 Systemd Service 特性

### 自动重启
- **崩溃后 10 秒自动重启**
- **1 分钟内最多重启 3 次**（防止无限重启）
- **开机自动启动**

### 资源限制
- **内存**: 最大 2GB
- **CPU**: 200%（2 核）
- **文件描述符**: 65536

### 安全配置
- **无新权限**
- **独立的 /tmp**
- **系统目录只读**
- **仅允许写入 /root/.openclaw/knowledge**

### 日志
- **systemd journal** 集成
- **标准输出 + 错误流记录**
- **标识符**: `openclaw-evolution`

---

## ⏰ Cron 配置

### OpenClaw Cron（推荐）

```bash
# 每 30 分钟运行一次
openclaw cron add \
  --name "evolution-learning-cycle" \
  --schedule "*/30 * * * *" \
  --session "main" \
  --payload '{"kind":"systemEvent","text":"Run Evolution System learning cycle: cd /usr/local/lib/node_modules/openclaw/skills/evolution && node index.js learn"}'
```

### 系统 Cron（备选）

```bash
# 编辑 root crontab
sudo crontab -e

# 添加行：
*/30 * * * * cd /usr/local/lib/node_modules/openclaw/skills/evolution && /usr/bin/node index.js learn >> /var/log/evolution-cron.log 2>&1
```

### 调度选项

```bash
# 每 30 分钟（推荐）
*/30 * * * *

# 每小时
0 * * * *

# 每 6 小时
0 */6 * * *

# 工作时间（8:00-20:00）
*/15 8-20 * * *
```

---

## 🔧 配置选项

### 环境变量

在 `/etc/systemd/system/openclaw-evolution.service` 中修改：

```ini
[Service]
# AI 模型选择
Environment="EVOLUTION_MODEL_CLASSIFIER=glm-4-flash"
Environment="EVOLUTION_MODEL_ANALYZER=glm-4.7"

# 每日预算（元）
Environment="EVOLUTION_DAILY_BUDGET=50"

# 云计算开关
Environment="EVOLUTION_ENABLE_CLOUD=false"

# 监控间隔（秒）
Environment="EVOLUTION_CHECK_INTERVAL_FAST=30"
Environment="EVOLUTION_CHECK_INTERVAL_MED=300"
Environment="EVOLUTION_CHECK_INTERVAL_SLOW=3600"

# GitHub Token（可选）
Environment="EVOLUTION_GITHUB_TOKEN=ghp_xxx"
```

### 修改后重载

```bash
sudo systemctl daemon-reload
sudo systemctl restart openclaw-evolution
```

---

## 📊 管理命令

```bash
# 启动/停止/重启
sudo systemctl start openclaw-evolution
sudo systemctl stop openclaw-evolution
sudo systemctl restart openclaw-evolution

# 开机自启
sudo systemctl enable openclaw-evolution
sudo systemctl disable openclaw-evolution

# 查看状态
sudo systemctl status openclaw-evolution

# 查看日志
sudo journalctl -u openclaw-evolution -f           # 实时
sudo journalctl -u openclaw-evolution -n 100        # 最近 100 行
sudo journalctl -u openclaw-evolution --since today # 今天
```

---

## 📈 监控和调试

### 检查 Token 使用

```bash
# 效率报告
cd /usr/local/lib/node_modules/openclaw/skills/evolution
node lib/utils/efficiency-report.cjs

# 数据库查询
sqlite3 /root/.openclaw/knowledge/evolution.db \
  "SELECT * FROM token_metrics ORDER BY timestamp DESC LIMIT 10"
```

### 查看学习进度

```bash
# 状态报告
node index.js status

# 完整报告
node index.js report
```

### 日志位置

- **Systemd**: `journalctl -u openclaw-evolution`
- **Evolution**: `/root/.openclaw/evolution-log.json`
- **Cron**: `/var/log/evolution-cron.log`

---

## 🛡️ 安全考虑

### 文件权限

```bash
# 知识目录（仅 root 可访问）
chmod 700 /root/.openclaw/knowledge

# 服务文件
chmod 644 /etc/systemd/system/openclaw-evolution.service
```

### GitHub Token 安全

使用 systemd credentials 文件：

```bash
# 1. 创建凭证文件
sudo mkdir -p /etc/openclaw
sudo nano /etc/openclaw/evolution.conf
# 添加: EVOLUTION_GITHUB_TOKEN=ghp_xxx

# 2. 锁定文件
sudo chmod 600 /etc/openclaw/evolution.conf

# 3. 修改服务使用它
# 在 [Service] 段添加:
# EnvironmentFile=/etc/openclaw/evolution.conf
```

---

## ⚡ 预期资源使用

### 每日消耗（保守估计）

- **Token**: 50万-200万
- **成本**: ¥5-20
- **CPU**: 低（平均 5-15%）
- **内存**: 200-500MB
- **存储增长**: ~100MB/月

### 启用云计算后

- **额外成本**: ¥5-50/天（AWS/Docker）
- **处理速度**: 提升 2-5 倍

---

## 🎯 成功标准

✅ 服务 24/7 运行无崩溃  
✅ 故障后自动重启  
✅ Cron 每隔 30 分钟运行  
✅ 学习循环成功完成  
✅ Token 消耗在预算内  
✅ 定期生成优化建议  

---

## 📚 相关文档

- **README.md**: 完整部署指南
- **CRON.md**: Cron 配置详细说明
- **SKILL.md**: Evolution System 技术文档

---

## 🆘 故障排除

### 服务无法启动

```bash
# 查看错误日志
sudo journalctl -u openclaw-evolution -n 50

# 常见问题:
# 1. Node.js 路径错误 → 修正 ExecStart
# 2. 权限问题 → 检查 ReadWritePaths
# 3. 依赖缺失 → cd skill_dir && npm install
```

### 高内存使用

```bash
# 降低资源限制
sudo nano /etc/systemd/system/openclaw-evolution.service
# 修改: MemoryMax=1G, CPUQuota=100%

# 重启
sudo systemctl daemon-reload
sudo systemctl restart openclaw-evolution
```

### Cron 未运行

```bash
# 检查 crontab
sudo crontab -l

# 查看系统日志
sudo grep CRON /var/log/syslog

# 手动测试
cd /usr/local/lib/node_modules/openclaw/skills/evolution
node index.js learn
```

---

## 📝 版本信息

- **创建时间**: 2026-02-03
- **版本**: 1.0.0
- **状态**: ✅ Production Ready
- **兼容**: OpenClaw 2026.2.1+

---

## 🎉 快速命令参考

```bash
# 安装
sudo ./install.sh

# 状态
sudo systemctl status openclaw-evolution

# 日志
sudo journalctl -u openclaw-evolution -f

# 手动学习
cd /usr/local/lib/node_modules/openclaw/skills/evolution && node index.js learn

# 报告
node index.js report

# 重启
sudo systemctl restart openclaw-evolution
```

---

**准备好让 AI 助手 24/7 自我进化了吗？** 🚀
