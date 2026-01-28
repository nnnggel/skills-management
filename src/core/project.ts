import fs from 'fs-extra';
import path from 'path';

export type ProjectType = 'opencode' | 'cursor' | 'antigravity' | 'github' | 'claude' | 'unknown';

export interface ProjectInfo {
  type: ProjectType;
  root: string;
  skillDir?: string;
}

export class ProjectDetector {
  private cwd: string;

  // 每个 AI 工具及其对应的 skills 目录路径
  private static readonly AI_TOOLS: { type: ProjectType; skillDirs: string[] }[] = [
    // antigravity: .gemini/antigravity/global_skills/skills, .agent/skills
    { type: 'antigravity', skillDirs: ['.gemini/antigravity/global_skills/skills', '.agent/skills'] },
    // github: .copilot/skills, .github/skills
    { type: 'github', skillDirs: ['.copilot/skills', '.github/skills'] },
    // cursor: .cursor/skills
    { type: 'cursor', skillDirs: ['.cursor/skills'] },
    // claude: .claude/skills
    { type: 'claude', skillDirs: ['.claude/skills'] },
    // openCode: .opencode/skills
    { type: 'opencode', skillDirs: ['.opencode/skills'] }
  ];

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
  }

  /**
   * 检测所有存在的 AI 项目类型
   * 如果某个工具的任意一个 skillDir 的父目录存在，则认为该工具存在
   */
  public detectAll(): ProjectInfo[] {
    const projects: ProjectInfo[] = [];

    for (const tool of ProjectDetector.AI_TOOLS) {
      // 检查每个 skillDir，找到第一个父目录存在的
      for (const skillDir of tool.skillDirs) {
        const fullSkillDir = path.join(this.cwd, skillDir);
        const parentDir = path.dirname(fullSkillDir);
        if (fs.existsSync(parentDir)) {
          projects.push({
            type: tool.type,
            root: this.cwd,
            skillDir: fullSkillDir
          });
          break; // 找到一个就跳出，避免重复添加
        }
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
