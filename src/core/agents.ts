import { AIToolConfig } from './config';

/**
 * Agent Skills 目录表
 *
 * 生态已收敛到 Agent Skills 开放规范：<dir>/<name>/SKILL.md。
 * 各客户端的安装目录来自各自的官方文档 / 官方源码（见 directives/agents-skills-paths.md）。
 *
 * 约定：
 * - projectSkillDirs: 相对项目根的路径
 * - globalSkillDirs:  '~/...' 形式（运行时用 expandHome 展开）
 * - detectGlobal:     判断该 agent 是否已安装（未显式给出时由 deriveDetectPath 推导）
 * - reservedNames:    该 agent 保留的目录名，skm 不得写入/删除
 */
export interface AgentDefinition {
  id: string;
  label: string;
  projectSkillDirs: string[];
  globalSkillDirs?: string[];
  detectGlobal?: string[];
  reservedNames?: string[];
}

/** 规范化后的 agent，供 ProjectDetector 使用 */
export interface ResolvedAgent {
  id: string;
  label: string;
  projectSkillDirs: string[];
  globalSkillDirs: string[];
  detectGlobal: string[];
  reservedNames: string[];
}

const UNIVERSAL_PROJECT = '.agents/skills';
const UNIVERSAL_GLOBAL = '~/.agents/skills';
const CONFIG_AGENTS_GLOBAL = '~/.config/agents/skills';

const ANTIGRAVITY_GLOBAL = ['~/.gemini/config/skills', '~/.antigravity/skills'];
const ANTIGRAVITY_DETECT = ['~/.gemini/antigravity', '~/.gemini/config', '~/.antigravity'];

/**
 * 读取 .agents/skills 的客户端集合（project 目录相同，只有 global 与检测路径不同）
 */
function universalAgent(
  id: string,
  label: string,
  globalSkillDirs: string[] = [UNIVERSAL_GLOBAL],
  detectGlobal?: string[],
  reservedNames?: string[]
): AgentDefinition {
  return { id, label, projectSkillDirs: [UNIVERSAL_PROJECT], globalSkillDirs, detectGlobal, reservedNames };
}

export const AGENTS: AgentDefinition[] = [
  // === 通用 .agents/skills 组（同一目录被多家客户端读取） ===
  universalAgent('codex', 'Codex', [UNIVERSAL_GLOBAL], ['~/.codex', '/etc/codex']),
  universalAgent('gemini-cli', 'Gemini CLI', ['~/.gemini/skills', UNIVERSAL_GLOBAL], ['~/.gemini']),
  universalAgent('cursor', 'Cursor', ['~/.cursor/skills'], ['~/.cursor']),
  universalAgent('github-copilot', 'GitHub Copilot', ['~/.copilot/skills'], ['~/.copilot']),
  universalAgent('cline', 'Cline', [UNIVERSAL_GLOBAL], ['~/.agents']),
  universalAgent('zed', 'Zed'),
  universalAgent('warp', 'Warp'),
  universalAgent('kimi-code', 'Kimi Code CLI', [UNIVERSAL_GLOBAL], ['~/.kimi', '~/.agents']),
  universalAgent('droid', 'Droid', ['~/.factory/skills'], ['~/.factory']),
  universalAgent('amp', 'Amp', [CONFIG_AGENTS_GLOBAL], ['~/.config/amp']),
  universalAgent('replit', 'Replit', [CONFIG_AGENTS_GLOBAL]),
  universalAgent('universal', 'Universal', [CONFIG_AGENTS_GLOBAL]),
  universalAgent('dexto', 'Dexto'),
  universalAgent('fx', 'fx'),
  universalAgent('loaf', 'Loaf'),
  universalAgent('sarvam-code', 'Sarvam Code'),
  universalAgent('kilo', 'Kilo Code', ['~/.kilo/skills'], ['~/.kilo']),
  universalAgent('deepagents', 'Deep Agents', ['~/.deepagents/agent/skills'], ['~/.deepagents']),
  universalAgent('firebender', 'Firebender', ['~/.firebender/skills'], ['~/.firebender']),
  universalAgent('promptscript', 'PromptScript', [], []),
  universalAgent('antigravity', 'Antigravity', ANTIGRAVITY_GLOBAL, ANTIGRAVITY_DETECT),
  universalAgent('antigravity-cli', 'Antigravity CLI', ANTIGRAVITY_GLOBAL, ANTIGRAVITY_DETECT),

  // === 自有目录的客户端 ===
  {
    id: 'claude-code',
    label: 'Claude Code',
    projectSkillDirs: ['.claude/skills'],
    globalSkillDirs: ['~/.claude/skills'],
    detectGlobal: ['~/.claude'],
    // Claude Code 用 ~/.claude/skills/synced/ 存放同步技能
    reservedNames: ['synced']
  },
  {
    id: 'opencode',
    label: 'OpenCode',
    projectSkillDirs: ['.opencode/skills', '.opencode/skill'],
    globalSkillDirs: ['~/.config/opencode/skills', '~/.config/opencode/skill'],
    detectGlobal: ['~/.config/opencode', '~/.opencode']
  },
  {
    // pi 自己的目录是 <agent-dir>/skills（默认 ~/.pi/agent/skills）与 .pi/skills；
    // 另外还兼容 Agent Skills 的 .agents/skills。可用 PI_CODING_AGENT_DIR 改 agent-dir。
    id: 'pi',
    label: 'Pi',
    projectSkillDirs: ['.pi/skills', UNIVERSAL_PROJECT],
    globalSkillDirs: ['~/.pi/agent/skills', UNIVERSAL_GLOBAL],
    detectGlobal: ['~/.pi/agent', '~/.agents']
  },
  {
    id: 'github',
    label: 'GitHub (legacy)',
    projectSkillDirs: ['.github/skills', '.copilot/skills'],
    globalSkillDirs: [],
    detectGlobal: []
  },
  {
    id: 'windsurf',
    label: 'Windsurf',
    projectSkillDirs: ['.windsurf/skills'],
    globalSkillDirs: ['~/.codeium/windsurf/skills', '~/.windsurf/skills'],
    detectGlobal: ['~/.codeium/windsurf', '~/.windsurf']
  },
  {
    id: 'kiro',
    label: 'Kiro',
    projectSkillDirs: ['.kiro/skills'],
    globalSkillDirs: ['~/.kiro/skills'],
    detectGlobal: ['~/.kiro']
  },
  {
    id: 'roo',
    label: 'Roo Code',
    projectSkillDirs: ['.roo/skills'],
    globalSkillDirs: ['~/.roo/skills'],
    detectGlobal: ['~/.roo']
  },
  {
    id: 'qwen-code',
    label: 'Qwen Code',
    projectSkillDirs: ['.qwen/skills'],
    globalSkillDirs: ['~/.qwen/skills'],
    detectGlobal: ['~/.qwen']
  },
  {
    id: 'trae',
    label: 'Trae',
    projectSkillDirs: ['.trae/skills'],
    globalSkillDirs: ['~/.trae/skills'],
    detectGlobal: ['~/.trae']
  },
  {
    id: 'trae-cn',
    label: 'Trae CN',
    projectSkillDirs: ['.trae/skills'],
    globalSkillDirs: ['~/.trae-cn/skills'],
    detectGlobal: ['~/.trae-cn']
  },
  {
    id: 'codebuddy',
    label: 'CodeBuddy',
    projectSkillDirs: ['.codebuddy/skills'],
    globalSkillDirs: ['~/.codebuddy/skills'],
    detectGlobal: ['~/.codebuddy']
  },
  {
    id: 'qoder',
    label: 'Qoder',
    projectSkillDirs: ['.qoder/skills'],
    globalSkillDirs: ['~/.qoder/skills'],
    detectGlobal: ['~/.qoder']
  },
  {
    id: 'qoder-cn',
    label: 'Qoder CN',
    projectSkillDirs: ['.qoder/skills'],
    globalSkillDirs: ['~/.qoder-cn/skills'],
    detectGlobal: ['~/.qoder-cn']
  },
  {
    id: 'dsh',
    label: 'DeepSeek Harness (dsh)',
    projectSkillDirs: ['.dsh/skills'],
    globalSkillDirs: ['~/.dsh/skills'],
    detectGlobal: ['~/.dsh']
  },
  {
    id: 'aider-desk',
    label: 'AiderDesk',
    projectSkillDirs: ['.aider-desk/skills'],
    globalSkillDirs: ['~/.aider-desk/skills'],
    detectGlobal: ['~/.aider-desk']
  },
  {
    id: 'continue',
    label: 'Continue',
    projectSkillDirs: ['.continue/skills'],
    globalSkillDirs: ['~/.continue/skills'],
    detectGlobal: ['~/.continue']
  },
  {
    id: 'crush',
    label: 'Crush',
    projectSkillDirs: ['.crush/skills'],
    globalSkillDirs: ['~/.config/crush/skills'],
    detectGlobal: ['~/.config/crush']
  },
  {
    id: 'goose',
    label: 'Goose',
    projectSkillDirs: ['.goose/skills'],
    globalSkillDirs: ['~/.config/goose/skills'],
    detectGlobal: ['~/.config/goose']
  },
  {
    id: 'augment',
    label: 'Augment',
    projectSkillDirs: ['.augment/skills'],
    globalSkillDirs: ['~/.augment/skills'],
    detectGlobal: ['~/.augment']
  },
  {
    id: 'junie',
    label: 'Junie',
    projectSkillDirs: ['.junie/skills'],
    globalSkillDirs: ['~/.junie/skills'],
    detectGlobal: ['~/.junie']
  },
  {
    id: 'zencoder',
    label: 'Zencoder',
    projectSkillDirs: ['.zencoder/skills'],
    globalSkillDirs: ['~/.zencoder/skills'],
    detectGlobal: ['~/.zencoder']
  },
  {
    id: 'tabnine-cli',
    label: 'Tabnine CLI',
    projectSkillDirs: ['.tabnine/agent/skills'],
    globalSkillDirs: ['~/.tabnine/agent/skills'],
    detectGlobal: ['~/.tabnine']
  },
  {
    id: 'devin',
    label: 'Devin for Terminal',
    projectSkillDirs: ['.devin/skills'],
    globalSkillDirs: ['~/.config/devin/skills'],
    detectGlobal: ['~/.config/devin']
  },
  {
    id: 'forgecode',
    label: 'ForgeCode',
    projectSkillDirs: ['.forge/skills'],
    globalSkillDirs: ['~/.forge/skills'],
    detectGlobal: ['~/.forge']
  },
  {
    id: 'grok',
    label: 'Grok Build',
    projectSkillDirs: ['.grok/skills'],
    globalSkillDirs: ['~/.grok/skills'],
    detectGlobal: ['~/.grok']
  },
  {
    id: 'iflow',
    label: 'iFlow CLI',
    projectSkillDirs: ['.iflow/skills'],
    globalSkillDirs: ['~/.iflow/skills'],
    detectGlobal: ['~/.iflow']
  },
  {
    id: 'kode',
    label: 'Kode',
    projectSkillDirs: ['.kode/skills'],
    globalSkillDirs: ['~/.kode/skills'],
    detectGlobal: ['~/.kode']
  },
  {
    id: 'lingma',
    label: 'Lingma',
    projectSkillDirs: ['.lingma/skills'],
    globalSkillDirs: ['~/.lingma/skills'],
    detectGlobal: ['~/.lingma']
  },
  {
    id: 'minimax',
    label: 'MiniMax Code',
    projectSkillDirs: ['.minimax/skills'],
    globalSkillDirs: ['~/.minimax/skills'],
    detectGlobal: ['~/.minimax']
  },
  {
    id: 'mistral-vibe',
    label: 'Mistral Vibe',
    projectSkillDirs: ['.vibe/skills'],
    globalSkillDirs: ['~/.vibe/skills'],
    detectGlobal: ['~/.vibe']
  },
  {
    id: 'moxby',
    label: 'Moxby',
    projectSkillDirs: ['.moxby/skills'],
    globalSkillDirs: ['~/.moxby/skills'],
    detectGlobal: ['~/.moxby']
  },
  {
    id: 'mux',
    label: 'Mux',
    projectSkillDirs: ['.mux/skills'],
    globalSkillDirs: ['~/.mux/skills'],
    detectGlobal: ['~/.mux']
  },
  {
    id: 'neovate',
    label: 'Neovate',
    projectSkillDirs: ['.neovate/skills'],
    globalSkillDirs: ['~/.neovate/skills'],
    detectGlobal: ['~/.neovate']
  },
  {
    id: 'ona',
    label: 'Ona',
    projectSkillDirs: ['.ona/skills'],
    globalSkillDirs: ['~/.ona/skills'],
    detectGlobal: ['~/.ona']
  },
  {
    id: 'openhands',
    label: 'OpenHands',
    projectSkillDirs: ['.openhands/skills'],
    globalSkillDirs: ['~/.openhands/skills'],
    detectGlobal: ['~/.openhands']
  },
  {
    id: 'pochi',
    label: 'Pochi',
    projectSkillDirs: ['.pochi/skills'],
    globalSkillDirs: ['~/.pochi/skills'],
    detectGlobal: ['~/.pochi']
  },
  {
    id: 'posit-assistant',
    label: 'Posit Assistant',
    projectSkillDirs: ['.posit/assistant/skills'],
    globalSkillDirs: ['~/.posit/assistant/skills'],
    detectGlobal: ['~/.posit/assistant', '~/.positai']
  },
  {
    id: 'reasonix',
    label: 'Reasonix',
    projectSkillDirs: ['.reasonix/skills'],
    globalSkillDirs: ['~/.reasonix/skills'],
    detectGlobal: ['~/.reasonix']
  },
  {
    id: 'rovodev',
    label: 'Rovo Dev',
    projectSkillDirs: ['.rovodev/skills'],
    globalSkillDirs: ['~/.rovodev/skills'],
    detectGlobal: ['~/.rovodev']
  },
  {
    id: 'terramind',
    label: 'Terramind',
    projectSkillDirs: ['.terramind/skills'],
    globalSkillDirs: ['~/.terramind/skills'],
    detectGlobal: ['~/.terramind']
  },
  {
    id: 'tinycloud',
    label: 'Tinycloud',
    projectSkillDirs: ['.tinycloud/skills'],
    globalSkillDirs: ['~/.tinycloud/skills'],
    detectGlobal: ['~/.tinycloud']
  },
  {
    id: 'zcode',
    label: 'ZCode',
    projectSkillDirs: ['.zcode/skills'],
    globalSkillDirs: ['~/.zcode/skills'],
    detectGlobal: ['~/.zcode']
  },
  {
    id: 'bob',
    label: 'IBM Bob',
    projectSkillDirs: ['.bob/skills'],
    globalSkillDirs: ['~/.bob/skills'],
    detectGlobal: ['~/.bob']
  },
  {
    id: 'codearts-agent',
    label: 'CodeArts Agent',
    projectSkillDirs: ['.codeartsdoer/skills'],
    globalSkillDirs: ['~/.codeartsdoer/skills'],
    detectGlobal: ['~/.codeartsdoer']
  },
  {
    id: 'codemaker',
    label: 'Codemaker',
    projectSkillDirs: ['.codemaker/skills'],
    globalSkillDirs: ['~/.codemaker/skills'],
    detectGlobal: ['~/.codemaker']
  },
  {
    id: 'codestudio',
    label: 'Code Studio',
    projectSkillDirs: ['.codestudio/skills'],
    globalSkillDirs: ['~/.codestudio/skills'],
    detectGlobal: ['~/.codestudio']
  },
  {
    id: 'command-code',
    label: 'Command Code',
    projectSkillDirs: ['.commandcode/skills'],
    globalSkillDirs: ['~/.commandcode/skills'],
    detectGlobal: ['~/.commandcode']
  },
  {
    id: 'cortex',
    label: 'Cortex Code',
    projectSkillDirs: ['.cortex/skills'],
    globalSkillDirs: ['~/.snowflake/cortex/skills'],
    detectGlobal: ['~/.snowflake/cortex']
  },
  {
    id: 'hermes',
    label: 'Hermes Agent',
    projectSkillDirs: ['.hermes/skills'],
    globalSkillDirs: ['~/.hermes/skills'],
    detectGlobal: ['~/.hermes']
  },
  {
    id: 'inferencesh',
    label: 'inference.sh',
    projectSkillDirs: ['.inferencesh/skills'],
    globalSkillDirs: ['~/.inferencesh/skills'],
    detectGlobal: ['~/.inferencesh']
  },
  {
    id: 'jazz',
    label: 'Jazz',
    projectSkillDirs: ['.jazz/skills'],
    globalSkillDirs: ['~/.jazz/skills'],
    detectGlobal: ['~/.jazz']
  },
  {
    id: 'kimchi',
    label: 'Kimchi',
    projectSkillDirs: ['.kimchi/skills'],
    globalSkillDirs: ['~/.config/kimchi/harness/skills'],
    detectGlobal: ['~/.config/kimchi']
  },
  {
    id: 'mcpjam',
    label: 'MCPJam',
    projectSkillDirs: ['.mcpjam/skills'],
    globalSkillDirs: ['~/.mcpjam/skills'],
    detectGlobal: ['~/.mcpjam']
  },
  {
    id: 'astrbot',
    label: 'AstrBot',
    projectSkillDirs: ['data/skills'],
    globalSkillDirs: ['~/.astrbot/data/skills'],
    detectGlobal: ['~/.astrbot']
  },
  {
    id: 'autohand-code',
    label: 'Autohand Code CLI',
    projectSkillDirs: ['.autohand/skills'],
    globalSkillDirs: ['~/.autohand/skills'],
    detectGlobal: ['~/.autohand']
  },
  {
    id: 'eve',
    label: 'Eve',
    projectSkillDirs: ['agent/skills'],
    globalSkillDirs: [],
    detectGlobal: []
  }
];

/**
 * 从 globalSkillDirs 推导「该 agent 是否已安装」的探测路径。
 * 例如 '~/.claude/skills' -> ['~/.claude']，'~/.config/opencode/skills' -> ['~/.config/opencode']。
 */
export function deriveDetectPath(globalSkillDir: string): string[] {
  if (globalSkillDir === '~') {
    return [];
  }
  if (!globalSkillDir.startsWith('~/')) {
    return [globalSkillDir];
  }

  const parts = globalSkillDir.slice(2).split('/').filter(Boolean);
  const last = parts.at(-1);
  if (last === 'skills' || last === 'skill') {
    parts.pop();
  }
  if (parts.length === 0) {
    return [];
  }

  if (parts[0] === '.config' && parts.length > 1) {
    return [`~/${parts.slice(0, 2).join('/')}`];
  }

  return [`~/${parts[0]}`];
}

/**
 * 把内部 AgentDefinition 或用户自定义 AIToolConfig 统一成 ResolvedAgent
 */
export function resolveAgent(
  source: AgentDefinition | (AIToolConfig & { label?: string })
): ResolvedAgent {
  const definition = source as AgentDefinition;
  const toolConfig = source as AIToolConfig & { label?: string };
  const isDefinition = Array.isArray(definition.projectSkillDirs);

  const id = isDefinition ? definition.id : toolConfig.type;
  const projectSkillDirs = isDefinition ? definition.projectSkillDirs : toolConfig.skillDirs;
  const globalSkillDirs = (isDefinition ? definition.globalSkillDirs : toolConfig.globalSkillDirs) ?? [];
  const explicitDetect = isDefinition ? definition.detectGlobal : toolConfig.detectGlobal;
  const detectGlobal = explicitDetect ?? globalSkillDirs.flatMap(dir => deriveDetectPath(dir));

  return {
    id,
    label: (isDefinition ? definition.label : toolConfig.label) ?? id,
    projectSkillDirs,
    globalSkillDirs,
    detectGlobal,
    reservedNames: (isDefinition ? definition.reservedNames : toolConfig.reservedNames) ?? []
  };
}

/** 默认全量 agent（ResolvedAgent 形式） */
export function getDefaultAgents(): ResolvedAgent[] {
  return AGENTS.map(resolveAgent);
}

/** 向后兼容：旧的 AIToolConfig 形状（仅 project 目录 + 新字段） */
export function getDefaultAITools(): AIToolConfig[] {
  return AGENTS.map(agent => ({
    type: agent.id,
    skillDirs: agent.projectSkillDirs,
    globalSkillDirs: agent.globalSkillDirs,
    detectGlobal: agent.detectGlobal,
    reservedNames: agent.reservedNames
  }));
}

export function findAgent(id: string): AgentDefinition | undefined {
  const lower = id.toLowerCase();
  return AGENTS.find(agent => agent.id === lower || agent.label.toLowerCase() === lower);
}
