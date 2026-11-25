import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { linkSkillToProject, unlinkSkillFromProject } from '../../src/commands/project';
import { ConfigManager } from '../../src/core/config';
import { SkillRegistry } from '../../src/core/skills';
import { ProjectInfo } from '../../src/core/project';

// 集成测试：真实文件系统 + HOME 指向临时目录，验证用户级（global）软链的落地、解链与保留名保护
describe('global scope link (real fs)', () => {
  let tmpHome: string;
  let claudeSkillsDir: string;

  const claudeGlobal = (): ProjectInfo => ({
    type: 'claude-code',
    root: tmpHome,
    skillDir: claudeSkillsDir,
    scope: 'global',
    reservedNames: ['synced']
  });

  beforeAll(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'skm-global-'));
    process.env.HOME = tmpHome;
    claudeSkillsDir = path.join(tmpHome, '.claude/skills');
    fs.ensureDirSync(path.join(tmpHome, '.claude'));

    // 在临时 home 中准备一个技能仓库
    const configManager = new ConfigManager();
    const registry = new SkillRegistry(configManager);

    for (const id of ['local:demo', 'synced']) {
      const repoPath = configManager.getRepoPath(id);
      fs.ensureDirSync(repoPath);
      fs.writeFileSync(
        path.join(repoPath, 'SKILL.md'),
        `---\nname: ${id.split(':').pop()}\ndescription: smoke test skill\n---\n`
      );
      registry.addSkill(id, 'local');
    }
  });

  it('should symlink into ~/.claude/skills using the skm safe name', async () => {
    await linkSkillToProject('local:demo', claudeGlobal());

    const linkPath = path.join(claudeSkillsDir, 'local__demo');
    expect(fs.existsSync(linkPath)).toBe(true);
    expect(fs.lstatSync(linkPath).isSymbolicLink()).toBe(true);
    expect(fs.existsSync(path.join(linkPath, 'SKILL.md'))).toBe(true);

    await unlinkSkillFromProject('local:demo', claudeGlobal());
    expect(fs.existsSync(linkPath)).toBe(false);
  });

  it('should refuse a reserved directory name', async () => {
    // 无 `type:` 前缀的 id，getSafeName 结果就是 'synced'，与 Claude Code 保留名冲突
    await linkSkillToProject('synced', claudeGlobal());

    expect(fs.existsSync(path.join(claudeSkillsDir, 'synced'))).toBe(false);
  });
});
