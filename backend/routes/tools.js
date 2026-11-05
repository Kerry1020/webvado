import express from 'express';

const router = express.Router();

/**
 * GET /api/tools - Get all available tools status
 */
router.get('/', async (req, res) => {
  try {
    const toolchainManager = req.app.locals.toolchainManager;
    if (!toolchainManager) {
      return res.status(500).json({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Toolchain manager not initialized'
        }
      });
    }

    const tools = await toolchainManager.detect();

    res.json({
      tools,
      summary: {
        total: Object.keys(tools).length,
        available: Object.values(tools).filter(t => t.found).length,
        missing: Object.values(tools).filter(t => !t.found).length
      }
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'DETECTION_FAILED',
        message: error.message
      }
    });
  }
});

/**
 * GET /api/tools/:name - Get specific tool status
 */
router.get('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const toolchainManager = req.app.locals.toolchainManager;

    if (!toolchainManager) {
      return res.status(500).json({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Toolchain manager not initialized'
        }
      });
    }

    const tool = await toolchainManager.getTool(name);

    if (!tool) {
      return res.status(404).json({
        error: {
          code: 'TOOL_NOT_FOUND',
          message: `Tool "${name}" is not recognized`
        }
      });
    }

    res.json({
      name,
      ...tool
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'DETECTION_FAILED',
        message: error.message
      }
    });
  }
});

/**
 * POST /api/tools/refresh - Clear cache and re-detect tools
 */
router.post('/refresh', async (req, res) => {
  try {
    const toolchainManager = req.app.locals.toolchainManager;

    if (!toolchainManager) {
      return res.status(500).json({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Toolchain manager not initialized'
        }
      });
    }

    toolchainManager.clearCache();
    const tools = await toolchainManager.detect();

    res.json({
      message: 'Tools re-detected successfully',
      tools,
      summary: {
        total: Object.keys(tools).length,
        available: Object.values(tools).filter(t => t.found).length,
        missing: Object.values(tools).filter(t => !t.found).length
      }
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'REFRESH_FAILED',
        message: error.message
      }
    });
  }
});

export default router;
