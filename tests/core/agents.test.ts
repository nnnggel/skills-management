import { describe, it, expect } from 'vitest';
import {
  AGENTS,
  deriveDetectPath,
  findAgent,
  getDefaultAgents,
  getDefaultAITools,
  resolveAgent
} from '../../src/core/agents';

describe('Agent registry', () => {
  it('should have unique ids', () => {
    const ids = AGENTS.map(agent => agent.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should use project-relative paths (no ~ prefix)', () => {
    for (const agent of AGENTS) {
      for (const dir of agent.projectSkillDirs) {
        expect(dir.startsWith('~'), `${agent.id}: ${dir}`).toBe(false);
        expect(dir.startsWith('/'), `${agent.id}: ${dir}`).toBe(false);
      }
    }
  });

  it('should only use ~ or absolute paths for global dirs', () => {
    for (const agent of AGENTS) {
      for (const dir of agent.globalSkillDirs ?? []) {
        const ok = dir.startsWith('~/') || dir.startsWith('/');
        expect(ok, `${agent.id}: ${dir}`).toBe(true);
      }
    }
  });

  it('should not repeat a directory within one agent', () => {
    for (const agent of AGENTS) {
      const projectDirs = agent.projectSkillDirs;
      expect(new Set(projectDirs).size, agent.id).toBe(projectDirs.length);
      const globalDirs = agent.globalSkillDirs ?? [];
      expect(new Set(globalDirs).size, agent.id).toBe(globalDirs.length);
    }
  });

  it('should keep reserved names lowercase-ish and unique per agent', () => {
    const claude = findAgent('claude-code');
    expect(claude?.reservedNames).toContain('synced');
    for (const agent of AGENTS) {
      const reserved = agent.reservedNames ?? [];
      expect(new Set(reserved).size).toBe(reserved.length);
    }
  });

  it('should use pi own skill dirs, with .agents/skills as fallback', () => {
    const pi = findAgent('pi')!;
    expect(pi.projectSkillDirs[0]).toBe('.pi/skills');
    expect(pi.projectSkillDirs).toContain('.agents/skills');
    expect(pi.globalSkillDirs?.[0]).toBe('~/.pi/agent/skills');
    expect(pi.globalSkillDirs).toContain('~/.agents/skills');
    expect(pi.detectGlobal).toContain('~/.pi/agent');
  });

  it('should cover the mainstream agents and the shared .agents/skills dir', () => {
    const ids = new Set(AGENTS.map(agent => agent.id));
    for (const id of ['claude-code', 'codex', 'gemini-cli', 'cursor', 'opencode', 'github-copilot', 'dsh', 'windsurf', 'kiro', 'roo', 'qwen-code']) {
      expect(ids.has(id), id).toBe(true);
    }

    const shared = AGENTS.filter(agent => agent.projectSkillDirs.includes('.agents/skills'));
    expect(shared.length).toBeGreaterThan(10);
  });
});

describe('deriveDetectPath', () => {
  it('should strip the trailing skills segment', () => {
    expect(deriveDetectPath('~/.claude/skills')).toEqual(['~/.claude']);
    expect(deriveDetectPath('~/.agents/skills')).toEqual(['~/.agents']);
  });

  it('should keep the app dir for ~/.config/<app>/skills', () => {
    expect(deriveDetectPath('~/.config/opencode/skills')).toEqual(['~/.config/opencode']);
    expect(deriveDetectPath('~/.config/agents/skills')).toEqual(['~/.config/agents']);
  });

  it('should handle deeper paths and non-home paths', () => {
    expect(deriveDetectPath('~/.tabnine/agent/skills')).toEqual(['~/.tabnine']);
    expect(deriveDetectPath('/opt/skills')).toEqual(['/opt/skills']);
    expect(deriveDetectPath('~')).toEqual([]);
  });
});

describe('resolveAgent', () => {
  it('should normalize an AgentDefinition', () => {
    const resolved = resolveAgent(findAgent('claude-code')!);
    expect(resolved.id).toBe('claude-code');
    expect(resolved.projectSkillDirs).toEqual(['.claude/skills']);
    expect(resolved.globalSkillDirs).toEqual(['~/.claude/skills']);
    expect(resolved.reservedNames).toEqual(['synced']);
  });

  it('should normalize a legacy AIToolConfig without global dirs', () => {
    const resolved = resolveAgent({ type: 'custom-ai', skillDirs: ['.custom-ai/skills'] });
    expect(resolved.id).toBe('custom-ai');
    expect(resolved.projectSkillDirs).toEqual(['.custom-ai/skills']);
    expect(resolved.globalSkillDirs).toEqual([]);
    expect(resolved.detectGlobal).toEqual([]);
    expect(resolved.reservedNames).toEqual([]);
  });

  it('should derive detect paths for custom config with global dirs', () => {
    const resolved = resolveAgent({
      type: 'custom-ai',
      skillDirs: ['.custom-ai/skills'],
      globalSkillDirs: ['~/.custom-ai/skills']
    });
    expect(resolved.detectGlobal).toEqual(['~/.custom-ai']);
  });

  it('should expose defaults in both shapes', () => {
    expect(getDefaultAgents().length).toBe(AGENTS.length);
    const tools = getDefaultAITools();
    expect(tools.length).toBe(AGENTS.length);
    expect(tools[0].type).toBe(AGENTS[0].id);
  });
});
