import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { ConfigManager, AIToolConfig, expandHome } from './config';
import { ResolvedAgent, getDefaultAgents, resolveAgent } from './agents';

export type ProjectType = 'opencode' | 'cursor' | 'antigravity' | 'github' | 'claude' | 'unknown' | string;

export type ProjectScope = 'project' | 'global';

export interface ProjectInfo {
  /** 规范化的 agent id（同一目录被多家读取时取第一个） */
  type: ProjectType;
  root: string;
  /** 绝对路径 */
  skillDir?: string;
  /** 安装作用域，缺省视为 project（向后兼容） */
  scope?: ProjectScope;
  /** 共用同一目录的 agent id 列表 */
  aliases?: string[];
  /** 展示用路径：项目级为相对路径，用户级为 `~/...` */
  label?: string;
  /** 该目录所属 agent 的保留名 */
  reservedNames?: string[];
}

export interface ProjectDetectorOptions {
  /** 注入自定义 agent 表（测试用），传入后不再读取 config.json */
  agents?: ResolvedAgent[];
  /** 覆盖 home 目录（测试用） */
  homeDir?: string;
}

/** 当前目录所处的上下文 */
export interface MenuContext {
  /**
   * global: cwd 在某个 agent 的配置目录（或其子树）里
   * project: cwd 下命中至少一个项目级目录
   * none: 两者都不是（例如在 ~ 或任意空目录）
   */
  scope: 'global' | 'project' | 'none';
  /** scope 为 global 时命中的 agent */
  agentId?: string;
}

export interface MenuResult {
  entries: ProjectInfo[];
  /** 是否做过上下文过滤（UI 需要提供"显示全部"入口） */
  filtered: boolean;
  context: MenuContext;
}

export class ProjectDetector {
  private cwd: string;
  private homeDir: string;
  private agents: ResolvedAgent[];
  /** 所有 agent 的用户级目录（绝对路径）。这些路径归 global 独占，不能被 project 认领 */
  private globalDirSet: Set<string>;

  constructor(cwd: string = process.cwd(), options: ProjectDetectorOptions = {}) {
    this.cwd = cwd;
    this.homeDir = options.homeDir ?? os.homedir();

    if (options.agents) {
      this.agents = options.agents;
    } else {
      // 优先使用用户配置的 AI Tools，否则使用内置全量表
      const configManager = new ConfigManager();
      const userAITools = configManager.getAITools();
      this.agents = userAITools ? this.normalizeUserTools(userAITools) : getDefaultAgents();
    }

    this.globalDirSet = this.collectGlobalDirs();
  }

  private normalizeUserTools(userAITools: AIToolConfig[]): ResolvedAgent[] {
    return userAITools.map(tool => resolveAgent(tool));
  }
  private collectGlobalDirs(): Set<string> {
    const dirs = new Set<string>();
    for (const agent of this.agents) {
      for (const dir of agent.globalSkillDirs) {
        dirs.add(this.expand(dir));
      }
    }
    return dirs;
  }

  private expand(targetPath: string): string {
    return expandHome(targetPath, this.homeDir);
  }

  private isHomeDir(): boolean {
    return path.resolve(this.cwd) === path.resolve(this.homeDir);
  }

  private isPresent(agent: ResolvedAgent, scope: ProjectScope, skillDir: string): boolean {
    if (scope === 'project') {
      // 隐藏目录（.claude/skills、.agents/skills…）沿用原有语义：父目录存在即视为该项目类型
      // 非隐藏目录（openclaw 的 skills/、astrbot 的 data/skills…）太通用，必须目录本身存在
      const relative = path.relative(this.cwd, skillDir);
      const firstSegment = relative.split(path.sep)[0] ?? '';
      if (!firstSegment.startsWith('.')) {
        return fs.existsSync(skillDir);
      }
      return fs.existsSync(path.dirname(skillDir));
    }
    if (fs.existsSync(skillDir)) {
      return true;
    }
    return agent.detectGlobal.some(detectPath => fs.existsSync(this.expand(detectPath)));
  }

  /**
   * 检测某个作用域下所有已安装的 AI 工具，并按解析后的目录去重。
   * `.agents/skills` 这类共用目录只会返回一条，别名收在 `aliases` 里。
   */
  public detectAll(scope: ProjectScope = 'project'): ProjectInfo[] {
    const byDir = new Map<string, ProjectInfo>();

    // home 目录不可能是项目根：在 ~ 下 project 目录会解析成 ~/.pi/skills 这类无效位置
    if (scope === 'project' && this.isHomeDir()) {
      return [];
    }

    for (const agent of this.agents) {
      const dirs = scope === 'global' ? agent.globalSkillDirs : agent.projectSkillDirs;

      // 每个 agent 只取第一个命中的目录（例如 opencode 的 skills/ 与 skill/ 不会重复成组）
      for (const dir of dirs) {
        const resolved = scope === 'global' ? this.expand(dir) : path.resolve(this.cwd, dir);

        // 用户级目录归 global 独占：例如在 ~/.dsh 里时，`skills` 会解析成 ~/.dsh/skills，
        // 它已经是 dsh 的 global 目录，不能再作为任何 agent 的 project 目录出现
        if (scope === 'project' && this.globalDirSet.has(resolved)) {
          continue;
        }

        if (!this.isPresent(agent, scope, resolved)) {
          continue;
        }

        const existing = byDir.get(resolved);
        if (existing) {
          const aliases = existing.aliases ?? [];
          if (!aliases.includes(agent.id)) {
            aliases.push(agent.id);
          }
          existing.aliases = aliases;

          const reservedNames = existing.reservedNames ?? [];
          for (const reserved of agent.reservedNames) {
            if (!reservedNames.includes(reserved)) {
              reservedNames.push(reserved);
            }
          }
          existing.reservedNames = reservedNames;
        } else {
          byDir.set(resolved, {
            type: agent.id,
            root: scope === 'global' ? this.homeDir : this.cwd,
            skillDir: resolved,
            scope,
            aliases: [agent.id],
            label: dir,
            reservedNames: [...agent.reservedNames]
          });
        }

        break;
      }
    }

    return [...byDir.values()];
  }

  /**
   * cwd 是否落在某个 agent 的配置目录（或其子树）里。
   * 命中多个时取路径最长的那个（最具体的），例如 ~/.gemini/antigravity 下应判给 Antigravity 而不是 Gemini CLI。
   */
  private findGlobalContext(): { agent: ResolvedAgent; base: string } | null {
    let best: { agent: ResolvedAgent; base: string } | null = null;

    for (const agent of this.agents) {
      for (const detectPath of agent.detectGlobal) {
        const base = this.expand(detectPath);
        const inside = this.cwd === base || this.cwd.startsWith(base + path.sep);
        if (!inside) {
          continue;
        }
        if (!best || base.length > best.base.length) {
          best = { agent, base };
        }
      }
    }

    return best;
  }

  /**
   * 判断当前目录的上下文：优先 global（配置目录/子树），其次 project，最后 none
   */
  public detectContext(): MenuContext {
    const globalContext = this.findGlobalContext();
    if (globalContext) {
      return { scope: 'global', agentId: globalContext.agent.id };
    }
    if (this.detectAll('project').length > 0) {
      return { scope: 'project' };
    }
    return { scope: 'none' };
  }

  /**
   * 菜单条目：按当前上下文收敛，避免在 ~/.dsh 里误选到别的 agent 的 global。
   *
   * - global 上下文：只列该 agent 的用户级目录（目录不存在也会列出，选中时自动创建）
   * - project 上下文：只列项目级目录（可能多个）
   * - none：列出全部用户级目录（在 ~ 或任意空目录里管理全局技能）
   */
  public detectMenu(): MenuResult {
    const project = this.detectAll('project');
    const global = this.detectAll('global');
    const context = this.detectContext();

    if (context.scope === 'global' && context.agentId) {
      const agentId = context.agentId;
      const entries = global.filter(entry => entry.aliases?.includes(agentId));
      if (entries.length > 0) {
        return { entries, filtered: true, context };
      }
    }

    if (context.scope === 'project') {
      return { entries: project, filtered: true, context };
    }

    return { entries: global, filtered: false, context };
  }

  /**
   * 全部条目（忽略上下文收敛）：`list(all)` 与脚本使用
   */
  public detectAllEntries(): MenuResult {
    return {
      entries: [...this.detectAll('project'), ...this.detectAll('global')],
      filtered: false,
      context: this.detectContext()
    };
  }

  /**
   * 检测第一个存在的 AI 项目类型（向后兼容）：先项目级，再用户级
   */
  public detect(): ProjectInfo {
    const project = this.detectAll('project');
    if (project.length > 0) {
      return project[0];
    }

    const global = this.detectAll('global');
    if (global.length > 0) {
      return global[0];
    }

    return {
      type: 'unknown',
      root: this.cwd
    };
  }
}
