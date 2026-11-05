import express from 'express';
import { ProjectManager } from '../services/ProjectManager.js';
import { FileManager } from '../services/FileManager.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Initialize managers
const projectsDir = path.join(__dirname, '../../projects');
const projectManager = new ProjectManager(projectsDir);
const fileManager = new FileManager(projectsDir);

/**
 * GET /api/files/:projectId/*
 * Read file content
 */
router.get('/:projectId/*', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const filePath = req.params[0]; // Wildcard captures the rest of the path

    const project = await projectManager.getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: `Project "${projectId}" not found` });
    }

    const file = await fileManager.readFile(project.path, filePath);
    res.json(file);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('path traversal')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next(error);
  }
});

/**
 * POST /api/files/:projectId/*
 * Create or update file
 */
router.post('/:projectId/*', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const filePath = req.params[0];
    const { content } = req.body;

    if (content === undefined) {
      return res.status(400).json({ error: 'Missing required field: content' });
    }

    const project = await projectManager.getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: `Project "${projectId}" not found` });
    }

    const file = await fileManager.writeFile(project.path, filePath, content);
    res.status(201).json(file);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('path traversal')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next(error);
  }
});

/**
 * PUT /api/files/:projectId/*
 * Update existing file
 */
router.put('/:projectId/*', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const filePath = req.params[0];
    const { content } = req.body;

    if (content === undefined) {
      return res.status(400).json({ error: 'Missing required field: content' });
    }

    const project = await projectManager.getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: `Project "${projectId}" not found` });
    }

    const file = await fileManager.writeFile(project.path, filePath, content);
    res.json(file);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('path traversal')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next(error);
  }
});

/**
 * DELETE /api/files/:projectId/*
 * Delete file
 */
router.delete('/:projectId/*', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const filePath = req.params[0];

    const project = await projectManager.getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: `Project "${projectId}" not found` });
    }

    const result = await fileManager.deleteFile(project.path, filePath);
    res.json(result);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('path traversal')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next(error);
  }
});

export default router;
