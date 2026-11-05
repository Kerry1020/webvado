import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';

const logger = pino({ name: 'ProjectManager' });

/**
 * ProjectManager - Handles project CRUD operations
 */
export class ProjectManager {
  constructor(projectsDir) {
    this.projectsDir = projectsDir;
    this.ensureProjectsDirectory();
  }

  async ensureProjectsDirectory() {
    await fs.ensureDir(this.projectsDir);
  }

  /**
   * Create a new project
   */
  async createProject({ name, part = 'ice40hx8k', language = 'verilog' }) {
    // Validate inputs
    if (!name || typeof name !== 'string') {
      throw new Error('Project name is required');
    }

    if (!/^[a-zA-Z0-9_-]{1,50}$/.test(name)) {
      throw new Error('Invalid project name. Use only letters, numbers, hyphens, and underscores (1-50 chars)');
    }

    const projectId = `proj_${uuidv4().substring(0, 8)}`;
    const projectPath = path.join(this.projectsDir, name);

    // Check if project already exists
    if (await fs.pathExists(projectPath)) {
      throw new Error(`Project "${name}" already exists`);
    }

    // Create project structure
    const structure = {
      '.webvado': {
        'project.json': JSON.stringify({
          id: projectId,
          name,
          part,
          language,
          top_module: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          settings: {
            simulator: 'iverilog',
            synthesis_strategy: 'default',
            target_frequency_mhz: 50
          },
          build_status: {}
        }, null, 2)
      },
      'srcs': {
        'rtl': {},
        'sim': {},
        'constrs': {}
      },
      'README.md': `# ${name}\n\nWebVado FPGA Project\n\n## Description\n\nAdd your project description here.\n`
    };

    await this.createDirectoryStructure(projectPath, structure);

    logger.info({ projectId, name }, 'Project created');

    return {
      id: projectId,
      name,
      part,
      language,
      path: projectPath,
      created_at: new Date().toISOString()
    };
  }

  async createDirectoryStructure(basePath, structure) {
    for (const [key, value] of Object.entries(structure)) {
      const itemPath = path.join(basePath, key);

      if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        // It's a directory
        await fs.ensureDir(itemPath);
        await this.createDirectoryStructure(itemPath, value);
      } else if (typeof value === 'string') {
        // It's a file
        await fs.writeFile(itemPath, value, 'utf8');
      }
    }
  }

  /**
   * List all projects
   */
  async listProjects() {
    const entries = await fs.readdir(this.projectsDir, { withFileTypes: true });
    const projects = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const projectPath = path.join(this.projectsDir, entry.name);
      const metadataPath = path.join(projectPath, '.webvado', 'project.json');

      try {
        if (await fs.pathExists(metadataPath)) {
          const metadata = await fs.readJson(metadataPath);
          projects.push({
            ...metadata,
            path: projectPath
          });
        }
      } catch (error) {
        logger.warn({ projectPath, error }, 'Failed to read project metadata');
      }
    }

    return projects;
  }

  /**
   * Get project by ID or name
   */
  async getProject(idOrName) {
    const projects = await this.listProjects();
    return projects.find(p => p.id === idOrName || p.name === idOrName);
  }

  /**
   * Update project metadata
   */
  async updateProject(idOrName, updates) {
    const project = await this.getProject(idOrName);
    if (!project) {
      throw new Error(`Project "${idOrName}" not found`);
    }

    const metadataPath = path.join(project.path, '.webvado', 'project.json');
    const metadata = await fs.readJson(metadataPath);

    const updated = {
      ...metadata,
      ...updates,
      updated_at: new Date().toISOString()
    };

    await fs.writeJson(metadataPath, updated, { spaces: 2 });

    logger.info({ projectId: project.id, updates }, 'Project updated');

    return updated;
  }

  /**
   * Delete project
   */
  async deleteProject(idOrName) {
    const project = await this.getProject(idOrName);
    if (!project) {
      throw new Error(`Project "${idOrName}" not found`);
    }

    await fs.remove(project.path);

    logger.info({ projectId: project.id, name: project.name }, 'Project deleted');

    return { success: true, id: project.id };
  }

  /**
   * Get project files in hierarchical structure
   */
  async getProjectFiles(idOrName) {
    const project = await this.getProject(idOrName);
    if (!project) {
      throw new Error(`Project "${idOrName}" not found`);
    }

    const srcsPath = path.join(project.path, 'srcs');
    
    const structure = {
      design_sources: await this.readDirectory(path.join(srcsPath, 'rtl')),
      constraints: await this.readDirectory(path.join(srcsPath, 'constrs')),
      simulation_sources: await this.readDirectory(path.join(srcsPath, 'sim')),
      utility_sources: []
    };

    return structure;
  }

  async readDirectory(dirPath) {
    if (!await fs.pathExists(dirPath)) {
      return [];
    }

    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const result = [];

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(this.projectsDir, fullPath);

      if (entry.isDirectory()) {
        result.push({
          type: 'directory',
          name: entry.name,
          path: relativePath,
          children: await this.readDirectory(fullPath)
        });
      } else {
        const stats = await fs.stat(fullPath);
        const ext = path.extname(entry.name).toLowerCase();
        
        result.push({
          type: 'file',
          name: entry.name,
          path: relativePath,
          metadata: {
            size: stats.size,
            modified_at: stats.mtime.toISOString(),
            file_type: this.getFileType(ext)
          }
        });
      }
    }

    return result;
  }

  getFileType(ext) {
    const typeMap = {
      '.v': 'verilog',
      '.vh': 'verilog',
      '.sv': 'systemverilog',
      '.vhd': 'vhdl',
      '.vhdl': 'vhdl',
      '.xdc': 'constraint',
      '.pcf': 'constraint',
      '.sdc': 'constraint'
    };

    return typeMap[ext] || 'other';
  }
}
