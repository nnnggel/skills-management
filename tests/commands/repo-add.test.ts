import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { addSkillInteractive } from '../../src/commands/repo';
import { SkillRegistry } from '../../src/core/skills';
import { ConfigManager } from '../../src/core/config';
import { GitManager } from '../../src/core/git';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';

vi.mock('inquirer');
vi.mock('fs-extra');
vi.mock('../../src/core/skills');
vi.mock('../../src/core/config');
vi.mock('../../src/core/git');

describe('Repo Add Command', () => {
  let mockGetSkill: any;
  let mockAddSkill: any;
  let mockGetRepoPath: any;
  let mockCheckGitVersion: any;
  let mockNormalizeUrl: any;
  let mockCloneFull: any;
  let mockCloneSparse: any;
  let mockGetRemoteHead: any;
  let mockCheckRemoteSkillMd: any;
  let mockGetDefaultBranch: any;
  let mockGetLocalPathCommitId: any;

  beforeEach(() => {
    vi.resetAllMocks();

    mockGetSkill = vi.fn();
    mockAddSkill = vi.fn();
    mockGetRepoPath = vi.fn().mockReturnValue('/mock/repo/path');
    mockCheckGitVersion = vi.fn();
    mockNormalizeUrl = vi.fn();
    mockCloneFull = vi.fn();
    mockCloneSparse = vi.fn();
    mockGetRemoteHead = vi.fn().mockResolvedValue('abcdef123');
    mockCheckRemoteSkillMd = vi.fn().mockResolvedValue(true);
    mockGetDefaultBranch = vi.fn().mockResolvedValue('main');
    mockGetLocalPathCommitId = vi.fn().mockResolvedValue('abcdef123');

    vi.mocked(SkillRegistry).mockImplementation(function () {
      return {
        getSkill: mockGetSkill,
        addSkill: mockAddSkill
      } as any;
    });

    vi.mocked(ConfigManager).mockImplementation(function () {
      return {
        getRepoPath: mockGetRepoPath
      } as any;
    });

    vi.mocked(GitManager).mockImplementation(function () {
      return {
        checkGitVersion: mockCheckGitVersion,
        normalizeUrl: mockNormalizeUrl,
        cloneFull: mockCloneFull,
        cloneSparse: mockCloneSparse,
        getRemoteHead: mockGetRemoteHead,
        checkRemoteSkillMd: mockCheckRemoteSkillMd,
        getDefaultBranch: mockGetDefaultBranch,
        getLocalPathCommitId: mockGetLocalPathCommitId
      } as any;
    });

    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(console, 'error').mockImplementation(() => { });
    vi.spyOn(console, 'warn').mockImplementation(() => { });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should prompt for URL if not provided', async () => {
    // Mock type selection and URL input
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ type: '1' })
      .mockResolvedValueOnce({ url: 'https://github.com/user/repo' });
    mockNormalizeUrl.mockReturnValue({ url: 'https://github.com/user/repo.git' });

    await addSkillInteractive();

    expect(inquirer.prompt).toHaveBeenCalled();
    expect(mockNormalizeUrl).toHaveBeenCalledWith('https://github.com/user/repo');
  });

  it('should clone full repo if no path', async () => {
    mockNormalizeUrl.mockReturnValue({ url: 'https://github.com/user/repo.git' });
    vi.mocked(fs.existsSync).mockReturnValue(true);

    await addSkillInteractive('https://github.com/user/repo');

    expect(mockCheckRemoteSkillMd).toHaveBeenCalledWith('user/repo', 'main', undefined);
    expect(mockCloneFull).toHaveBeenCalledWith('https://github.com/user/repo.git', '/mock/repo/path');
    expect(mockGetLocalPathCommitId).toHaveBeenCalledWith('/mock/repo/path', '.');
    expect(mockAddSkill).toHaveBeenCalledWith('github:user/repo', 'github', 'abcdef123', undefined);
  });

  it('should clone sparse repo if path exists', async () => {
    mockNormalizeUrl.mockReturnValue({
      url: 'https://github.com/user/repo.git',
      branch: 'main',
      path: 'skills/pdf'
    });
    vi.mocked(fs.existsSync).mockReturnValue(true);

    await addSkillInteractive('https://github.com/user/repo/tree/main/skills/pdf');

    expect(mockCheckRemoteSkillMd).toHaveBeenCalledWith('user/repo', 'main', 'skills/pdf');
    expect(mockCloneSparse).toHaveBeenCalledWith(
      'https://github.com/user/repo.git',
      '/mock/repo/path',
      'skills/pdf',
      'main'
    );
    expect(mockGetLocalPathCommitId).toHaveBeenCalledWith('/mock/repo/path', 'skills/pdf');
    expect(mockAddSkill).toHaveBeenCalledWith(
      'github:user/repo/skills/pdf',
      'github',
      'abcdef123',
      'skills/pdf'
    );
  });

  it('should handle existing skill overwrite', async () => {
    mockNormalizeUrl.mockReturnValue({ url: 'https://github.com/user/repo.git' });
    mockGetSkill.mockReturnValue({});
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ overwrite: true });
    vi.mocked(fs.existsSync).mockReturnValue(true);

    await addSkillInteractive('https://github.com/user/repo');

    expect(inquirer.prompt).toHaveBeenCalled();
    expect(fs.remove).toHaveBeenCalledWith('/mock/repo/path');
    expect(mockCloneFull).toHaveBeenCalled();
  });

  it('should cancel if overwrite denied', async () => {
    mockNormalizeUrl.mockReturnValue({ url: 'https://github.com/user/repo.git' });
    mockGetSkill.mockReturnValue({});
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ overwrite: false });

    await addSkillInteractive('https://github.com/user/repo');

    expect(fs.remove).not.toHaveBeenCalled();
    expect(mockCloneFull).not.toHaveBeenCalled();
  });

  it('should error if SKILL.md not found', async () => {
    mockNormalizeUrl.mockReturnValue({ url: 'https://github.com/user/repo.git' });
    mockCheckRemoteSkillMd.mockResolvedValue(false);

    await addSkillInteractive('https://github.com/user/repo');

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('SKILL.md not found'));
    expect(mockCloneFull).not.toHaveBeenCalled();
  });
});
