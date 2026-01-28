import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { ConfigManager } from '../core/config';
import { SkillRegistry, Skill } from '../core/skills';
import { GitManager } from '../core/git';

interface UpdateInfo {
  skill: Skill;
  url: string;
  remoteHead: string;
  branch: string;
}

/**
 * 检查 skill 更新（不提示用户选择）
 * 使用本地 git 获取当前版本，使用远程 API 获取最新版本
 */
export async function checkSkillUpdates(): Promise<UpdateInfo[]> {
  const configManager = new ConfigManager();
  const skillRegistry = new SkillRegistry(configManager);
  const gitManager = new GitManager();

  const skills = skillRegistry.getAllSkills();
  const updates: UpdateInfo[] = [];

  for (const skill of skills) {
    if (skill.type !== 'github') continue;

    try {
      const parts = skill.id.split(':');
      if (parts.length < 2) continue;

      const repoPath = parts[1];

      let userRepo = repoPath;
      if (skill.path) {
        if (repoPath.endsWith(skill.path)) {
          userRepo = repoPath.substring(0, repoPath.length - skill.path.length - 1);
        }
      }

      const url = `https://github.com/${userRepo}.git`;
      const localRepoDir = configManager.getRepoPath(skill.id);

      // 获取本地当前版本（从 git log）
      let localCommit: string;
      if (skill.path) {
        localCommit = await gitManager.getLocalPathCommitId(localRepoDir, skill.path);
      } else {
        localCommit = await gitManager.getLocalPathCommitId(localRepoDir, '.');
      }

      // 先执行 git fetch 获取远程更新
      try {
        await gitManager.fetch(localRepoDir);
      } catch {
        // 如果 fetch 失败，跳过此 skill 的更新检查
        continue;
      }

      // 获取远程最新版本
      const branch = await gitManager.getDefaultBranch(userRepo);
      let remoteHead: string;
      try {
        if (skill.path) {
          remoteHead = await gitManager.getRemotePathCommitId(localRepoDir, `origin/${branch}`, skill.path);
        } else {
          remoteHead = await gitManager.getRemotePathCommitId(localRepoDir, `origin/${branch}`, '.');
        }
      } catch {
        continue;
      }

      if (remoteHead && remoteHead !== localCommit) {
        updates.push({
          skill,
          url,
          remoteHead,
          branch
        });
      }
    } catch (error: any) {
      console.error(`Failed to check update for ${skill.id}: ${error.message}`);
    }
  }

  return updates;
}

/**
 * 仓库管理交互式菜单
 */
export async function repoMenu() {
  const configManager = new ConfigManager();
  const skillRegistry = new SkillRegistry(configManager);

  while (true) {
    const skills = skillRegistry.getAllSkills().sort((a, b) => a.id.localeCompare(b.id));

    // 显示菜单（不再在此处检查更新）
    console.log('\n=== Repository Management ===');
    console.log('a. Add skill');
    console.log('---');

    const menuMap: Record<string, any> = {
      'a': { action: 'add' },
      '0': { action: 'back' }
    };

    if (skills.length === 0) {
      console.log('(No skills in repository)');
    } else {
      skills.forEach((s, index) => {
        const num = (index + 1).toString();
        if (s.type === 'local') {
          console.log(`${num}. ${s.id}`);
        } else {
          console.log(`${num}. ${s.id}:${s.commitId?.substring(0, 7) || 'N/A'}`);
        }
        menuMap[num] = { action: 'manage', skill: s };
      });
    }

    console.log('---');
    console.log('0. Back to main menu');

    const answer = await inquirer.prompt([
      {
        type: 'input',
        name: 'choice',
        message: 'Select an option:',
        validate: (input) => menuMap[input.toLowerCase()] ? true : 'Invalid option'
      }
    ]);

    const choice = menuMap[answer.choice.toLowerCase()];
    const { action, skill } = choice;

    if (action === 'back') {
      break;
    } else if (action === 'add') {
      await addSkillInteractive();
    } else if (action === 'manage' && skill) {
      await manageSkill(skill);
    }
  }
}

/**
 * 检查单个 skill 的更新
 */
async function checkSingleSkillUpdate(skill: Skill): Promise<UpdateInfo | null> {
  const configManager = new ConfigManager();
  const gitManager = new GitManager();

  if (skill.type !== 'github') return null;

  try {
    const parts = skill.id.split(':');
    if (parts.length < 2) return null;

    const repoPath = parts[1];

    let userRepo = repoPath;
    if (skill.path) {
      if (repoPath.endsWith(skill.path)) {
        userRepo = repoPath.substring(0, repoPath.length - skill.path.length - 1);
      }
    }

    const url = `https://github.com/${userRepo}.git`;
    const localRepoDir = configManager.getRepoPath(skill.id);

    // 获取本地当前版本
    let localCommit: string;
    if (skill.path) {
      localCommit = await gitManager.getLocalPathCommitId(localRepoDir, skill.path);
    } else {
      localCommit = await gitManager.getLocalPathCommitId(localRepoDir, '.');
    }

    // git fetch
    console.log('Checking for updates...');
    await gitManager.fetch(localRepoDir);

    // 获取远程最新版本
    const branch = await gitManager.getDefaultBranch(userRepo);
    let remoteHead: string;
    if (skill.path) {
      remoteHead = await gitManager.getRemotePathCommitId(localRepoDir, `origin/${branch}`, skill.path);
    } else {
      remoteHead = await gitManager.getRemotePathCommitId(localRepoDir, `origin/${branch}`, '.');
    }

    if (remoteHead && remoteHead !== localCommit) {
      return { skill, url, remoteHead, branch };
    }
  } catch (error: any) {
    console.error(`Failed to check update: ${error.message}`);
  }

  return null;
}

/**
 * 管理单个 skill（更新/删除）
 */
async function manageSkill(skill: Skill) {
  console.log(`\n=== Manage: ${skill.id} ===`);

  const menuMap: Record<string, string> = {
    '0': 'back'
  };

  let optionNum = 1;
  let update: UpdateInfo | null = null;

  // 只对 github 类型检查更新
  if (skill.type === 'github') {
    update = await checkSingleSkillUpdate(skill);
    const hasUpdate = update !== null;

    if (hasUpdate && update) {
      console.log(`${optionNum}. Update (${skill.commitId?.substring(0, 7)} -> ${update.remoteHead.substring(0, 7)})`);
      menuMap[optionNum.toString()] = 'update';
      optionNum++;
    } else {
      console.log('(No updates available)');
    }
  } else {
    console.log('(Local skill - updates not supported)');
  }

  console.log(`${optionNum}. Delete`);
  menuMap[optionNum.toString()] = 'delete';

  console.log('0. Back');

  const answer = await inquirer.prompt([
    {
      type: 'input',
      name: 'action',
      message: 'Select an option:',
      validate: (input) => menuMap[input] ? true : 'Invalid option'
    }
  ]);

  const action = menuMap[answer.action];

  if (action === 'update' && update) {
    await updateSingleSkill(skill, update);
  } else if (action === 'delete') {
    await deleteSkill(skill.id);
  }
}

/**
 * 更新单个 skill
 */
async function updateSingleSkill(skill: Skill, update: UpdateInfo) {
  const configManager = new ConfigManager();
  const skillRegistry = new SkillRegistry(configManager);
  const gitManager = new GitManager();

  try {
    console.log(`Updating ${skill.id}...`);
    const destPath = configManager.getRepoPath(skill.id);

    await gitManager.pull(destPath);

    skillRegistry.updateSkillVersion(skill.id, update.remoteHead);
    console.log(`Updated ${skill.id}`);
  } catch (error: any) {
    console.error(`Failed to update ${skill.id}: ${error.message}`);
  }
}

export async function addSkillInteractive(url?: string) {
  // 如果传入了 URL，直接使用 GitHub 流程
  if (url) {
    await addGitHubSkillInteractive(url);
    return;
  }

  // 显示类型选择菜单
  console.log('\\n=== Select Skill Type ===');
  console.log('1. GitHub Repository');
  console.log('2. Local Directory');
  console.log('0. Return');

  const typeAnswer = await inquirer.prompt([
    {
      type: 'input',
      name: 'type',
      message: 'Select option:',
      validate: (input) => ['0', '1', '2'].includes(input) || 'Please enter 0, 1 or 2'
    }
  ]);

  if (typeAnswer.type === '0') {
    return;
  } else if (typeAnswer.type === '2') {
    await addLocalSkillInteractive();
  } else {
    await addGitHubSkillInteractive();
  }
}

/**
 * 添加本地技能
 */
async function addLocalSkillInteractive() {
  const configManager = new ConfigManager();
  const skillRegistry = new SkillRegistry(configManager);

  console.log('(Enter empty to return)');
  const answer = await inquirer.prompt([
    {
      type: 'input',
      name: 'path',
      message: 'Enter local skill path:'
    }
  ]);

  if (!answer.path || answer.path.trim() === '') {
    return;
  }

  // 展开 ~ 到用户主目录
  let inputPath = answer.path.trim();
  if (inputPath.startsWith('~/')) {
    inputPath = path.join(os.homedir(), inputPath.slice(2));
  } else if (inputPath === '~') {
    inputPath = os.homedir();
  }

  const localPath = path.resolve(inputPath);

  // 检查路径是否存在
  if (!fs.existsSync(localPath)) {
    console.error('Error: Path does not exist.');
    return;
  }

  // 检查是否是目录
  if (!fs.statSync(localPath).isDirectory()) {
    console.error('Error: Path is not a directory.');
    return;
  }

  // 检查 SKILL.md 是否存在
  const skillMdPath = path.join(localPath, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) {
    console.error('Error: SKILL.md not found in the specified directory.');
    return;
  }

  // 提取 skill 名称（目录名）
  const skillName = path.basename(localPath);
  const id = `local:${skillName}`;

  // 检查是否已存在
  const existingSkill = skillRegistry.getSkill(id);
  if (existingSkill) {
    const confirm = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `Skill ${id} already exists. Overwrite?`,
        default: false
      }
    ]);
    if (!confirm.overwrite) {
      console.log('Operation cancelled.');
      return;
    }
    await fs.remove(configManager.getRepoPath(id));
  }

  const destPath = configManager.getRepoPath(id);

  // 复制目录（包括子目录）
  console.log(`Copying ${skillName} to repository...`);
  await fs.copy(localPath, destPath);

  skillRegistry.addSkill(id, 'local');
  console.log(`Skill ${id} added successfully.`);

  // 询问如何处理原始目录
  console.log('\\nHow to handle the original directory?');
  console.log('1. Keep (do nothing)');
  console.log('2. Link (replace with symlink to repo)');
  console.log('3. Delete');

  const handleAnswer = await inquirer.prompt([
    {
      type: 'input',
      name: 'action',
      message: 'Select option:',
      validate: (input) => ['1', '2', '3'].includes(input) || 'Please enter 1, 2 or 3'
    }
  ]);

  if (handleAnswer.action === '3') {
    await fs.remove(localPath);
    console.log('Original directory deleted.');
  } else if (handleAnswer.action === '2') {
    await fs.remove(localPath);
    const symlinkType = os.platform() === 'win32' ? 'junction' : 'dir';
    await fs.ensureSymlink(destPath, localPath, symlinkType);
    console.log('Original directory replaced with symlink.');
  }
}

/**
 * 添加 GitHub 技能
 */
async function addGitHubSkillInteractive(url?: string) {
  const configManager = new ConfigManager();
  const skillRegistry = new SkillRegistry(configManager);
  const gitManager = new GitManager();

  let repoUrl = url;

  if (!repoUrl) {
    console.log('(Enter empty to return)');
    const answer = await inquirer.prompt([
      {
        type: 'input',
        name: 'url',
        message: 'Enter GitHub URL:'
      }
    ]);
    repoUrl = answer.url;
  }

  if (!repoUrl || repoUrl.trim() === '') return;

  try {
    await gitManager.checkGitVersion();

    const gitInfo = gitManager.normalizeUrl(repoUrl);

    const match = gitInfo.url.match(/github\.com\/([^\/]+\/[^\/]+)(\.git)?$/);
    if (!match) {
      throw new Error('Only GitHub URLs are supported for now.');
    }
    const userRepo = match[1].replace(/\.git$/, '');

    // 获取默认分支（如果 URL 中没有指定）
    const branch = gitInfo.branch || await gitManager.getDefaultBranch(userRepo);

    // 先检查远程 SKILL.md 是否存在
    console.log('Checking for SKILL.md...');
    const hasSkillMd = await gitManager.checkRemoteSkillMd(userRepo, branch, gitInfo.path);
    if (!hasSkillMd) {
      console.error('Error: SKILL.md not found at the specified path.');
      console.error(`Expected location: https://github.com/${userRepo}/blob/${branch}/${gitInfo.path ? gitInfo.path + '/' : ''}SKILL.md`);
      return;
    }

    let id = `github:${userRepo}`;
    if (gitInfo.path) {
      id += `/${gitInfo.path}`;
    }

    const existingSkill = skillRegistry.getSkill(id);
    if (existingSkill) {
      const confirm = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: `Skill ${id} already exists. Overwrite?`,
          default: false
        }
      ]);
      if (!confirm.overwrite) {
        console.log('Operation cancelled.');
        return;
      }
      await fs.remove(configManager.getRepoPath(id));
    }

    const destPath = configManager.getRepoPath(id);
    fs.ensureDirSync(path.dirname(destPath));

    console.log(`Cloning ${id}...`);

    if (gitInfo.path) {
      await gitManager.cloneSparse(gitInfo.url, destPath, gitInfo.path, branch);
    } else {
      await gitManager.cloneFull(gitInfo.url, destPath);
    }

    // 获取 commit id：从本地克隆的仓库获取，避免 API 限流
    let commitId: string;
    if (gitInfo.path) {
      commitId = await gitManager.getLocalPathCommitId(destPath, gitInfo.path);
    } else {
      commitId = await gitManager.getLocalPathCommitId(destPath, '.');
    }

    skillRegistry.addSkill(id, 'github', commitId, gitInfo.path);
    console.log(`Skill ${id} added successfully.`);

  } catch (error: any) {
    console.error(`Failed to add skill: ${error.message}`);
  }
}

export async function updateSkills() {
  const configManager = new ConfigManager();
  const skillRegistry = new SkillRegistry(configManager);
  const gitManager = new GitManager();

  const skills = skillRegistry.getAllSkills();
  if (skills.length === 0) {
    console.log('No skills to update.');
    return;
  }

  console.log('Checking for updates...');
  const updates = await checkSkillUpdates();

  if (updates.length === 0) {
    console.log('All skills are up to date.');
    return;
  }

  const answer = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'skillsToUpdate',
      message: 'Select skills to update:',
      choices: updates.map(u => ({
        name: `${u.skill.id} (${u.skill.commitId?.substring(0, 7) || 'N/A'} -> ${u.remoteHead.substring(0, 7)})`,
        value: u
      }))
    }
  ]);

  for (const update of answer.skillsToUpdate) {
    try {
      console.log(`Updating ${update.skill.id}...`);
      const destPath = configManager.getRepoPath(update.skill.id);

      await gitManager.pull(destPath);

      skillRegistry.updateSkillVersion(update.skill.id, update.remoteHead);
      console.log(`Updated ${update.skill.id}`);
    } catch (error: any) {
      console.error(`Failed to update ${update.skill.id}: ${error.message}`);
    }
  }
}

export async function listSkills() {
  const configManager = new ConfigManager();
  const skillRegistry = new SkillRegistry(configManager);
  const skills = skillRegistry.getAllSkills();

  if (skills.length === 0) {
    console.log('No skills found in repository.');
    return;
  }

  console.table(skills.map(s => ({
    ID: s.id,
    Version: s.commitId?.substring(0, 7) || '-',
    Type: s.type,
    Path: s.path || '(root)'
  })));
}

export async function deleteSkill(id?: string) {
  const configManager = new ConfigManager();
  const skillRegistry = new SkillRegistry(configManager);

  let skillId = id;

  if (!skillId) {
    const skills = skillRegistry.getAllSkills();
    if (skills.length === 0) {
      console.log('No skills to delete.');
      return;
    }

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'skillId',
        message: 'Select a skill to delete:',
        choices: skills.map(s => s.id)
      }
    ]);
    skillId = answer.skillId;
  }

  if (!skillId) return;

  const confirm = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'sure',
      message: `Are you sure you want to delete ${skillId}?`,
      default: false
    }
  ]);

  if (confirm.sure) {
    const repoPath = configManager.getRepoPath(skillId);
    await fs.remove(repoPath);
    skillRegistry.removeSkill(skillId);
    console.log(`Skill ${skillId} deleted.`);
  } else {
    console.log('Deletion cancelled.');
  }
}
