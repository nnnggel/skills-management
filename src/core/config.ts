import os from 'os';
import path from 'path';
import fs from 'fs-extra';

export class ConfigManager {
  private homeDir: string;
  private repoDir: string;
  private configFile: string;

  constructor() {
    this.homeDir = path.join(os.homedir(), '.skills-management');
    this.repoDir = path.join(this.homeDir, 'repo');
    this.configFile = path.join(this.homeDir, 'config.json');
    this.init();
  }

  private init() {
    fs.ensureDirSync(this.homeDir);
    fs.ensureDirSync(this.repoDir);
    if (!fs.existsSync(this.configFile)) {
      fs.writeJsonSync(this.configFile, { system: os.platform() }, { spaces: 2 });
    }
  }

  public getHomeDir(): string {
    return this.homeDir;
  }

  public getRepoDir(): string {
    return this.repoDir;
  }

  public getSafeName(id: string): string {
    const parts = id.split(':');
    if (parts.length < 2) {
      return id.replace(/\//g, '__');
    }

    const type = parts[0];
    const rest = parts.slice(1).join(':');

    const safeRest = rest.replace(/\//g, '__');

    return `${type}__${safeRest}`;
  }

  public parseSafeName(safeName: string): string {
    const parts = safeName.split('__');
    if (parts.length < 2) {
      return safeName;
    }

    const type = parts[0];
    const rest = parts.slice(1).join('/');

    return `${type}:${rest}`;
  }

  public getRepoPath(id: string): string {
    return path.join(this.repoDir, this.getSafeName(id));
  }

  /**
   * 获取用户自定义的 AI Tools 配置
   * @returns 用户配置的 aiTools 数组，如果未配置则返回 null
   */
  public getAITools(): AIToolConfig[] | null {
    try {
      if (fs.existsSync(this.configFile)) {
        const config = fs.readJsonSync(this.configFile);
        if (config.aiTools && Array.isArray(config.aiTools)) {
          return config.aiTools;
        }
      }
    } catch (error: any) {
      console.error(`Error: Failed to read config.json: ${error.message}`);
      process.exit(1);
    }
    return null;
  }
}

export interface AIToolConfig {
  type: string;
  skillDirs: string[];
}
