#!/usr/bin/env node
import fs from 'fs-extra';
import inquirer from 'inquirer';
import { ConfigManager } from './core/config';
import { ProjectDetector, ProjectInfo } from './core/project';
import { repoMenu } from './commands/repo';
import { manageProjectSkills } from './commands/project';

async function showConfig() {
  const configManager = new ConfigManager();

  console.log(`\nConfig Directory: ${configManager.getHomeDir()}`);
  const configFile = `${configManager.getHomeDir()}/config.json`;
  if (fs.existsSync(configFile)) {
    const config = fs.readJsonSync(configFile);
    console.log('Configuration:', JSON.stringify(config, null, 2));
  }
}

/**
 * 生成菜单项描述：目录 + 作用域 + 共用该目录的 agent 别名
 */
function describeProject(project: ProjectInfo): string {
  const aliases = project.aliases ?? [project.type];
  const scope = project.scope ?? 'project';
  const where = project.label ?? project.type;
  const shown = aliases.slice(0, 4).join('/');
  const more = aliases.length > 4 ? ` +${aliases.length - 4}` : '';
  const detail = aliases.length > 1 ? `${shown}${more}` : project.type;

  return `list(${where}) - ${scope} · ${detail}`;
}

async function mainMenu() {
  const packageJson = fs.readJsonSync(`${__dirname}/../package.json`);
  const projectDetector = new ProjectDetector();

  let running = true;
  let showAll = false;

  while (running) {
    const menu = showAll ? projectDetector.detectAllEntries() : projectDetector.detectMenu();

    console.log(`\n=== Skills Management (skm) v${packageJson.version} ===`);
    if (menu.filtered) {
      const where =
        menu.context.scope === 'global'
          ? `inside ${menu.context.agentId}'s config directory`
          : 'inside this project';
      console.log(`(showing ${where} only)`);
    }
    console.log('1. repo - Manage global skills repository');

    const menuMap: Record<string, any> = {
      '1': { action: 'repo' }
    };

    let currentIndex = 2;
    for (const project of menu.entries) {
      console.log(`${currentIndex}. ${describeProject(project)}`);
      menuMap[currentIndex.toString()] = { action: 'list', project };
      currentIndex++;
    }

    if (menu.filtered) {
      console.log(`${currentIndex}. list(all) - show every agent and scope`);
      menuMap[currentIndex.toString()] = { action: 'all' };
      currentIndex++;
    }

    console.log('0. Exit');
    menuMap['0'] = { action: 'exit' };

    const answer = await inquirer.prompt([
      {
        type: 'input',
        name: 'choice',
        message: 'Select an option (enter number):',
        validate: (input) => menuMap[input] ? true : 'Invalid option'
      }
    ]);

    const { action, project } = menuMap[answer.choice];

    if (action === 'exit') {
      running = false;
    } else if (action === 'all') {
      showAll = true;
    } else if (action === 'repo') {
      await repoMenu();
    } else if (action === 'list' && project) {
      await manageProjectSkills(project);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length > 0) {
    if (args.includes('--version') || args.includes('-v')) {
      const packageJson = fs.readJsonSync(`${__dirname}/../package.json`);
      console.log(`skm version ${packageJson.version}`);
      return;
    }
    if (args.includes('--config')) {
      await showConfig();
      return;
    }
    // 不支持的参数
    console.error(`Error: Unknown argument(s): ${args.join(' ')}`);
    console.error('Usage: skm [--config] [--version|-v]');
    process.exit(1);
  }

  await mainMenu();
}

main().catch((error) => {
  // 优雅处理用户中断 (Ctrl+C)
  if (error.name === 'ExitPromptError' || error.message?.includes('force closed')) {
    console.log('\nHave a nice Day!');
    process.exit(0);
  }
  console.error(error);
  process.exit(1);
});
