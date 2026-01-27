# Skills Management CLI (skm)

[简体中文](./README.zh-CN.md) | English

`skm` is a powerful CLI tool designed to manage and synchronize "skills" (prompt libraries, instruction sets, or capability modules) across various AI coding agents and projects. It serves as a central hub to download skills from GitHub and selectively link them into your local AI project configurations.

It supports multiple AI environments including **OpenCode**, **Cursor**, **Gemini**, **Antigravity**, **Claude**, and **GitHub** projects.

---

## 🚀 Features

- **Global Skill Repository**: Centralized management of your AI skills.
- **GitHub Integration**: Add skills directly from GitHub repositories or specific subdirectories (sparse checkout).
- **Version Control**: Check for updates and synchronize changes from remote repositories.
- **Project Detection**: Automatically detects the AI project type in your current directory.
- **Symbolic Linking**: Efficiently links skills to projects without duplication, keeping them in sync.
- **Project Isolation**: Manage different sets of skills for different projects.

## 📦 Installation

This tool can be installed directly from npm:

```bash
npm install -g skills-management
```

Or install from source:

```bash
# Clone the repository
git clone https://github.com/yourusername/skills-management.git
cd skills-management
npm install
npm run build
npm link
```

## 📖 Usage

Run the tool using `skm`:

```bash
skm
```

### 1. Global Repository Management (`repo`)

Select **"1. repo"** from the main menu to manage your global collection of skills.

- **Add Skill**: Enter a GitHub URL to download a skill.
  - Supports full repositories: `https://github.com/user/repo`
  - Supports specific subfolders: `https://github.com/user/repo/tree/main/path/to/skill`
- **Update Skills**: Checks for newer commits on the remote GitHub repository and updates your local copy.
- **Delete Skills**: Remove skills from your global repository.

### 2. Project Skill Management (`list`)

Navigate to your AI project directory and run `skm`. The tool will detect the project type (e.g., `.opencode`, `.cursor`).

Select **"2. list(type)"** to manage skills for the current project.

- **Link/Unlink**: You will see a list of available global skills.
- **Checkbox Interface**: Use `Space` to select or deselect skills, and `Enter` to confirm.
- **Symlinks**: Selected skills are symlinked contents from your global repo into your project's skill directory (e.g., `.opencode/skills/`).

### Supported Project Structures

`skm` automatically detects and installs skills into these directories:

| AI Type | Detected Folder | Skills Installation Path |
|---------|-----------------|--------------------------|
| **OpenCode** | `.opencode` | `.opencode/skills` |
| **Cursor** | `.cursor` | `.cursor/skills` |
| **Gemini** | `.gemini` | `.gemini/skills` |
| **Antigravity** | `.antigravity` | `.antigravity/skills` |
| **Claude** | `.claude` | `.claude/skills` |
| **GitHub** | `.github` | `.github/skills` |

## 📄 License

ISC
