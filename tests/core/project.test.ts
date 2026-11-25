import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { ProjectDetector } from '../../src/core/project';
import { getDefaultAgents } from '../../src/core/agents';

describe('ProjectDetector', () => {
  let tmpRoot: string;
  let projectDir: string;
  let homeDir: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skm-detect-'));
    projectDir = path.join(tmpRoot, 'project');
    homeDir = path.join(tmpRoot, 'home');
    fs.ensureDirSync(projectDir);
    fs.ensureDirSync(homeDir);
  });

  afterEach(() => {
    fs.removeSync(tmpRoot);
  });

  const detector = () =>
    new ProjectDetector(projectDir, { agents: getDefaultAgents(), homeDir });

  it('should return nothing when no agent directory exists', () => {
    expect(detector().detectAll('project')).toEqual([]);
    expect(detector().detectAll('global')).toEqual([]);
    expect(detector().detect().type).toBe('unknown');
  });

  it('should group every .agents/skills consumer into a single entry', () => {
    fs.ensureDirSync(path.join(projectDir, '.agents'));

    const projects = detector().detectAll('project');
    const shared = projects.filter(p => p.skillDir === path.join(projectDir, '.agents/skills'));

    expect(shared).toHaveLength(1);
    expect(shared[0].type).toBe('codex');
    expect(shared[0].scope).toBe('project');
    expect(shared[0].label).toBe('.agents/skills');
    expect(shared[0].aliases).toContain('gemini-cli');
    expect(shared[0].aliases).toContain('cursor');
    expect(shared[0].aliases?.length).toBeGreaterThan(10);
  });

  it('should keep vendor directories separate and merge aliases per directory', () => {
    fs.ensureDirSync(path.join(projectDir, '.claude'));
    fs.ensureDirSync(path.join(projectDir, '.windsurf'));
    fs.ensureDirSync(path.join(projectDir, '.opencode'));

    const projects = detector().detectAll('project');
    const byLabel = new Map(projects.map(p => [p.label, p]));

    expect(byLabel.get('.claude/skills')?.type).toBe('claude-code');
    expect(byLabel.get('.claude/skills')?.reservedNames).toEqual(['synced']);
    expect(byLabel.get('.windsurf/skills')?.type).toBe('windsurf');
    // opencode 同时接受 skills/ 与 skill/，只取第一个命中，不当成两组
    expect(byLabel.get('.opencode/skills')?.type).toBe('opencode');
    expect(byLabel.get('.opencode/skill')).toBeUndefined();
    expect(projects.filter(p => p.type === 'opencode')).toHaveLength(1);
  });

  it('should detect global dirs from the agent config dir', () => {
    fs.ensureDirSync(path.join(homeDir, '.claude'));
    fs.ensureDirSync(path.join(homeDir, '.dsh'));

    const globals = detector().detectAll('global');
    const byLabel = new Map(globals.map(p => [p.label, p]));

    expect(byLabel.get('~/.claude/skills')?.skillDir).toBe(path.join(homeDir, '.claude/skills'));
    expect(byLabel.get('~/.claude/skills')?.scope).toBe('global');
    expect(byLabel.get('~/.dsh/skills')?.type).toBe('dsh');
    expect(byLabel.get('~/.factory/skills')).toBeUndefined();
  });

  it('should detect a global dir that already exists even without the config dir', () => {
    fs.ensureDirSync(path.join(homeDir, '.kiro/skills'));

    const globals = detector().detectAll('global');
    const kiro = globals.find(p => p.label === '~/.kiro/skills');

    expect(kiro).toBeDefined();
    expect(kiro?.skillDir).toBe(path.join(homeDir, '.kiro/skills'));
  });

  it('should prefer a project match over a global one in detect()', () => {
    fs.ensureDirSync(path.join(projectDir, '.windsurf'));
    fs.ensureDirSync(path.join(homeDir, '.claude'));

    expect(detector().detect().label).toBe('.windsurf/skills');
  });

  it('should require the directory itself for non-hidden skill dirs', () => {
    // astrbot 的 data/skills 不在隐藏目录下，父目录存在不算命中，必须目录本身存在
    expect(detector().detectAll('project').find(p => p.type === 'astrbot')).toBeUndefined();

    fs.ensureDirSync(path.join(projectDir, 'data'));
    expect(detector().detectAll('project').find(p => p.type === 'astrbot')).toBeUndefined();

    fs.ensureDirSync(path.join(projectDir, 'data/skills'));
    expect(detector().detectAll('project').find(p => p.type === 'astrbot')).toBeDefined();
  });

  it('should never offer a global skill dir as a project target', () => {
    // 模拟在 ~/.dsh 里运行：cwd 就是 home，且 home 下已有 .dsh/skills
    fs.ensureDirSync(path.join(homeDir, '.dsh/skills'));
    fs.ensureDirSync(path.join(homeDir, 'skills'));

    const inHome = new ProjectDetector(homeDir, { agents: getDefaultAgents(), homeDir });
    const projects = inHome.detectAll('project');

    expect(projects.find(p => p.skillDir === path.join(homeDir, '.dsh/skills'))).toBeUndefined();
    expect(projects.find(p => p.type === 'openclaw')).toBeUndefined();

    const globals = inHome.detectAll('global');
    expect(globals.find(p => p.label === '~/.dsh/skills')?.scope).toBe('global');
    // 同一个绝对路径在两个作用域里只出现在 global 一侧
    const dshEntries = [...projects, ...globals].filter(
      p => p.skillDir === path.join(homeDir, '.dsh/skills')
    );
    expect(dshEntries).toHaveLength(1);
  });

  // === 菜单上下文收敛（detectContext / detectMenu） ===

  const inGlobalDir = (agentDir: string) =>
    new ProjectDetector(path.join(homeDir, agentDir), { agents: getDefaultAgents(), homeDir });

  it('A: inside an agent config dir shows only that agent global', () => {
    fs.ensureDirSync(path.join(homeDir, '.dsh/skills'));
    fs.ensureDirSync(path.join(homeDir, '.claude'));

    const menu = inGlobalDir('.dsh').detectMenu();

    expect(menu.context).toEqual({ scope: 'global', agentId: 'dsh' });
    expect(menu.filtered).toBe(true);
    expect(menu.entries.map(entry => entry.label)).toEqual(['~/.dsh/skills']);
    expect(menu.entries[0].scope).toBe('global');
  });

  it('A: lists the global entry even when the skills dir does not exist yet', () => {
    fs.ensureDirSync(path.join(homeDir, '.dsh'));

    const menu = inGlobalDir('.dsh').detectMenu();

    expect(menu.entries.map(entry => entry.label)).toEqual(['~/.dsh/skills']);
  });

  it('A: also matches subdirectories of the agent config dir', () => {
    fs.ensureDirSync(path.join(homeDir, '.dsh/skills'));

    expect(inGlobalDir('.dsh/skills').detectMenu().context).toEqual({
      scope: 'global',
      agentId: 'dsh'
    });
  });

  it('A wins over project when the config dir also holds project-looking dirs', () => {
    fs.ensureDirSync(path.join(homeDir, '.dsh/.claude'));

    const detectorInDsh = inGlobalDir('.dsh');

    // 项目级检测确实能看到 .claude/skills，但菜单应被收敛到 global
    expect(detectorInDsh.detectAll('project').some(p => p.label === '.claude/skills')).toBe(true);
    const menu = detectorInDsh.detectMenu();
    expect(menu.context.scope).toBe('global');
    expect(menu.entries.every(entry => entry.scope === 'global')).toBe(true);
  });

  it('B: inside a project hides every global', () => {
    fs.ensureDirSync(path.join(homeDir, '.dsh'));
    fs.ensureDirSync(path.join(homeDir, '.claude'));
    fs.ensureDirSync(path.join(projectDir, '.claude'));

    const menu = detector().detectMenu();

    expect(menu.context).toEqual({ scope: 'project' });
    expect(menu.filtered).toBe(true);
    expect(menu.entries.map(entry => entry.label)).toEqual(['.claude/skills']);
    expect(menu.entries.every(entry => entry.scope === 'project')).toBe(true);
  });

  it('C: with no context, lists all global entries unfiltered', () => {
    fs.ensureDirSync(path.join(homeDir, '.dsh'));
    fs.ensureDirSync(path.join(homeDir, '.claude'));

    const menu = detector().detectMenu();

    expect(menu.context).toEqual({ scope: 'none' });
    expect(menu.filtered).toBe(false);
    expect(menu.entries.map(entry => entry.label).sort()).toEqual([
      '~/.claude/skills',
      '~/.dsh/skills'
    ]);
  });

  it('never treats the home directory as a project root', () => {
    // ~/.pi 存在时，在 ~ 下 `.pi/skills` 会解析成 ~/.pi/skills，它是无效位置
    fs.ensureDirSync(path.join(homeDir, '.pi'));

    const inHome = new ProjectDetector(homeDir, { agents: getDefaultAgents(), homeDir });

    expect(inHome.detectAll('project')).toEqual([]);
    expect(inHome.detectContext()).toEqual({ scope: 'none' });
    expect(inHome.detectMenu().entries.every(entry => entry.scope === 'global')).toBe(true);
  });

  it('detectAllEntries bypasses the filtering', () => {
    fs.ensureDirSync(path.join(homeDir, '.dsh'));
    fs.ensureDirSync(path.join(projectDir, '.claude'));

    const menu = detector().detectAllEntries();

    expect(menu.filtered).toBe(false);
    expect(menu.entries.some(entry => entry.scope === 'project')).toBe(true);
    expect(menu.entries.some(entry => entry.scope === 'global')).toBe(true);
  });

  it('should respect an injected custom agent table', () => {
    fs.ensureDirSync(path.join(projectDir, '.custom-ai'));

    const custom = new ProjectDetector(projectDir, {
      homeDir,
      agents: [
        {
          id: 'custom-ai',
          label: 'Custom AI',
          projectSkillDirs: ['.custom-ai/skills'],
          globalSkillDirs: ['~/.custom-ai/skills'],
          detectGlobal: ['~/.custom-ai'],
          reservedNames: []
        }
      ]
    });

    const projects = custom.detectAll('project');
    expect(projects).toHaveLength(1);
    expect(projects[0].type).toBe('custom-ai');
    expect(projects[0].aliases).toEqual(['custom-ai']);
  });
});
