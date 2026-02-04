# GitHub Token 配置指南 - Evolution System

**目标**: 启用自动创建 GitHub Issues 功能

---

## 🎯 快速配置（3 种方式）

### 方式 1: 使用配置脚本（推荐）

```bash
# 1. 复制脚本到服务器
scp /root/.openclaw/workspace/evolution-deployment/configure-github-token.sh root@115.191.18.218:/tmp/

# 2. SSH 登录服务器
ssh root@115.191.18.218

# 3. 运行配置脚本
cd /tmp
chmod +x configure-github-token.sh
./configure-github-token.sh
```

脚本将引导你完成：
- 输入或获取 GitHub Token
- 自动保存到安全位置
- 更新 systemd 服务
- 重启并验证

---

### 方式 2: 手动配置（快速）

```bash
# 1. 创建配置文件
sudo mkdir -p /etc/openclaw
sudo nano /etc/openclaw/evolution.conf

# 2. 添加以下内容（替换为你的 Token）
EVOLUTION_GITHUB_TOKEN=ghp_your_token_here

# 3. 保存并设置权限
sudo chmod 600 /etc/openclaw/evolution.conf

# 4. 更新 systemd 服务文件
sudo sed -i '/\[Service\]/a EnvironmentFile=/etc/openclaw/evolution.conf' /etc/systemd/system/openclaw-evolution.service

# 5. 重新加载并重启
sudo systemctl daemon-reload
sudo systemctl restart openclaw-evolution

# 6. 验证
sudo systemctl status openclaw-evolution
```

---

### 方式 3: 一键命令（最简单）

如果你已经有 Token：

```bash
# 一条命令完成配置
ssh root@115.191.18.218 << 'ENDSSH'
TOKEN="ghp_your_token_here"
sudo mkdir -p /etc/openclaw
echo "EVOLUTION_GITHUB_TOKEN=$TOKEN" | sudo tee /etc/openclaw/evolution.conf > /dev/null
sudo chmod 600 /etc/openclaw/evolution.conf
sudo sed -i '/\[Service\]/a EnvironmentFile=/etc/openclaw/evolution.conf' /etc/systemd/system/openclaw-evolution.service
sudo systemctl daemon-reload
sudo systemctl restart openclaw-evolution
sudo systemctl status openclaw-evolution | head -10
ENDSSH
```

---

## 🔑 如何获取 GitHub Token

### 选项 A: 使用 GitHub CLI（推荐）

```bash
# 1. 安装 GitHub CLI（如果未安装）
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
&& echo 'deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main' | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
&& sudo apt update \
&& sudo apt install gh

# 2. 登录
gh auth login

# 3. 获取 Token
gh auth token
```

### 选项 B: 网站创建（备用）

1. 访问: https://github.com/settings/tokens
2. 点击 "Generate new token" → "Generate new token (classic)"
3. 设置名称: `evolution-system`
4. 选择权限:
   - ✅ **repo** (full control of private repositories)
   - ✅ **issues** (read and write)
5. 点击 "Generate token"
6. **立即复制 Token**（只显示一次！）

格式: `ghp_xxxxxxxxxxxxxxxxxxxx`

---

## ✅ 验证配置

### 1. 检查配置文件

```bash
ssh root@115.191.18.218
cat /etc/openclaw/evolution.conf | sed 's/ghp_.*/ghp_********/g'
```

应该看到:
```
EVOLUTION_GITHUB_TOKEN=ghp_********
```

### 2. 检查服务状态

```bash
sudo systemctl status openclaw-evolution
```

应该看到: `Active: active (running)`

### 3. 检查环境变量

```bash
sudo systemctl show openclaw-evolution | grep Environment
```

应该看到:
```
EnvironmentFile=/etc/openclaw/evolution.conf
```

### 4. 测试 Issue 创建

```bash
cd /usr/local/lib/node_modules/openclaw/skills/evolution
node index.cjs learn
```

运行后查看:
```bash
# 查看执行结果
tail -20 /var/log/evolution-cron.log

# 访问 GitHub Issues
# https://github.com/alijiujiu123/openclaw/issues
```

---

## 🔒 安全注意事项

1. **文件权限**: 确保配置文件权限为 `600` (只有 root 可读写)
   ```bash
   sudo chmod 600 /etc/openclaw/evolution.conf
   ```

2. **Token 作用域**: 只给必要的权限（repo + issues）

3. **定期轮换**: 建议每 3-6 个月更换一次 Token

4. **不要提交到 Git**: 确保 `/etc/openclaw/` 在 `.gitignore` 中

---

## 🐛 故障排除

### 问题 1: 服务启动失败

```bash
# 查看错误日志
sudo journalctl -u openclaw-evolution -n 30

# 常见原因:
# - Token 格式错误
# - 文件权限不正确
# - EnvironmentFile 路径错误
```

### 问题 2: Issue 未创建

```bash
# 检查 Token 是否有效
curl -H "Authorization: Bearer $(grep TOKEN /etc/openclaw/evolution.conf | cut -d= -f2)" \
  https://api.github.com/repos/alijiujiu123/openclaw/issues

# 手动运行学习循环
cd /usr/local/lib/node_modules/openclaw/skills/evolution
node index.cjs learn

# 查看日志
tail -f /var/log/evolution/cron.log
```

### 问题 3: Token 过期

```bash
# 重新配置
rm /etc/openclaw/evolution.conf
./configure-github-token.sh
```

---

## 📊 配置后的效果

### 自动创建的 GitHub Issue

**示例**:

```markdown
## 🤖 Auto-Generated: Refactor error handling pattern

### 📄 Target File
skills/*/lib/*.cjs

### 🎯 Type
refactor

### 💡 Description
Refactor error handling pattern across multiple skills to use structured logging

### 🔄 Diff Preview
```diff
- catch (error) {
-   console.error(error);
- }
+ catch (error) {
+   this.logger.error('Operation failed', { error: error.message });
+ }
```

### 📊 Priority
Medium

### ⏱️ Estimated Effort
2 hours

### ⚠️ Risks
- Breaking change if external code depends on error format
- Requires testing all skills

### 💡 Benefits
- Consistent error handling
- Better debugging with structured logs
- Easier error tracking

### 🔗 Source
MEMORY.md

---

*Generated by OpenClaw Evolution System*
*Date: 2026-02-03 21:35:00*
*Risk Level: MEDIUM*
```

### 标签

所有自动生成的 Issue 都会打上标签:
- `optimization`
- `auto-generated`
- `medium` (风险等级)

---

## 🎯 下一步

配置完成后：

1. ✅ **等待下一个 Cron 周期**（30 分钟）
2. ✅ **查看新创建的 Issues**
3. ✅ **Review 并 Apply**
4. ✅ **Close Issue**

或者手动触发：

```bash
ssh root@115.191.18.218
cd /usr/local/lib/node_modules/openclaw/skills/evolution
node index.cjs learn
```

---

**准备好配置了吗？选择上面的任一方式开始！** 🚀
