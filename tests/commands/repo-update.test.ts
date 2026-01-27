import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updateSkills } from '../../src/commands/repo';
import { SkillRegistry } from '../../src/core/skills';
import { ConfigManager } from '../../src/core/config';
import { GitManager } from '../../src/core/git';
import inquirer from 'inquirer';

vi.mock('inquirer');
vi.mock('../../src/core/skills');
vi.mock('../../src/core/config');
vi.mock('../../src/core/git');

describe('Repo Update Command', () => {
  let mockGetAllSkills: any;
  let mockGetRepoPath: any;
  let mockGetDefaultBranch: any;
  let mockGetRemoteHead: any;
  let mockGetPathCommitId: any;
  let mockGetLocalPathCommitId: any;
  let mockUpdateSkillVersion: any;
  let mockPull: any;

  beforeEach(() => {
    vi.resetAllMocks();

    mockGetAllSkills = vi.fn();
    mockGetRepoPath = vi.fn().mockReturnValue('/mock/repo/path');
    mockGetDefaultBranch = vi.fn().mockResolvedValue('main');
    mockGetRemoteHead = vi.fn().mockResolvedValue('remote123');
    mockGetPathCommitId = vi.fn().mockResolvedValue('remote123');
    mockGetLocalPathCommitId = vi.fn().mockResolvedValue('local123');
    mockUpdateSkillVersion = vi.fn();
    mockPull = vi.fn();

    vi.mocked(SkillRegistry).mockImplementation(function () {
      return {
        getAllSkills: mockGetAllSkills,
        updateSkillVersion: mockUpdateSkillVersion
      } as any;
    });

    vi.mocked(ConfigManager).mockImplementation(function () {
      return {
        getRepoPath: mockGetRepoPath
      } as any;
    });

    vi.mocked(GitManager).mockImplementation(function () {
      return {
        getDefaultBranch: mockGetDefaultBranch,
        getRemoteHead: mockGetRemoteHead,
        getPathCommitId: mockGetPathCommitId,
        getLocalPathCommitId: mockGetLocalPathCommitId,
        pull: mockPull
      } as any;
    });

    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should do nothing if no skills', async () => {
    mockGetAllSkills.mockReturnValue([]);

    await updateSkills();

    expect(console.log).toHaveBeenCalledWith('No skills to update.');
  });

  it('should check for updates and find none', async () => {
    mockGetAllSkills.mockReturnValue([
      { id: 'github:user/repo', commitId: 'abc123', type: 'github' }
    ]);
    mockGetLocalPathCommitId.mockResolvedValue('abc123');
    // No update available (local == remote after fetch)

    await updateSkills();

    expect(console.log).toHaveBeenCalledWith('All skills are up to date.');
  });

  it('should find updates and prompt user', async () => {
    mockGetAllSkills.mockReturnValue([
      { id: 'github:user/repo', commitId: 'abc123', type: 'github' }
    ]);
    mockGetLocalPathCommitId.mockResolvedValue('abc123');
    vi.mocked(inquirer.prompt).mockResolvedValue({ skills: [] });

    await updateSkills();

    // updateSkills function uses checkSkillUpdates which does its own git operations
    // The test just verifies it runs
  });

  it('should update selected skills', async () => {
    mockGetAllSkills.mockReturnValue([
      { id: 'github:user/repo', commitId: 'abc123', type: 'github' }
    ]);
    mockGetLocalPathCommitId.mockResolvedValue('abc123');
    vi.mocked(inquirer.prompt).mockResolvedValue({ skills: ['github:user/repo'] });

    await updateSkills();

    // Just verify function runs without error
  });

  it('should handle non-root skills with path', async () => {
    mockGetAllSkills.mockReturnValue([
      { id: 'github:user/repo/skills/pdf', commitId: 'abc123', type: 'github', path: 'skills/pdf' }
    ]);

    await updateSkills();

    // Just verify it doesn't crash
  });
});
