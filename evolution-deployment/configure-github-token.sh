#!/bin/bash

################################################################################
# GitHub Token 配置脚本 - Evolution System
################################################################################

set -e

echo "🔑 Evolution System - GitHub Token 配置"
echo "======================================"
echo ""

# 检查是否已有配置
if [ -s /etc/openclaw/evolution.conf ]; then
    echo "⚠️  配置文件已存在"
    echo ""
    echo "当前配置（隐藏 Token）:"
    sudo cat /etc/openclaw/evolution.conf | sed 's/ghp_.*/ghp_********/g'
    echo ""
    read -p "是否覆盖? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "取消配置"
        exit 0
    fi
fi

echo "请选择 GitHub Token 获取方式:"
echo ""
echo "1) 手动输入已有 Token"
echo "2) 使用 GitHub CLI 获取（推荐）"
echo "3) 在 GitHub 网站创建新 Token"
echo ""
read -p "选择 (1-3): " choice

case $choice in
    1)
        echo ""
        echo "请输入 GitHub Token (格式: ghp_xxxxxxxxxxxxxxxxxxxx):"
        read -s TOKEN
        echo ""

        if [[ ! $TOKEN =~ ^ghp_[a-zA-Z0-9]{36,}$ ]]; then
            echo "❌ Token 格式无效"
            echo "正确格式: ghp_xxxxxxxxxxxxxxxxxxxx"
            exit 1
        fi

        # 写入配置
        echo "EVOLUTION_GITHUB_TOKEN=$TOKEN" | sudo tee /etc/openclaw/evolution.conf > /dev/null
        ;;

    2)
        echo ""
        echo "📦 检查 GitHub CLI..."

        if ! command -v gh &> /dev/null; then
            echo "❌ GitHub CLI 未安装，正在安装..."

            # 安装 GitHub CLI
            curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
            echo 'deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main' | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
            sudo apt update
            sudo apt install -y gh

            echo "✅ GitHub CLI 安装完成"
        fi

        echo ""
        echo "使用 GitHub CLI 登录..."
        gh auth login

        echo ""
        echo "获取 Token..."
        TOKEN=$(gh auth token)

        if [ -z "$TOKEN" ]; then
            echo "❌ 获取 Token 失败"
            exit 1
        fi

        # 写入配置
        echo "EVOLUTION_GITHUB_TOKEN=$TOKEN" | sudo tee /etc/openclaw/evolution.conf > /dev/null
        ;;

    3)
        echo ""
        echo "📝 创建 GitHub Personal Access Token:"
        echo ""
        echo "1. 访问: https://github.com/settings/tokens"
        echo "2. 点击 'Generate new token' → 'Generate new token (classic)'"
        echo "3. 设置权限:"
        echo "   ✅ repo (full control of private repositories)"
        echo "   ✅ issues (read and write)"
        echo "4. 生成并复制 Token"
        echo ""
        echo "按回车继续..."
        read

        echo ""
        echo "请粘贴刚才生成的 Token:"
        read -s TOKEN
        echo ""

        if [[ ! $TOKEN =~ ^ghp_[a-zA-Z0-9]{36,}$ ]]; then
            echo "❌ Token 格式无效"
            exit 1
        fi

        # 写入配置
        echo "EVOLUTION_GITHUB_TOKEN=$TOKEN" | sudo tee /etc/openclaw/evolution.conf > /dev/null
        ;;

    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

# 设置权限
sudo chmod 600 /etc/openclaw/evolution.conf

echo ""
echo "✅ Token 已保存到 /etc/openclaw/evolution.conf"
echo ""

# 验证
echo "验证配置:"
if [ -s /etc/openclaw/evolution.conf ]; then
    echo "  ✅ 文件存在"
    echo "  ✅ 权限: $(ls -la /etc/openclaw/evolution.conf | awk '{print $1}')"
    echo "  ✅ 内容: $(sudo cat /etc/openclaw/evolution.conf | sed 's/ghp_.*/ghp_********/g')"
fi

echo ""
echo "======================================"
echo "📋 下一步:"
echo ""
echo "1. 更新 systemd 服务文件以使用配置:"
echo "   sudo sed -i '/\[Service\]/a EnvironmentFile=/etc/openclaw/evolution.conf' /etc/systemd/system/openclaw-evolution.service"
echo ""
echo "2. 重新加载并重启服务:"
echo "   sudo systemctl daemon-reload"
echo "   sudo systemctl restart openclaw-evolution"
echo ""
echo "3. 验证服务运行:"
echo "   sudo systemctl status openclaw-evolution"
echo ""
echo "4. 测试 Issue 创建:"
echo "   cd /usr/local/lib/node_modules/openclaw/skills/evolution"
echo "   node index.cjs learn"
echo ""
echo "======================================"

# 询问是否立即应用
read -p "是否立即应用配置并重启服务? (Y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
    echo ""
    echo "正在应用配置..."

    # 检查是否已有 EnvironmentFile
    if sudo grep -q "EnvironmentFile=/etc/openclaw/evolution.conf" /etc/systemd/system/openclaw-evolution.service; then
        echo "  ✅ EnvironmentFile 已存在"
    else
        echo "  添加 EnvironmentFile..."
        sudo sed -i '/\[Service\]/a EnvironmentFile=/etc/openclaw/evolution.conf' /etc/systemd/system/openclaw-evolution.service
    fi

    echo "  重新加载 systemd..."
    sudo systemctl daemon-reload

    echo "  重启服务..."
    sudo systemctl restart openclaw-evolution

    sleep 2

    if sudo systemctl is-active --quiet openclaw-evolution; then
        echo ""
        echo "✅ 服务重启成功！"
        echo ""
        sudo systemctl status openclaw-evolution --no-pager | head -10
    else
        echo ""
        echo "❌ 服务启动失败"
        echo "查看日志: sudo journalctl -u openclaw-evolution -n 20"
        exit 1
    fi
fi

echo ""
echo "🎉 配置完成！"
echo ""
echo "现在 Evolution System 将自动为 MEDIUM 风险的优化建议创建 GitHub Issues"
