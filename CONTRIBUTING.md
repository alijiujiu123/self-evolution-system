# 贡献指南

感谢你对 OpenClaw Self-Evolution System 的兴趣！我们欢迎所有形式的贡献。

## 如何贡献

### 报告 Bug

如果你发现了 bug，请：
1. 在 [Issues](https://github.com/alijiujiu123/self-evolution-system/issues) 页面创建新 Issue
2. 使用清晰、描述性的标题
3. 提供复现步骤和预期行为
4. 包含环境信息（Node.js 版本、操作系统等）

### 提出功能建议

我们欢迎功能建议！请：
1. 先搜索现有的 Issues，避免重复
2. 清晰描述你希望的功能和用例
3. 如果可能，提供实现思路或伪代码

### 提交代码

#### 开发流程

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

#### 代码规范

- 使用 JavaScript (CommonJS) 风格
- 添加适当的注释说明复杂逻辑
- 保持代码简洁和可读性
- 遵循现有代码的风格
- 为新功能添加测试

#### Commit 消息规范

使用清晰的、描述性的 commit 消息：

```
feat: 添加新功能
fix: 修复 bug
docs: 更新文档
style: 代码格式调整（不影响功能）
refactor: 重构代码
test: 添加或修改测试
chore: 其他杂项
```

示例：
```
feat(analyzer): 添加新的风险分类算法

- 实现基于机器学习的风险评分
- 优化分类准确率
- 添加单元测试
```

### 文档贡献

如果你发现文档有错误或不清楚的地方：
1. Fork 仓库
2. 直接编辑文档文件
3. 提交 Pull Request

## 项目结构

```
self-evolution-system/
├── skill/                    # Evolution Skill 核心代码
│   ├── lib/
│   │   ├── analyzer/       # 分析器
│   │   ├── compute/        # 计算引擎
│   │   ├── deployment/     # 部署器
│   │   ├── executor/       # 执行器
│   │   ├── monitors/       # 监控器
│   │   ├── optimizer/      # 优化器
│   │   ├── storage/        # 存储层
│   │   └── utils/          # 工具库
│   └── tests/             # 测试
├── evolution-deployment/   # 部署脚本和文档
└── *.sh                    # 监控脚本
```

## 开发环境设置

1. Clone 仓库：
```bash
git clone https://github.com/alijiujiu123/self-evolution-system.git
cd self-evolution-system
```

2. 安装依赖：
```bash
cd skill
npm install
```

3. 配置环境变量：
```bash
export EVOLUTION_GITHUB_TOKEN=your_token_here
export EVOLUTION_DAILY_BUDGET=50
```

4. 运行测试：
```bash
npm test
```

## 测试

请在提交代码前确保：
- 所有现有测试通过
- 新功能有相应的测试
- 测试覆盖关键功能

## Pull Request 流程

1. 确保 PR 描述清晰说明更改的内容和原因
2. 确保 CI 检查通过
3. 响应代码审查意见
4. 保持 PR 范围小且集中

## 行为准则

- 保持尊重和专业的态度
- 欢迎不同的观点和建设性的批评
- 专注于对项目的最佳利益

## 获取帮助

如果你有任何问题：
- 查看 [Issues](https://github.com/alijiujiu123/self-evolution-system/issues) 看是否有人已经提问
- 创建新的 Issue 提出问题
- 查看 [文档](README.md)

## 许可证

通过贡献，你同意你的贡献将使用 MIT 许可证。

---

再次感谢你的贡献！
