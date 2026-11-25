# Agent Skills 安装目录（SOP / 事实基线）

> Layer 1 文档。`src/core/agents.ts` 的 `AGENTS` 表是唯一实现来源，本文档负责解释**为什么**是这些路径、证据在哪、新 agent 怎么加。

## 1. 生态现状（不做假设，先看证据）

整个生态已收敛到 **Agent Skills 开放规范**（<https://agentskills.io/specification>）：

```text
<skills-dir>/<name>/SKILL.md      # SKILL.md = YAML frontmatter + Markdown
<skills-dir>/<name>/scripts/      # 可选
<skills-dir>/<name>/references/   # 可选
<skills-dir>/<name>/assets/       # 可选
```

必须字段：`name`（≤64 字符，小写字母/数字/连字符）、`description`（≤1024 字符）。
规范要求 **`name` 必须等于父目录名**。

跨工具通用目录是 **`.agents/skills/`**（项目级）与 **`~/.agents/skills/`**（用户级），目前被 ~20 个客户端读取，是「一次安装、多工具可用」的最佳落点。

## 2. 路径矩阵

`project` = 相对项目根；`global` = 用户主目录下。同一 agent 多个目录时，**第一个命中的优先**（`detectAll` 里 `break`）。

### 2.1 通用 `.agents/skills` 组

| Agent | project | global | 检测路径 |
| --- | --- | --- |---|
| codex | `.agents/skills` | `~/.agents/skills` | `~/.codex`, `/etc/codex` |
| gemini-cli | `.agents/skills` | `~/.gemini/skills`, `~/.agents/skills` | `~/.gemini` |
| cursor | `.agents/skills` | `~/.cursor/skills` | `~/.cursor` |
| github-copilot | `.agents/skills` | `~/.copilot/skills` | `~/.copilot` |
| cline | `.agents/skills` | `~/.agents/skills` | `~/.agents` |
| zed / warp / dexto / fx / loaf / sarvam-code | `.agents/skills` | `~/.agents/skills` | 推导 |
| kimi-code | `.agents/skills` | `~/.agents/skills` | `~/.kimi`, `~/.agents` |
| droid | `.agents/skills` | `~/.factory/skills` | `~/.factory` |
| amp / replit / universal | `.agents/skills` | `~/.config/agents/skills` | `~/.config/amp` 等 |
| kilo | `.agents/skills` | `~/.kilo/skills` | `~/.kilo` |
| deepagents | `.agents/skills` | `~/.deepagents/agent/skills` | `~/.deepagents` |
| firebender | `.agents/skills` | `~/.firebender/skills` | `~/.firebender` |
| promptscript | `.agents/skills` | — | — |
| antigravity / antigravity-cli | `.agents/skills` | `~/.gemini/config/skills`, `~/.antigravity/skills` | `~/.gemini/antigravity`, `~/.gemini/config`, `~/.antigravity` |

### 2.2 自有目录

| Agent | project | global |
| --- | --- | --- |
| claude-code | `.claude/skills` | `~/.claude/skills`（**保留名 `synced`**） |
| opencode | `.opencode/skills`, `.opencode/skill` | `~/.config/opencode/skills`, `~/.config/opencode/skill` |
| pi | `.pi/skills`, `.agents/skills` | `~/.pi/agent/skills`, `~/.agents/skills` |
| github（legacy） | `.github/skills`, `.copilot/skills` | — |
| windsurf | `.windsurf/skills` | `~/.codeium/windsurf/skills`, `~/.windsurf/skills` |
| kiro | `.kiro/skills` | `~/.kiro/skills` |
| roo | `.roo/skills` | `~/.roo/skills` |
| qwen-code | `.qwen/skills` | `~/.qwen/skills` |
| trae / trae-cn | `.trae/skills` | `~/.trae/skills` / `~/.trae-cn/skills` |
| codebuddy / qoder / qoder-cn | `.codebuddy/skills` / `.qoder/skills` | 同形 |
| dsh（DeepSeek Harness） | `.dsh/skills` | `~/.dsh/skills`（另有 `customSkillDirs` 配置，暂不解析） |
| aider-desk / continue / crush / goose / augment / junie / zencoder / tabnine-cli / devin / forgecode / grok / iflow / kode / lingma / minimax / mistral-vibe / moxby / mux / neovate / ona / openhands / pochi / posit-assistant / reasonix / rovodev / terramind / tinycloud / zcode / bob / codearts-agent / codemaker / codestudio / command-code / cortex / hermes / inferencesh / jazz / kimchi / mcpjam | `<vendor>/skills` | 同形（见 `agents.ts`） |
| astrbot | `data/skills` | `~/.astrbot/data/skills` |
| eve | `agent/skills` | — |

## 3. 检测规则（实现约定）

- **project**：目录首段以 `.` 开头（`.claude/skills`）→ 父目录存在即命中（沿用历史语义）；
  首段不隐藏（`skills`、`data/skills`、`agent/skills`）→ **必须目录本身存在**，否则任何仓库都会被误判。
- **global**：目标 skills 目录存在 **或** `detectGlobal` 任一探测路径存在（`~/.claude` 等）。
  `detectGlobal` 未显式给出时由 `deriveDetectPath()` 从 global 目录推导：去掉尾部 `skills`/`skill`；
  `~/.config/<app>/skills` 取 `~/.config/<app>`，其余取第一段。
- **去重**：按解析后的绝对路径分组。`.agents/skills` 只会出现一条，`aliases` 收全部客户端 id。
- **一个 agent 一条**：同一 agent 命中第一个目录后 `break`，避免 `skills/` 与 `skill/` 重复成组。
- **用户级目录独占（规则 1）**：`detectAll('project')` 会跳过任何与 `globalSkillDirs` 解析结果重合的绝对路径。
  原因：在 `~/.dsh` 里运行时，openclaw 之类的裸 `skills/` 会解析成 `~/.dsh/skills`，那是 dsh 的 **global** 目录，
  同一个目录不能同时以 project 和 global 出现。
- **项目级目录必须带命名空间（规则 2）**：自动探测只接受隐藏目录（`.claude/skills`）或 vendor 前缀目录
  （`data/skills`、`agent/skills`）。仓库根的裸 `skills/` 不做自动探测（openclaw 已从表中移除，需要手动在
  `config.json` 的 `aiTools` 里配置 `{"type":"openclaw","skillDirs":["skills"]}`）。

### 3.1 菜单上下文收敛（`detectContext` / `detectMenu`）

| cwd | context | 菜单 |
| --- | --- | --- |
| 某 agent 的 `detectGlobal` 路径或其子树 | `{scope:'global', agentId}` | 只列该 agent 的 global 目录（不存在也列，选中时创建） |
| 命中 ≥1 个项目级目录 | `{scope:'project'}` | 只列项目级目录 |
| 其他 | `{scope:'none'}` | 列出全部 global |

- 判定顺序 **global 优先于 project**（命中多个 `detectGlobal` 时取路径最长的，最具体的那个，例如 `~/.gemini/antigravity` 判给 Antigravity 而非 Gemini CLI）。
- **cwd === home 时禁用 project 扫描**：否则在 `~` 下 `.pi/skills` 会解析成 `~/.pi/skills`（pi 的真实位置是 `~/.pi/agent/skills`），属于无效目标。
- 过滤生效时 UI 追加 `list(all)`，对应 `detectAllEntries()`。

## 4. 已知限制（不要写成"支持"）

1. **soft link 名称 = `github__user__repo__path`**（`getSafeName`，前缀即来源类型，`parseSafeName` 可反解）。
   该目录名与 `SKILL.md` 的 `name` 不一致，规范性上是偏离。实测影响：
   - Claude Code：**不受影响**（`name` 决定 `/` 命令名，"The directory name also invokes the skill"）
   - Gemini CLI：**不受影响**（`skillLoader.ts` 只取 frontmatter name 并 sanitize，无目录比对）
   - OpenCode：能加载，但 **skill id 取自路径**，调用名会变成 `github__...`
   - **VS Code / GitHub Copilot：不加载**（官方："If the name does not match, the skill is not loaded."）
   - Cursor：文档要求一致，是否强制未验证
2. **VS Code 是否跟随符号链接未验证**（官方文档全文未提 symlink）。skm 的整个模型基于软链。
3. **global 作用域**只对「检测到已安装」的 agent 暴露（home 下配置目录存在）。`~/.agents/skills`
   由第一个命中的 agent 认领（通常 gemini/pi/codex），其余客户端只作为 alias 展示。

## 5. 新增 / 修正一个 agent 的步骤

1. 找**官方文档**或**官方源码**里的目录定义（不要用第三方博客当唯一依据）。
2. 在 `src/core/agents.ts` 的 `AGENTS` 追加 / 修改条目：`id` 用 kebab-case，`label` 用官方名。
3. 若该 agent 读 `.agents/skills`，直接用 `universalAgent()` 工厂，只填 global 与 detect。
4. 目录名必须带章节归属（2.1 / 2.2），保持表格与代码一致。
5. 跑 `npx vitest run tests/core/agents.test.ts tests/core/project.test.ts`：
   表完整性（id 唯一、project 路径非绝对、global 带 `~/`、单 agent 内不重复）由测试守护。
6. 更新 `README.md` / `README.zh-CN.md` 的矩阵表。

## 6. 来源

- <https://agentskills.io/specification>（目录结构与 frontmatter 规范）
- <https://code.claude.com/docs/en/skills>（symlink 支持、命令名来源、`synced` 保留名）
- <https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/cli/skills.md>（`.agents/skills` 优先）
- <https://raw.githubusercontent.com/google-gemini/gemini-cli/main/packages/core/src/skills/skillLoader.ts>（无目录名比对）
- <https://opencode.ai/docs/skills/>（global/project + compatibility 目录）
- Pi：`docs/configuration.md`（`<agent-dir>/skills/`、`.pi/skills/`）+ `dist/core/resource-loader.js:773-784`（`join(agentDir, "skills")`、`join(cwd, CONFIG_DIR_NAME, "skills")`）；agent-dir 默认 `~/.pi/agent`（`PI_CODING_AGENT_DIR` 可改）
- <https://cursor.com/docs/skills>
- <https://code.visualstudio.com/docs/agent-customization/agent-skills>（name 不匹配则不加载）
- <https://kiro.dev/docs/skills/>
- <https://github.com/vercel-labs/skills/blob/main/src/agents.ts>（60+ agent 路径表，业界参考实现）
- DSH：`~/.dsh/skills`、`.dsh/skills`（deepseek-ai/deepseek-harness 社区文档）
