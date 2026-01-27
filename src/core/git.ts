import { execa } from 'execa';
import fs from 'fs-extra';

export interface GitUrlInfo {
  url: string;
  branch?: string;
  path?: string;
}

export class GitManager {
  public async checkGitVersion(): Promise<void> {
    try {
      const { stdout } = await execa('git', ['--version']);
      const match = stdout.match(/git version (\d+)\.(\d+)/);
      if (match) {
        const major = parseInt(match[1], 10);
        const minor = parseInt(match[2], 10);
        if (major < 2 || (major === 2 && minor < 25)) {
          throw new Error(`Git version must be >= 2.25. Found ${major}.${minor}`);
        }
      } else {
        throw new Error('Could not parse git version');
      }
    } catch (error) {
      throw new Error(`Failed to check git version: ${error}`);
    }
  }

  public normalizeUrl(inputUrl: string): GitUrlInfo {
    // 去掉 URL 末尾的斜杠
    let url = inputUrl.replace(/\/+$/, '');
    // 去掉 URL 参数
    url = url.split('?')[0].split('#')[0];
    // 去掉 .git 后缀
    url = url.replace(/\.git$/, '');

    // 匹配 tree/branch/path 格式（有子路径）
    const treePathMatch = url.match(/^(https:\/\/github\.com\/[^\/]+\/[^\/]+)\/tree\/([^\/]+)\/(.+)$/);
    if (treePathMatch) {
      // 去掉 path 末尾的斜杠
      const pathValue = treePathMatch[3].replace(/\/+$/, '');
      return {
        url: `${treePathMatch[1]}.git`,
        branch: treePathMatch[2],
        path: pathValue
      };
    }

    // 匹配 tree/branch 格式（根目录，无子路径）
    const treeBranchMatch = url.match(/^(https:\/\/github\.com\/[^\/]+\/[^\/]+)\/tree\/([^\/]+)$/);
    if (treeBranchMatch) {
      return {
        url: `${treeBranchMatch[1]}.git`,
        branch: treeBranchMatch[2]
        // 无 path，表示根目录
      };
    }

    return {
      url: `${url}.git`
    };
  }

  public async getRemoteHead(url: string, branch: string = 'HEAD'): Promise<string> {
    const { stdout } = await execa('git', ['ls-remote', url, branch]);
    const match = stdout.match(/^([a-f0-9]+)\t/);
    if (match) {
      return match[1];
    }
    throw new Error(`Could not get remote HEAD for ${url} ${branch}`);
  }

  public async cloneFull(url: string, dest: string): Promise<void> {
    await execa('git', ['clone', url, dest]);
  }

  public async cloneSparse(url: string, dest: string, subPath: string, branch: string = 'main'): Promise<void> {
    await execa('git', ['clone', '--filter=blob:none', '--no-checkout', url, dest]);

    await execa('git', ['sparse-checkout', 'init', '--cone'], { cwd: dest });

    await execa('git', ['sparse-checkout', 'set', subPath], { cwd: dest });

    await execa('git', ['checkout', branch], { cwd: dest });
  }

  public async pull(cwd: string): Promise<void> {
    await execa('git', ['pull'], { cwd });
  }

  public async fetch(cwd: string): Promise<void> {
    await execa('git', ['fetch', 'origin'], { cwd });
  }

  /**
   * 检查远程仓库中的 SKILL.md 是否存在
   * 使用 git ls-remote + git ls-tree 检查文件
   */
  public async checkRemoteSkillMd(userRepo: string, branch: string = 'main', subPath?: string): Promise<boolean> {
    const url = `https://github.com/${userRepo}.git`;
    const skillPath = subPath ? `${subPath}/SKILL.md` : 'SKILL.md';

    try {
      // 使用 git ls-tree 检查远程仓库中的文件是否存在
      // 先获取分支的 commit hash
      const { stdout: refStdout } = await execa('git', ['ls-remote', url, `refs/heads/${branch}`]);
      const commitMatch = refStdout.match(/^([a-f0-9]+)\t/);
      if (!commitMatch) {
        return false;
      }
      const commitHash = commitMatch[1];

      // 使用 git archive 来检查文件是否存在（不需要克隆整个仓库）
      // 如果文件不存在会抛出错误
      await execa('git', ['archive', '--remote', url, commitHash, skillPath]);
      return true;
    } catch {
      // git archive 可能不被支持，尝试备用方法
      try {
        // 备用：使用临时 shallow clone 检查
        const tmpDir = `/tmp/skm-check-${Date.now()}`;
        try {
          await execa('git', ['clone', '--depth=1', '--filter=blob:none', '--no-checkout', url, tmpDir]);
          await execa('git', ['sparse-checkout', 'init', '--cone'], { cwd: tmpDir });
          await execa('git', ['sparse-checkout', 'set', subPath || '.'], { cwd: tmpDir });
          await execa('git', ['checkout', branch], { cwd: tmpDir });

          const skillMdPath = subPath ? `${tmpDir}/${subPath}/SKILL.md` : `${tmpDir}/SKILL.md`;
          const exists = fs.existsSync(skillMdPath);

          // 清理
          await fs.remove(tmpDir);
          return exists;
        } catch {
          await fs.remove(tmpDir).catch(() => { });
          return false;
        }
      } catch {
        return false;
      }
    }
  }

  /**
   * 获取远程仓库默认分支
   * 使用 git ls-remote 获取 HEAD 引用
   */
  public async getDefaultBranch(userRepo: string): Promise<string> {
    const url = `https://github.com/${userRepo}.git`;

    try {
      // git ls-remote --symref url HEAD 会显示 HEAD 指向的分支
      const { stdout } = await execa('git', ['ls-remote', '--symref', url, 'HEAD']);
      // 输出格式: ref: refs/heads/main	HEAD
      const match = stdout.match(/ref: refs\/heads\/([^\t\n]+)/);
      if (match) {
        return match[1];
      }
    } catch {
      // 默认返回 main
    }
    return 'main';
  }

  /**
   * 从本地仓库获取指定路径的最新 commit id
   * 用于已经 clone 到本地的仓库
   */
  public async getLocalPathCommitId(repoDir: string, subPath: string): Promise<string> {
    try {
      const { stdout } = await execa('git', ['log', '-1', '--format=%H', '--', subPath], { cwd: repoDir });
      if (stdout.trim()) {
        return stdout.trim();
      }
    } catch {
      // fallback
    }
    // 如果失败，获取当前 HEAD
    const { stdout } = await execa('git', ['rev-parse', 'HEAD'], { cwd: repoDir });
    return stdout.trim();
  }

  /**
   * 获取远程分支中指定路径的最新 commit id
   * 用于更新检测（在 fetch 之后使用）
   */
  public async getRemotePathCommitId(repoDir: string, remoteBranch: string, subPath: string): Promise<string> {
    try {
      const { stdout } = await execa('git', ['log', '-1', '--format=%H', remoteBranch, '--', subPath], { cwd: repoDir });
      if (stdout.trim()) {
        return stdout.trim();
      }
    } catch {
      // fallback
    }
    // 如果失败，获取远程分支的 HEAD
    const { stdout } = await execa('git', ['rev-parse', remoteBranch], { cwd: repoDir });
    return stdout.trim();
  }
}
