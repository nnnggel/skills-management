import fs from 'fs-extra';
import path from 'path';
import { ConfigManager } from './config';

export interface Skill {
  id: string;
  commitId: string;
  type: string;
  path?: string;
}

// 存储格式（不包含 id）
interface StoredSkill {
  commitId: string;
  type: string;
  path?: string;
}

export class SkillRegistry {
  private versionsFile: string;

  constructor(configManager: ConfigManager) {
    this.versionsFile = path.join(configManager.getRepoDir(), 'versions.json');
  }

  private getStoredSkills(): Record<string, StoredSkill> {
    if (!fs.existsSync(this.versionsFile)) {
      return {};
    }
    return fs.readJsonSync(this.versionsFile);
  }

  private saveSkills(skills: Record<string, StoredSkill>) {
    fs.writeJsonSync(this.versionsFile, skills, { spaces: 2 });
  }

  public addSkill(id: string, commitId: string, type: string, skillPath?: string) {
    const skills = this.getStoredSkills();
    skills[id] = { commitId, type, path: skillPath };
    this.saveSkills(skills);
  }

  public removeSkill(id: string) {
    const skills = this.getStoredSkills();
    delete skills[id];
    this.saveSkills(skills);
  }

  public getSkill(id: string): Skill | undefined {
    const skills = this.getStoredSkills();
    const stored = skills[id];
    if (!stored) return undefined;
    return { id, ...stored };
  }

  public updateSkillVersion(id: string, newCommitId: string) {
    const skills = this.getStoredSkills();
    if (skills[id]) {
      skills[id].commitId = newCommitId;
      this.saveSkills(skills);
    }
  }

  public getAllSkills(): Skill[] {
    const skills = this.getStoredSkills();
    return Object.entries(skills).map(([id, stored]) => ({ id, ...stored }));
  }
}
