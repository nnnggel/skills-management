import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigManager } from '../../src/core/config';
import os from 'os';
import path from 'path';
import fs from 'fs-extra';

vi.mock('os');
vi.mock('fs-extra');

describe('ConfigManager', () => {
  const mockHomeDir = '/mock/home';

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(os.homedir).mockReturnValue(mockHomeDir);
    vi.mocked(os.platform).mockReturnValue('darwin');
    vi.mocked(fs.ensureDirSync).mockImplementation(() => { });
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.writeJsonSync).mockImplementation(() => { });
  });

  it('should initialize directories and config file', () => {
    new ConfigManager();
    expect(fs.ensureDirSync).toHaveBeenCalledWith(path.join(mockHomeDir, '.skills-management'));
    expect(fs.ensureDirSync).toHaveBeenCalledWith(path.join(mockHomeDir, '.skills-management', 'repo'));
    expect(fs.writeJsonSync).toHaveBeenCalled();
  });

  it('should return correct home dir', () => {
    const config = new ConfigManager();
    expect(config.getHomeDir()).toBe(path.join(mockHomeDir, '.skills-management'));
  });

  it('should generate safe name correctly', () => {
    const config = new ConfigManager();
    expect(config.getSafeName('github:user/repo')).toBe('github__user__repo');
    expect(config.getSafeName('github:user/repo/path')).toBe('github__user__repo__path');
    expect(config.getSafeName('custom:skill')).toBe('custom__skill');
  });

  it('should parse safe name correctly', () => {
    const config = new ConfigManager();
    expect(config.parseSafeName('github__user__repo')).toBe('github:user/repo');
    expect(config.parseSafeName('github__user__repo__path')).toBe('github:user/repo/path');
    expect(config.parseSafeName('custom__skill')).toBe('custom:skill');
  });

  it('should return correct repo path', () => {
    const config = new ConfigManager();
    const id = 'github:user/repo';
    const expectedPath = path.join(mockHomeDir, '.skills-management', 'repo', 'github__user__repo');
    expect(config.getRepoPath(id)).toBe(expectedPath);
  });

  describe('getAITools', () => {
    it('should return user configured aiTools', () => {
      const customAITools = [
        { type: 'custom', skillDirs: ['.custom/skills'] }
      ];
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readJsonSync).mockReturnValue({ aiTools: customAITools });

      const config = new ConfigManager();
      expect(config.getAITools()).toEqual(customAITools);
    });

    it('should return null if aiTools not configured', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readJsonSync).mockReturnValue({ system: 'darwin' });

      const config = new ConfigManager();
      expect(config.getAITools()).toBeNull();
    });

    it('should return null if config file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const config = new ConfigManager();
      expect(config.getAITools()).toBeNull();
    });
  });
});
