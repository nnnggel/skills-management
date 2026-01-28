# Skills Management CLI (skm)

简体中文 | [English](./README.md)

`skm` 是一个强大的命令行工具，用于在各种 AI 编程代理和项目中管理与同步“技能”（Skills，即提示词库、指令集或能力模块）。它作为一个中心枢纽，帮助你从 GitHub 或本地目录添加技能，并将其选择性地链接到本地 AI 项目配置中。

支持多种 AI 环境，包括 **OpenCode**、**Cursor**、**Gemini**、**Antigravity**、**Claude** 和 **GitHub** 项目。

---

## 🚀 功能特性

- **全局技能仓库**：集中管理所有的 AI 技能。
- **GitHub 集成**：直接从 GitHub 仓库或指定子目录添加技能（支持稀疏检出）。
- **本地技能支持**：支持从本地目录添加技能，方便开发和调试。
- **版本控制**：检查远程更新并同步技能版本。
- **项目检测**：自动检测当前目录下的 AI 项目类型。
- **软链接管理**：通过符号链接将技能高效注入项目，避免文件复制，保持同步。
- **项目隔离**：为不同项目配置不同的技能组合。

![示意图](repo.png)

## 💡 为什么选择 skm?

- **核心效率**：技能仅克隆一次（存储在 `~/.skills-management/repo`），通过符号链接在无限个项目间共享。这不仅极大地节省了磁盘空间，还确保了所有项目使用的技能版本高度统一。
- **精准下载 (稀疏检出)**：只下载你需要的。如果一个 GitHub 仓库包含几百个技能，而你只需要其中一个，`skm` 会利用 Git 的 `sparse-checkout` 特性仅下载特定的子目录。告别为了一个几 KB 的 Prompt 而克隆整个几百 MB 仓库的时代。
- **自动化环境感知**：你不需要记住 Cursor、Claude 或 OpenCode 把技能存在哪里。`skm` 会自动识别你的项目环境并处理对应的目录结构。
- **整洁且无侵入**：由于使用的是软链接，你的项目文件夹保持纯净。不会有额外的 `.git` 文件夹或庞大的二进制文件进入你的项目版本控制。
- **自我维护**：主动检测并帮助你清理失效的软链接（例如当全局技能被删除时）。
- **版本同步**：检查技能的远程更新，确保你的“AI 大脑”始终处于最新状态。

## 📦 安装指南

可以直接从 npm 安装：

```bash
npm install -g @nnnggel/skills-management
```

或者从源码安装：

```bash
# 克隆仓库
git clone https://github.com/nnnggel/skills-management.git
cd skills-management

# 安装依赖并构建
npm install
npm run build
npm link
```

## 📖 使用指南

直接运行命令 `skm`：

```bash
skm
```

### 1. 全局仓库管理 (`repo`)

在主菜单选择 **"1. repo"** 来管理你的全局技能库。

#### 添加技能 (Add skill)

**GitHub 类型**：
- 支持完整仓库：`https://github.com/user/repo` (例子：https://github.com/blader/humanizer)
- 支持特定子目录：`https://github.com/user/repo/tree/main/path/to/skill` (例子：https://github.com/anthropics/skills/tree/main/skills/pdf)

**Local 类型**：
- 支持本地目录：`/local/path/to/skill` (例子：`~/Desktop/myskill`)

#### 其他操作

- **更新技能 (Update)**：自动检查远程仓库是否有新提交，并更新本地副本（仅支持 GitHub 类型）。
- **删除技能 (Delete)**：从全局仓库中移除技能。

### 2. 项目技能管理 (`list`)

在你的 AI 项目根目录下运行 `skm`。工具会自动识别项目类型（如 `.opencode`, `.cursor` 等）。

选择 **"2. list(type)"** 来管理当前项目的技能。

- **链接/取消链接 (Link/Unlink)**：显示全局可用技能列表。
- **复选框交互**：使用 `空格键` 选中或取消选中技能，`回车键` 确认。
- **自动注入**：选中的技能会以软链接形式注入到项目的技能目录中（例如 `.opencode/skills/`）。

### 支持的项目结构

`skm` 自动识别以下目录结构并安装技能：

| AI 类型 | 识别目录 | 技能安装路径 |
|---------|-----------------|--------------------------|
| **OpenCode** | `.opencode` | `.opencode/skills` |
| **Cursor** | `.cursor` | `.cursor/skills` |
| **Gemini** | `.gemini` | `.gemini/skills` |
| **Antigravity** | `.antigravity` | `.antigravity/skills` |
| **Claude** | `.claude` | `.claude/skills` |
| **GitHub** | `.github` | `.github/skills` |

---

## 🏗️ 目录结构与运行机制

`skm` 将所有的全局数据和配置存储在用户主目录下的 `~/.skills-management` 文件夹中。这种设计确保了技能只需下载一次，即可在多个项目间共享。

### 内部结构：

- **`config.json`**: 全局配置文件，存储系统级设置和元数据。
- **`repo/`**: 管理系统的核心目录。
    - **`skills.json`**: 技能注册表（数据库）。记录了所有已添加技能的 ID、当前 Commit Hash（用于版本追踪）、检出类型和路径信息。
    - **`[type]__[name]/`**: 本地 Skill 仓库存储中心。`skm` 会将 ID 扁平化（将 `/` 替换为 `__`）以创建安全的文件目录名。例如 `github:user/repo/path` 会被存储为 `github__user__repo__path`，`local:myskill` 会被存储为 `local__myskill`。

### Windows 兼容性说明
`skm` 完全兼容 Windows 系统。
- 在 **macOS/Linux** 上，使用标准的符号链接 (Symbolic Links)。
- 在 **Windows** 上，工具会自动使用 **Directory Junctions** (目录联接点)。这是 Windows NTFS 文件系统的一种特性，类似于目录的软链接，但通常**不需要管理员权限**即可创建，确保了最佳的开箱即用体验。


---

## 📝 更新日志

### v1.0.2
- 支持本地技能 (Local Skill)：可以直接从本地目录添加技能
- 菜单引导优化：统一使用数字菜单，添加返回选项，提升终端兼容性

## 📄 License

ISC
