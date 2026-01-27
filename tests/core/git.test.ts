import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitManager } from '../../src/core/git';
import { execa } from 'execa';

vi.mock('execa');
vi.mock('fs-extra');

describe('GitManager', () => {
  let gitManager: GitManager;

  beforeEach(() => {
    vi.resetAllMocks();
    gitManager = new GitManager();
  });

  describe('checkGitVersion', () => {
    it('should pass if git version is >= 2.25', async () => {
      vi.mocked(execa).mockResolvedValue({ stdout: 'git version 2.30.0' } as any);
      await expect(gitManager.checkGitVersion()).resolves.not.toThrow();
    });

    it('should throw if git version is < 2.25', async () => {
      vi.mocked(execa).mockResolvedValue({ stdout: 'git version 2.20.0' } as any);
      await expect(gitManager.checkGitVersion()).rejects.toThrow('Git version must be >= 2.25');
    });
  });

  describe('normalizeUrl', () => {
    it('should normalize root repo url', () => {
      const result = gitManager.normalizeUrl('https://github.com/user/repo');
      expect(result).toEqual({ url: 'https://github.com/user/repo.git' });
    });

    it('should normalize root repo url with .git suffix', () => {
      const result = gitManager.normalizeUrl('https://github.com/user/repo.git');
      expect(result).toEqual({ url: 'https://github.com/user/repo.git' });
    });

    it('should normalize tree url with path', () => {
      const result = gitManager.normalizeUrl('https://github.com/user/repo/tree/main/path/to/skill');
      expect(result).toEqual({
        url: 'https://github.com/user/repo.git',
        branch: 'main',
        path: 'path/to/skill'
      });
    });

    it('should normalize tree url without path (root with branch)', () => {
      const result = gitManager.normalizeUrl('https://github.com/blader/humanizer/tree/main');
      expect(result).toEqual({
        url: 'https://github.com/blader/humanizer.git',
        branch: 'main'
      });
    });

    it('should strip query parameters', () => {
      const result = gitManager.normalizeUrl('https://github.com/user/repo/tree/main/skills/xlsx?a=1');
      expect(result).toEqual({
        url: 'https://github.com/user/repo.git',
        branch: 'main',
        path: 'skills/xlsx'
      });
    });

    it('should strip hash fragments', () => {
      const result = gitManager.normalizeUrl('https://github.com/user/repo#readme');
      expect(result).toEqual({ url: 'https://github.com/user/repo.git' });
    });

    it('should strip trailing slash from root url', () => {
      const result = gitManager.normalizeUrl('https://github.com/blader/humanizer/');
      expect(result).toEqual({ url: 'https://github.com/blader/humanizer.git' });
    });

    it('should strip trailing slash from tree url with path', () => {
      const result = gitManager.normalizeUrl('https://github.com/anthropics/skills/tree/main/skills/xlsx/');
      expect(result).toEqual({
        url: 'https://github.com/anthropics/skills.git',
        branch: 'main',
        path: 'skills/xlsx'
      });
    });

    it('should strip trailing slash and query params together', () => {
      const result = gitManager.normalizeUrl('https://github.com/anthropics/skills/tree/main/skills/xlsx/?a=2');
      expect(result).toEqual({
        url: 'https://github.com/anthropics/skills.git',
        branch: 'main',
        path: 'skills/xlsx'
      });
    });

    it('should handle multiple trailing slashes', () => {
      const result = gitManager.normalizeUrl('https://github.com/user/repo///');
      expect(result).toEqual({ url: 'https://github.com/user/repo.git' });
    });
  });

  describe('getRemoteHead', () => {
    it('should return commit hash', async () => {
      vi.mocked(execa).mockResolvedValue({ stdout: 'abcdef123456\tHEAD' } as any);
      const hash = await gitManager.getRemoteHead('url');
      expect(hash).toBe('abcdef123456');
    });
  });

  describe('cloneFull', () => {
    it('should call git clone', async () => {
      await gitManager.cloneFull('url', 'dest');
      expect(execa).toHaveBeenCalledWith('git', ['clone', 'url', 'dest']);
    });
  });

  describe('cloneSparse', () => {
    it('should call git commands in sequence', async () => {
      await gitManager.cloneSparse('url', 'dest', 'path', 'main');

      expect(execa).toHaveBeenNthCalledWith(1, 'git', ['clone', '--filter=blob:none', '--no-checkout', 'url', 'dest']);
      expect(execa).toHaveBeenNthCalledWith(2, 'git', ['sparse-checkout', 'init', '--cone'], { cwd: 'dest' });
      expect(execa).toHaveBeenNthCalledWith(3, 'git', ['sparse-checkout', 'set', 'path'], { cwd: 'dest' });
      expect(execa).toHaveBeenNthCalledWith(4, 'git', ['checkout', 'main'], { cwd: 'dest' });
    });
  });

  describe('fetch', () => {
    it('should call git fetch origin', async () => {
      await gitManager.fetch('/repo/path');
      expect(execa).toHaveBeenCalledWith('git', ['fetch', 'origin'], { cwd: '/repo/path' });
    });
  });

  describe('getDefaultBranch', () => {
    it('should return default branch from git ls-remote', async () => {
      vi.mocked(execa).mockResolvedValue({
        stdout: 'ref: refs/heads/develop\tHEAD\nabcdef123\tHEAD'
      } as any);
      const result = await gitManager.getDefaultBranch('user/repo');
      expect(result).toBe('develop');
      expect(execa).toHaveBeenCalledWith('git', ['ls-remote', '--symref', 'https://github.com/user/repo.git', 'HEAD']);
    });

    it('should return main as fallback', async () => {
      vi.mocked(execa).mockRejectedValue(new Error('Failed'));
      const result = await gitManager.getDefaultBranch('user/repo');
      expect(result).toBe('main');
    });
  });

  describe('getLocalPathCommitId', () => {
    it('should return commit id from local git log', async () => {
      vi.mocked(execa).mockResolvedValue({ stdout: 'localcommit123' } as any);
      const result = await gitManager.getLocalPathCommitId('/repo/path', 'skills/pdf');
      expect(result).toBe('localcommit123');
      expect(execa).toHaveBeenCalledWith('git', ['log', '-1', '--format=%H', '--', 'skills/pdf'], { cwd: '/repo/path' });
    });

    it('should fallback to HEAD if log fails', async () => {
      vi.mocked(execa)
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ stdout: 'headcommit123' } as any);
      const result = await gitManager.getLocalPathCommitId('/repo/path', 'skills/pdf');
      expect(result).toBe('headcommit123');
    });
  });

  describe('getRemotePathCommitId', () => {
    it('should return commit id from remote branch log', async () => {
      vi.mocked(execa).mockResolvedValue({ stdout: 'remotecommit123' } as any);
      const result = await gitManager.getRemotePathCommitId('/repo/path', 'origin/main', 'skills/pdf');
      expect(result).toBe('remotecommit123');
      expect(execa).toHaveBeenCalledWith('git', ['log', '-1', '--format=%H', 'origin/main', '--', 'skills/pdf'], { cwd: '/repo/path' });
    });
  });
});
