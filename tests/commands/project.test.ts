import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { manageProjectSkills, linkSkillToProject, unlinkSkillFromProject } from '../../src/commands/project';
import { SkillRegistry } from '../../src/core/skills';
import { ConfigManager } from '../../src/core/config';
import { ProjectDetector, ProjectInfo } from '../../src/core/project';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';

vi.mock('inquirer');
vi.mock('fs-extra');
vi.mock('os');
vi.mock('../../src/core/skills');
vi.mock('../../src/core/config');
vi.mock('../../src/core/project');

describe('Project Command', () => {
  let mockGetAllSkills: any;
  let mockGetSkill: any;
  let mockGetRepoPath: any;
  let mockGetSafeName: any;
  let mockDetect: any;

  beforeEach(() => {
    vi.resetAllMocks();

    mockGetAllSkills = vi.fn().mockReturnValue([]);
    mockGetSkill = vi.fn().mockReturnValue({ id: 'skill1' });
    mockGetRepoPath = vi.fn().mockImplementation((id) => `/mock/repo/${id}`);
    mockGetSafeName = vi.fn().mockImplementation((id) => id.replace(/:/g, '__').replace(/\//g, '__'));
    mockDetect = vi.fn().mockReturnValue({ type: 'unknown' });

    vi.mocked(SkillRegistry).mockImplementation(function () {
      return {
        getAllSkills: mockGetAllSkills,
        getSkill: mockGetSkill
      } as any;
    });

    vi.mocked(ConfigManager).mockImplementation(function () {
      return {
        getRepoPath: mockGetRepoPath,
        getSafeName: mockGetSafeName,
        getAITools: vi.fn().mockReturnValue(null)
      } as any;
    });

    vi.mocked(ProjectDetector).mockImplementation(function () {
      return {
        detect: mockDetect
      } as any;
    });

    vi.mocked(os.platform).mockReturnValue('darwin');
    vi.mocked(fs.readdirSync).mockReturnValue([]);
    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should do nothing if no project detected', async () => {
    await manageProjectSkills();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No supported AI project detected'));
  });

  it('should do nothing if no global skills', async () => {
    mockDetect.mockReturnValue({ type: 'opencode', root: '/mock', skillDir: '/mock/.opencode/skills' });
    await manageProjectSkills();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No skills in global repository'));
  });

  it('should link skill when toggle selected (not linked)', async () => {
    const projectInfo: ProjectInfo = { type: 'opencode', root: '/mock', skillDir: '/mock/.opencode/skills' };
    mockDetect.mockReturnValue(projectInfo);
    mockGetAllSkills.mockReturnValue([{ id: 'skill1' }]);
    vi.mocked(fs.existsSync).mockReturnValue(false);
    // checkbox 返回选中的 skill
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ selected: ['skill1'] });

    await manageProjectSkills(projectInfo);

    expect(fs.ensureSymlink).toHaveBeenCalledWith(
      '/mock/repo/skill1',
      path.join('/mock/.opencode/skills', 'skill1'),
      'dir'
    );
  });

  it('should unlink skill when toggle selected (already linked)', async () => {
    const projectInfo: ProjectInfo = { type: 'opencode', root: '/mock', skillDir: '/mock/.opencode/skills' };
    mockDetect.mockReturnValue(projectInfo);
    mockGetAllSkills.mockReturnValue([{ id: 'skill1' }]);
    vi.mocked(fs.existsSync).mockReturnValue(true);
    // checkbox 返回空数组（取消选中）
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ selected: [] });

    await manageProjectSkills(projectInfo);

    expect(fs.remove).toHaveBeenCalledWith(path.join('/mock/.opencode/skills', 'skill1'));
  });

  it('should use junction on windows', async () => {
    vi.mocked(os.platform).mockReturnValue('win32');
    const projectInfo: ProjectInfo = { type: 'opencode', root: '/mock', skillDir: '/mock/.opencode/skills' };
    mockDetect.mockReturnValue(projectInfo);
    mockGetAllSkills.mockReturnValue([{ id: 'skill1' }]);
    vi.mocked(fs.existsSync).mockReturnValue(false);
    // checkbox 返回选中的 skill
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ selected: ['skill1'] });

    await manageProjectSkills(projectInfo);

    expect(fs.ensureSymlink).toHaveBeenCalledWith(
      '/mock/repo/skill1',
      path.join('/mock/.opencode/skills', 'skill1'),
      'junction'
    );
  });

  it('should link to subpath for non-root skills', async () => {
    const projectInfo: ProjectInfo = { type: 'opencode', root: '/mock', skillDir: '/mock/.opencode/skills' };
    mockGetSkill.mockReturnValue({ id: 'github:user/repo/skills/pdf', path: 'skills/pdf' });
    vi.mocked(fs.existsSync).mockReturnValue(false);

    await linkSkillToProject('github:user/repo/skills/pdf', projectInfo);

    expect(fs.ensureSymlink).toHaveBeenCalledWith(
      path.join('/mock/repo/github:user/repo/skills/pdf', 'skills/pdf'),
      expect.any(String),
      'dir'
    );
  });
});
