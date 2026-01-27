import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SkillRegistry } from '../../src/core/skills';
import { ConfigManager } from '../../src/core/config';
import fs from 'fs-extra';
import path from 'path';

vi.mock('fs-extra');
vi.mock('../../src/core/config');

describe('SkillRegistry', () => {
  let skillRegistry: SkillRegistry;
  let mockConfigManager: ConfigManager;
  const mockRepoDir = '/mock/repo';

  beforeEach(() => {
    vi.resetAllMocks();
    mockConfigManager = new ConfigManager();
    vi.mocked(mockConfigManager.getRepoDir).mockReturnValue(mockRepoDir);
    skillRegistry = new SkillRegistry(mockConfigManager);
  });

  describe('addSkill', () => {
    it('should add a new skill without id in stored object', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.writeJsonSync).mockImplementation(() => { });

      skillRegistry.addSkill('id', 'commit', 'type');

      expect(fs.writeJsonSync).toHaveBeenCalledWith(
        path.join(mockRepoDir, 'versions.json'),
        {
          id: { commitId: 'commit', type: 'type', path: undefined }
        },
        { spaces: 2 }
      );
    });
  });

  describe('removeSkill', () => {
    it('should remove a skill', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readJsonSync).mockReturnValue({
        id: { commitId: 'commit', type: 'type' }
      });
      vi.mocked(fs.writeJsonSync).mockImplementation(() => { });

      skillRegistry.removeSkill('id');

      expect(fs.writeJsonSync).toHaveBeenCalledWith(
        path.join(mockRepoDir, 'versions.json'),
        {},
        { spaces: 2 }
      );
    });
  });

  describe('getSkill', () => {
    it('should return a skill with id from key', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readJsonSync).mockReturnValue({
        id: { commitId: 'commit', type: 'type' }
      });

      const skill = skillRegistry.getSkill('id');
      expect(skill).toEqual({ id: 'id', commitId: 'commit', type: 'type' });
    });

    it('should return undefined if skill not found', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readJsonSync).mockReturnValue({});

      const skill = skillRegistry.getSkill('id');
      expect(skill).toBeUndefined();
    });
  });

  describe('updateSkillVersion', () => {
    it('should update skill version', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readJsonSync).mockReturnValue({
        id: { commitId: 'commit', type: 'type' }
      });
      vi.mocked(fs.writeJsonSync).mockImplementation(() => { });

      skillRegistry.updateSkillVersion('id', 'newCommit');

      expect(fs.writeJsonSync).toHaveBeenCalledWith(
        path.join(mockRepoDir, 'versions.json'),
        {
          id: { commitId: 'newCommit', type: 'type' }
        },
        { spaces: 2 }
      );
    });
  });
});
