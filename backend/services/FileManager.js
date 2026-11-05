import fs from 'fs-extra';
import path from 'path';
import pino from 'pino';

const logger = pino({ name: 'FileManager' });

/**
 * FileManager - Handles file system operations for projects
 */
export class FileManager {
  constructor(projectsDir) {
    this.projectsDir = projectsDir;
  }

  /**
   * Validate and resolve file path
   * Prevents path traversal attacks
   */
  validatePath(projectPath, filePath, { allowRoot = false } = {}) {
    if (typeof filePath !== 'string' || filePath.includes('\0') || path.isAbsolute(filePath)) {
      throw new Error('Invalid file path: path traversal detected');
    }
    const root = path.resolve(projectPath);
    const resolved = path.resolve(root, filePath);
    
    // path.relative catches both ../ escapes and sibling dirs sharing a prefix
    const rel = path.relative(root, resolved);
    if ((!rel && !allowRoot) || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
      throw new Error('Invalid file path: path traversal detected');
    }
    // Project metadata and build outputs are not editable through the file API
    if (rel.split(path.sep)[0].toLowerCase() === '.webvado') {
      throw new Error('Invalid file path: path traversal detected');
    }

    // Reject symlink components, including dangling links and aliases to metadata.
    let current = root;
    for (const component of rel.split(path.sep).filter(Boolean)) {
      current = path.join(current, component);
      try {
        if (fs.lstatSync(current).isSymbolicLink()) {
          throw new Error('Invalid file path: path traversal detected');
        }
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }

    return resolved;
  }

  /**
   * Read file content
   */
  async readFile(projectPath, filePath) {
    const fullPath = this.validatePath(projectPath, filePath);

    if (!await fs.pathExists(fullPath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stats = await fs.stat(fullPath);
    
    if (!stats.isFile()) {
      throw new Error(`Not a file: ${filePath}`);
    }

    const content = await fs.readFile(fullPath, 'utf8');

    logger.debug({ filePath }, 'File read');

    return {
      path: filePath,
      content,
      size: stats.size,
      modified_at: stats.mtime.toISOString()
    };
  }

  /**
   * Write file content
   */
  async writeFile(projectPath, filePath, content) {
    const fullPath = this.validatePath(projectPath, filePath);
    const dir = path.dirname(fullPath);

    // Ensure directory exists
    await fs.ensureDir(dir);

    await fs.writeFile(fullPath, content, 'utf8');

    const stats = await fs.stat(fullPath);

    logger.info({ filePath, size: stats.size }, 'File written');

    return {
      path: filePath,
      size: stats.size,
      modified_at: stats.mtime.toISOString()
    };
  }

  /**
   * Create new file
   */
  async createFile(projectPath, filePath, content = '') {
    const fullPath = this.validatePath(projectPath, filePath);

    if (await fs.pathExists(fullPath)) {
      throw new Error(`File already exists: ${filePath}`);
    }

    return await this.writeFile(projectPath, filePath, content);
  }

  /**
   * Delete file
   */
  async deleteFile(projectPath, filePath) {
    const fullPath = this.validatePath(projectPath, filePath);

    if (!await fs.pathExists(fullPath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    await fs.remove(fullPath);

    logger.info({ filePath }, 'File deleted');

    return { success: true, path: filePath };
  }

  /**
   * Rename/move file
   */
  async renameFile(projectPath, oldPath, newPath) {
    const fullOldPath = this.validatePath(projectPath, oldPath);
    const fullNewPath = this.validatePath(projectPath, newPath);

    if (!await fs.pathExists(fullOldPath)) {
      throw new Error(`File not found: ${oldPath}`);
    }

    if (await fs.pathExists(fullNewPath)) {
      throw new Error(`Destination already exists: ${newPath}`);
    }

    const newDir = path.dirname(fullNewPath);
    await fs.ensureDir(newDir);

    await fs.rename(fullOldPath, fullNewPath);

    logger.info({ oldPath, newPath }, 'File renamed');

    return { success: true, old_path: oldPath, new_path: newPath };
  }

  /**
   * Create directory
   */
  async createDirectory(projectPath, dirPath) {
    const fullPath = this.validatePath(projectPath, dirPath);

    if (await fs.pathExists(fullPath)) {
      throw new Error(`Directory already exists: ${dirPath}`);
    }

    await fs.ensureDir(fullPath);

    logger.info({ dirPath }, 'Directory created');

    return { success: true, path: dirPath };
  }

  /**
   * List directory contents
   */
  async listDirectory(projectPath, dirPath = '') {
    const fullPath = this.validatePath(projectPath, dirPath, { allowRoot: true });

    if (!await fs.pathExists(fullPath)) {
      throw new Error(`Directory not found: ${dirPath}`);
    }

    const stats = await fs.stat(fullPath);
    
    if (!stats.isDirectory()) {
      throw new Error(`Not a directory: ${dirPath}`);
    }

    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const items = [];

    for (const entry of entries) {
      if (entry.isSymbolicLink() || entry.name.toLowerCase() === '.webvado') continue;
      const itemPath = path.join(dirPath, entry.name);
      const fullItemPath = path.join(fullPath, entry.name);
      const itemStats = await fs.stat(fullItemPath);

      items.push({
        name: entry.name,
        path: itemPath,
        type: entry.isDirectory() ? 'directory' : 'file',
        size: entry.isFile() ? itemStats.size : undefined,
        modified_at: itemStats.mtime.toISOString()
      });
    }

    return items;
  }

  /**
   * Get file information
   */
  async getFileInfo(projectPath, filePath) {
    const fullPath = this.validatePath(projectPath, filePath);

    if (!await fs.pathExists(fullPath)) {
      throw new Error(`Path not found: ${filePath}`);
    }

    const stats = await fs.stat(fullPath);

    return {
      path: filePath,
      type: stats.isDirectory() ? 'directory' : 'file',
      size: stats.size,
      created_at: stats.birthtime.toISOString(),
      modified_at: stats.mtime.toISOString(),
      accessed_at: stats.atime.toISOString()
    };
  }
}
