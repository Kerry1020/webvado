import express from 'express';
import { ProjectManager } from '../services/ProjectManager.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Initialize ProjectManager
const projectsDir = path.join(__dirname, '../../projects');
const projectManager = new ProjectManager(projectsDir);

/**
 * GET /api/projects
 * List all projects
 */
router.get('/', async (req, res, next) => {
  try {
    const projects = await projectManager.listProjects();
    res.json({ projects });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects
 * Create a new project
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, part, language } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Missing required field: name'
      });
    }

    const project = await projectManager.createProject({ name, part, language });
    
    res.status(201).json(project);
  } catch (error) {
    if (error.message.includes('already exists') || error.message.includes('Invalid project name')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * GET /api/projects/:id
 * Get project details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await projectManager.getProject(id);

    if (!project) {
      return res.status(404).json({
        error: `Project "${id}" not found`
      });
    }

    // Get file structure
    const files = await projectManager.getProjectFiles(id);

    res.json({
      ...project,
      files
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/projects/:id
 * Update project metadata
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Don't allow updating certain fields
    delete updates.id;
    delete updates.created_at;
    delete updates.path;

    const updated = await projectManager.updateProject(id, updates);
    res.json(updated);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * DELETE /api/projects/:id
 * Delete a project
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await projectManager.deleteProject(id);
    res.json(result);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * GET /api/projects/:id/files
 * Get project file structure
 */
router.get('/:id/files', async (req, res, next) => {
  try {
    const { id } = req.params;
    const files = await projectManager.getProjectFiles(id);
    res.json(files);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

export default router;
