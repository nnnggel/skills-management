import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { ConfigManager } from '../core/config';
import { SkillRegistry } from '../core/skills';
import { ProjectDetector, ProjectInfo } from '../core/project';

export async function linkSkillToProject(skillId: string, projectInfo: ProjectInfo) {
  const configManager = new ConfigManager();
  const skillRegistry = new SkillRegistry(configManager);

  if (!projectInfo.skillDir) {
    console.log('No skill directory for this project.');
    return;
  }

  const skill = skillRegistry.getSkill(skillId);
  if (!skill) {
    console.log(`Skill ${skillId} not found in repository.`);
    return;
  }

  fs.ensureDirSync(projectInfo.skillDir);

  const safeName = configManager.getSafeName(skill.id);
  const linkPath = path.join(projectInfo.skillDir, safeName);
  const repoPath = configManager.getRepoPath(skill.id);

  // 确定链接目标路径：
  // - 如果有 path（非根路径 skill），链接到 repoPath/skill.path
  // - 如果没有 path（根路径 skill），链接到 repoPath
  let targetPath = repoPath;
  if (skill.path) {
    targetPath = path.join(repoPath, skill.path);
  }

  if (fs.existsSync(linkPath)) {
    console.log(`Skill ${skillId} is already linked.`);
    return;
  }

  try {
    const type = os.platform() === 'win32' ? 'junction' : 'dir';
    await fs.ensureSymlink(targetPath, linkPath, type);
    console.log(`Linked ${skill.id}`);
  } catch (error: any) {
    console.error(`Failed to link ${skill.id}: ${error.message}`);
  }
}

export async function unlinkSkillFromProject(skillId: string, projectInfo: ProjectInfo) {
  const configManager = new ConfigManager();

  if (!projectInfo.skillDir) {
    console.log('No skill directory for this project.');
    return;
  }

  const safeName = configManager.getSafeName(skillId);
  const linkPath = path.join(projectInfo.skillDir, safeName);

  if (!fs.existsSync(linkPath)) {
    console.log(`Skill ${skillId} is not linked.`);
    return;
  }

  try {
    await fs.remove(linkPath);
    console.log(`Unlinked ${skillId}`);
  } catch (error: any) {
    console.error(`Failed to unlink ${skillId}: ${error.message}`);
  }
}

/**
 * 检测失效的符号链接
 */
function findBrokenLinks(skillDir: string): string[] {
  const broken: string[] = [];

  if (!fs.existsSync(skillDir)) {
    return broken;
  }

  const entries = fs.readdirSync(skillDir);
  for (const entry of entries) {
    const linkPath = path.join(skillDir, entry);
    try {
      const stats = fs.lstatSync(linkPath);
      if (stats.isSymbolicLink()) {
        const target = fs.readlinkSync(linkPath);
        if (!fs.existsSync(target)) {
          broken.push(entry);
        }
      }
    } catch {
      // 忽略错误
    }
  }

  return broken;
}

export async function manageProjectSkills(projectInfo?: ProjectInfo) {
  const configManager = new ConfigManager();
  const skillRegistry = new SkillRegistry(configManager);

  // 如果没有传入 projectInfo，则检测当前项目
  if (!projectInfo) {
    const projectDetector = new ProjectDetector();
    projectInfo = projectDetector.detect();
  }

  if (projectInfo.type === 'unknown' || !projectInfo.skillDir) {
    console.log('No supported AI project detected in current directory.');
    return;
  }

  console.log(`\nManaging ${projectInfo.type} project skills`);
  console.log(`Skill directory: ${projectInfo.skillDir}\n`);

  fs.ensureDirSync(projectInfo.skillDir);

  // 检测失效的符号链接
  const brokenLinks = findBrokenLinks(projectInfo.skillDir);
  if (brokenLinks.length > 0) {
    console.log('⚠ Found broken symlinks:');
    for (const link of brokenLinks) {
      console.log(`  - ${link}`);
    }

    const cleanupAnswer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'cleanup',
        message: 'Remove broken symlinks?',
        default: true
      }
    ]);

    if (cleanupAnswer.cleanup) {
      for (const link of brokenLinks) {
        const linkPath = path.join(projectInfo.skillDir!, link);
        await fs.remove(linkPath);
        console.log(`Removed broken link: ${link}`);
      }
    }
    console.log('');
  }

  const skills = skillRegistry.getAllSkills().sort((a, b) => a.id.localeCompare(b.id));
  if (skills.length === 0) {
    console.log('No skills in global repository. Add skills first using "repo" menu.');
    return;
  }

  // 获取当前已链接的 skills
  const getLinkedSkills = (): Set<string> => {
    const linked = new Set<string>();
    for (const skill of skills) {
      const safeName = configManager.getSafeName(skill.id);
      const linkPath = path.join(projectInfo!.skillDir!, safeName);
      if (fs.existsSync(linkPath)) {
        linked.add(skill.id);
      }
    }
    return linked;
  };

  const linkedSkills = getLinkedSkills();

  console.log('\n=== Link/Unlink Skills ===');
  console.log('Use space to select/unselect, enter to confirm:\n');

  const answer = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selected',
      message: 'Select skills to link:',
      choices: skills.map(skill => ({
        name: skill.id,
        value: skill.id,
        checked: linkedSkills.has(skill.id)
      }))
    }
  ]);

  const selectedSet = new Set<string>(answer.selected);

  // 执行 link/unlink 操作
  for (const skill of skills) {
    const isCurrentlyLinked = linkedSkills.has(skill.id);
    const shouldBeLinked = selectedSet.has(skill.id);

    if (!isCurrentlyLinked && shouldBeLinked) {
      await linkSkillToProject(skill.id, projectInfo);
    } else if (isCurrentlyLinked && !shouldBeLinked) {
      await unlinkSkillFromProject(skill.id, projectInfo);
    }
  }
}

// 向后兼容的函数
export async function linkSkill(skillId: string) {
  const projectDetector = new ProjectDetector();
  const projectInfo = projectDetector.detect();

  if (projectInfo.type === 'unknown' || !projectInfo.skillDir) {
    console.log('No supported AI project detected in current directory.');
    return;
  }

  await linkSkillToProject(skillId, projectInfo);
}

export async function unlinkSkill(skillId: string) {
  const projectDetector = new ProjectDetector();
  const projectInfo = projectDetector.detect();

  if (projectInfo.type === 'unknown' || !projectInfo.skillDir) {
    console.log('No supported AI project detected in current directory.');
    return;
  }

  await unlinkSkillFromProject(skillId, projectInfo);
}
