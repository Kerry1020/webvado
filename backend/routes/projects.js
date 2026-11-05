import express from 'express';

const router = express.Router();
const pm = req => req.app.locals.projectManager;

/**
 * GET /api/projects
 * List all projects
 */
router.get('/', async (req, res, next) => {
  try {
    const projects = await pm(req).listProjects();
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
    const { name, part, language } = req.body || {};

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        error: 'Missing required field: name'
      });
    }

    const project = await pm(req).createProject({ name, part, language });
    
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
    const project = await pm(req).getProject(id);

    if (!project) {
      return res.status(404).json({
        error: `Project "${id}" not found`
      });
    }

    const files = await pm(req).getProjectFiles(id);

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
 * Update project settings. Only top_module, part and settings are writable.
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = {};
    const { top_module, part, settings } = req.body || {};

    if (top_module !== undefined) {
      if (top_module !== '' && !/^[A-Za-z_][\w$]{0,127}$/.test(top_module)) {
        return res.status(400).json({ error: 'top_module must be a Verilog identifier' });
      }
      updates.top_module = top_module;
    }
    if (part !== undefined) {
      if (!/^[\w-]{1,40}$/.test(part)) return res.status(400).json({ error: 'Invalid part' });
      updates.part = part;
    }
    if (settings !== undefined) {
      if (typeof settings !== 'object' || settings === null || Array.isArray(settings)) {
        return res.status(400).json({ error: 'settings must be an object' });
      }
      updates.settings = settings;
    }

    const updated = await pm(req).updateProject(id, updates);
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
    const result = await pm(req).deleteProject(id);
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
    const files = await pm(req).getProjectFiles(id);
    res.json(files);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

export default router;
