import fs from 'fs-extra';
import path from 'path';

export type ProjectType = 'opencode' | 'cursor' | 'gemini' | 'antigravity' | 'claude' | 'github' | 'unknown';

export interface ProjectInfo {
  type: ProjectType;
  root: string;
  skillDir?: string;
}

export class ProjectDetector {
  private cwd: string;

  private static readonly AI_TOOLS: { dir: string; type: ProjectType }[] = [
    { dir: '.opencode', type: 'opencode' },
    { dir: '.cursor', type: 'cursor' },
    { dir: '.gemini', type: 'gemini' },
    { dir: '.antigravity', type: 'antigravity' },
    { dir: '.claude', type: 'claude' },
    { dir: '.github', type: 'github' }
  ];

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
  }

  /**
   * 检测所有存在的 AI 项目类型
   */
  public detectAll(): ProjectInfo[] {
    const projects: ProjectInfo[] = [];

    for (const tool of ProjectDetector.AI_TOOLS) {
      if (fs.existsSync(path.join(this.cwd, tool.dir))) {
        projects.push({
          type: tool.type,
          root: this.cwd,
          skillDir: path.join(this.cwd, tool.dir, 'skills')
        });
      }
    }

    return projects;
  }

  /**
   * 检测第一个存在的 AI 项目类型（向后兼容）
   */
  public detect(): ProjectInfo {
    const projects = this.detectAll();
    if (projects.length > 0) {
      return projects[0];
    }
    return {
      type: 'unknown',
      root: this.cwd
    };
  }
}
