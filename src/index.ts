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

async function mainMenu() {
  const projectDetector = new ProjectDetector();

  while (true) {
    const projects = projectDetector.detectAll();

    console.log('\n=== Skills Management (skm) ===');
    console.log('1. repo - Manage global skills repository');

    const menuMap: Record<string, any> = {
      '1': { action: 'repo' }
    };

    let currentIndex = 2;
    for (const project of projects) {
      console.log(`${currentIndex}. list(${project.type}) - Manage skills for ${project.type}`);
      menuMap[currentIndex.toString()] = { action: 'list', project };
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
      process.exit(0);
    } else if (action === 'repo') {
      await repoMenu();
    } else if (action === 'list' && project) {
      await manageProjectSkills(project);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--config')) {
    await showConfig();
    return;
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Skills Management CLI (skm)

Usage:
  skm           Enter interactive mode
  skm --config  View configuration
`);
    return;
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
