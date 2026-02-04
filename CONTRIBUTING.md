# 贡献指南

感谢你对 OpenClaw Self-Evolution System 的兴趣！我们欢迎所有形式的贡献。

## 🌏 语言规范

**本项目使用中文作为主要交流语言。**

### Issue 和 PR
- **Issue 标题和描述**：请使用中文
- **PR 描述**：请使用中文
- **代码注释**：优先使用中文，技术术语可保留英文
- **Commit Message**：请使用中文（见下方规范）

**例外情况**：
- 代码本身（变量名、函数名等）使用英文
- 技术术语可以保留英文（如 API、JSON、TypeScript 等）
- 如果涉及国际化的配置文件（如 `.github` 配置），可使用英文

### 示例

✅ **推荐的 Issue 标题**：
```
【BUG】Skill Registry 无法加载 experimental 目录下的技能
【FEATURE】为 Agent Core 添加任务优先级队列
```

❌ **不推荐的 Issue 标题**：
```
Bug: Skill Registry cannot load skills in experimental dir
Add priority queue for Agent Core
```

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

使用清晰的、描述性的 commit 消息（**必须使用中文**）：

```
feat: 添加新功能
fix: 修复 bug
docs: 更新文档
style: 代码格式调整（不影响功能）
refactor: 重构代码
test: 添加或修改测试
chore: 其他杂项
```

**格式**：
```
<type>(<scope>): <subject>

<body>

<footer>
```

**示例**：
```bash
feat(analyzer): 添加新的风险分类算法

- 实现基于机器学习的风险评分
- 优化分类准确率到 95%
- 添加单元测试覆盖

Closes #123
```

**更多示例**：
```bash
fix(scheduler): 修复任务调度时的死锁问题

docs: 更新迁移指南的 Phase 3 步骤

refactor(skills): 重构 Skill Registry 加载逻辑

test(agent): 添加 Agent Core 主循环的集成测试
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
