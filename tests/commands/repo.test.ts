import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listSkills, deleteSkill } from '../../src/commands/repo';
import { SkillRegistry } from '../../src/core/skills';
import { ConfigManager } from '../../src/core/config';
import inquirer from 'inquirer';
import fs from 'fs-extra';

vi.mock('inquirer');
vi.mock('fs-extra');
vi.mock('../../src/core/skills');
vi.mock('../../src/core/config');

describe('Repo Commands', () => {
  let mockGetAllSkills: any;
  let mockRemoveSkill: any;
  let mockGetRepoPath: any;

  beforeEach(() => {
    vi.resetAllMocks();

    mockGetAllSkills = vi.fn().mockReturnValue([]);
    mockRemoveSkill = vi.fn();
    mockGetRepoPath = vi.fn().mockReturnValue('/mock/repo/path');

    vi.mocked(SkillRegistry).mockImplementation(function () {
      return {
        getAllSkills: mockGetAllSkills,
        removeSkill: mockRemoveSkill
      } as any;
    });

    vi.mocked(ConfigManager).mockImplementation(function () {
      return {
        getRepoPath: mockGetRepoPath,
        getHomeDir: vi.fn(),
        getRepoDir: vi.fn(),
        getSafeName: vi.fn(),
        parseSafeName: vi.fn(),
        getAITools: vi.fn().mockReturnValue(null)
      } as any;
    });

    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(console, 'table').mockImplementation(() => { });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('listSkills', () => {
    it('should log message if no skills found', async () => {
      await listSkills();
      expect(console.log).toHaveBeenCalledWith('No skills found in repository.');
    });

    it('should display table if skills exist', async () => {
      mockGetAllSkills.mockReturnValue([
        { id: 'id', commitId: 'abcdef123', type: 'github', path: 'path' }
      ]);
      await listSkills();
      expect(console.table).toHaveBeenCalled();
    });
  });

  describe('deleteSkill', () => {
    it('should do nothing if no skills and no id provided', async () => {
      await deleteSkill();
      expect(console.log).toHaveBeenCalledWith('No skills to delete.');
    });

    it('should prompt for skill if not provided', async () => {
      mockGetAllSkills.mockReturnValue([{ id: 'id', commitId: 'c', type: 't' }]);
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ skillId: 'id' });
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ sure: true });

      await deleteSkill();

      expect(inquirer.prompt).toHaveBeenCalledTimes(2);
      expect(fs.remove).toHaveBeenCalledWith('/mock/repo/path');
      expect(mockRemoveSkill).toHaveBeenCalledWith('id');
    });

    it('should not delete if not confirmed', async () => {
      mockGetAllSkills.mockReturnValue([{ id: 'id', commitId: 'c', type: 't' }]);
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ skillId: 'id' });
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ sure: false });

      await deleteSkill();

      expect(fs.remove).not.toHaveBeenCalled();
      expect(mockRemoveSkill).not.toHaveBeenCalled();
    });

    it('should delete if id provided and confirmed', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ sure: true });

      await deleteSkill('id');

      expect(inquirer.prompt).toHaveBeenCalledTimes(1);
      expect(fs.remove).toHaveBeenCalledWith('/mock/repo/path');
      expect(mockRemoveSkill).toHaveBeenCalledWith('id');
    });
  });
});
