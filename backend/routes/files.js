import express from 'express';
import { FileManager } from '../services/FileManager.js';

const router = express.Router();
const fileManager = new FileManager();
const pm = req => req.app.locals.projectManager;

/**
 * GET /api/files/:projectId/*
 * Read file content
 */
router.get('/:projectId/*', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const filePath = req.params[0]; // Wildcard captures the rest of the path

    const project = await pm(req).getProject(projectId);
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
    const { content } = req.body || {};

    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'content must be a string' });
    }

    const project = await pm(req).getProject(projectId);
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
    const { content } = req.body || {};

    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'content must be a string' });
    }

    const project = await pm(req).getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: `Project "${projectId}" not found` });
    }

    await fileManager.readFile(project.path, filePath);
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

    const project = await pm(req).getProject(projectId);
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
