import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectDetector } from '../../src/core/project';
import fs from 'fs-extra';
import path from 'path';

vi.mock('fs-extra');

describe('ProjectDetector', () => {
  const mockCwd = '/mock/cwd';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should detect opencode project', () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      return p === path.join(mockCwd, '.opencode');
    });

    const detector = new ProjectDetector(mockCwd);
    const info = detector.detect();

    expect(info).toEqual({
      type: 'opencode',
      root: mockCwd,
      skillDir: path.join(mockCwd, '.opencode', 'skills')
    });
  });

  it('should detect cursor project', () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      return p === path.join(mockCwd, '.cursor');
    });

    const detector = new ProjectDetector(mockCwd);
    const info = detector.detect();

    expect(info).toEqual({
      type: 'cursor',
      root: mockCwd,
      skillDir: path.join(mockCwd, '.cursor', 'skills')
    });
  });

  it('should detect gemini project', () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      return p === path.join(mockCwd, '.gemini');
    });

    const detector = new ProjectDetector(mockCwd);
    const info = detector.detect();

    expect(info).toEqual({
      type: 'gemini',
      root: mockCwd,
      skillDir: path.join(mockCwd, '.gemini', 'skills')
    });
  });

  it('should detect antigravity project', () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      return p === path.join(mockCwd, '.antigravity');
    });

    const detector = new ProjectDetector(mockCwd);
    const info = detector.detect();

    expect(info).toEqual({
      type: 'antigravity',
      root: mockCwd,
      skillDir: path.join(mockCwd, '.antigravity', 'skills')
    });
  });

  it('should return unknown if no marker found', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const detector = new ProjectDetector(mockCwd);
    const info = detector.detect();

    expect(info).toEqual({
      type: 'unknown',
      root: mockCwd
    });
  });

  it('should detect multiple projects with detectAll', () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      return p === path.join(mockCwd, '.opencode') || p === path.join(mockCwd, '.gemini');
    });

    const detector = new ProjectDetector(mockCwd);
    const projects = detector.detectAll();

    expect(projects).toHaveLength(2);
    expect(projects[0].type).toBe('opencode');
    expect(projects[1].type).toBe('gemini');
  });

  it('should return empty array from detectAll if no projects', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const detector = new ProjectDetector(mockCwd);
    const projects = detector.detectAll();

    expect(projects).toEqual([]);
  });
});
