import express from 'express';
import path from 'path';

const router = express.Router();

/**
 * POST /api/build/:projectId/compile - Compile Verilog sources
 */
router.post('/:projectId/compile', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { topModule } = req.body;

    const buildService = req.app.locals.buildService;
    if (!buildService) {
      return res.status(500).json({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Build service not initialized'
        }
      });
    }

    // Validate projectId to prevent path traversal
    if (!projectId || typeof projectId !== 'string' || projectId.includes('..') || projectId.includes('/')) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PROJECT_ID',
          message: 'Invalid project identifier'
        }
      });
    }

    const result = await buildService.compile(projectId, { topModule });

    if (result.success) {
      res.json({
        success: true,
        message: 'Compilation successful',
        diagnostics: result.diagnostics,
        outputFile: result.outputFile
      });
    } else {
      res.status(422).json({
        success: false,
        message: 'Compilation failed',
        diagnostics: result.diagnostics,
        exitCode: result.exitCode
      });
    }
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: error.message
        }
      });
    }

    if (error.message.includes('not installed')) {
      return res.status(424).json({
        error: {
          code: 'TOOL_MISSING',
          message: error.message
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'COMPILATION_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * POST /api/build/:projectId/simulate - Run simulation and generate VCD
 */
router.post('/:projectId/simulate', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { topModule, runTime } = req.body;

    const buildService = req.app.locals.buildService;
    if (!buildService) {
      return res.status(500).json({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Build service not initialized'
        }
      });
    }

    // Validate projectId
    if (!projectId || typeof projectId !== 'string' || projectId.includes('..') || projectId.includes('/')) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PROJECT_ID',
          message: 'Invalid project identifier'
        }
      });
    }

    // Validate runTime if provided
    if (runTime !== undefined) {
      const parsedRunTime = parseInt(runTime, 10);
      if (isNaN(parsedRunTime) || parsedRunTime <= 0 || parsedRunTime > 1e9) {
        return res.status(400).json({
          error: {
            code: 'INVALID_RUN_TIME',
            message: 'Run time must be a positive integer (max 1e9 ns)'
          }
        });
      }
    }

    const result = await buildService.simulate(projectId, { 
      topModule, 
      runTime: runTime ? parseInt(runTime, 10) : undefined 
    });

    res.json({
      success: true,
      message: 'Simulation successful',
      waveformData: result.waveformData,
      vcdFile: result.vcdFile
    });

  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: error.message
        }
      });
    }

    if (error.message.includes('not compiled')) {
      return res.status(400).json({
        error: {
          code: 'NOT_COMPILED',
          message: error.message
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'SIMULATION_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * GET /api/build/:projectId/status - Get current build status
 */
router.get('/:projectId/status', async (req, res) => {
  try {
    const { projectId } = req.params;

    const buildService = req.app.locals.buildService;
    if (!buildService) {
      return res.status(500).json({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Build service not initialized'
        }
      });
    }

    // Validate projectId
    if (!projectId || typeof projectId !== 'string' || projectId.includes('..') || projectId.includes('/')) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PROJECT_ID',
          message: 'Invalid project identifier'
        }
      });
    }

    const status = await buildService.getBuildStatus(projectId);

    res.json(status);

  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: error.message
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'STATUS_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * GET /api/build/:projectId/reports - List build reports and artifacts
 */
router.get('/:projectId/reports', async (req, res) => {
  try {
    const { projectId } = req.params;

    const projectManager = req.app.locals.projectManager;
    if (!projectManager) {
      return res.status(500).json({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Project manager not initialized'
        }
      });
    }

    // Validate projectId
    if (!projectId || typeof projectId !== 'string' || projectId.includes('..') || projectId.includes('/')) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PROJECT_ID',
          message: 'Invalid project identifier'
        }
      });
    }

    const project = await projectManager.getProject(projectId);
    if (!project) {
      return res.status(404).json({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: `Project "${projectId}" not found`
        }
      });
    }

    const buildDir = path.join(project.path, '.webvado', 'build');
    
    // Check if build directory exists
    const fs = await import('fs-extra');
    if (!await fs.pathExists(buildDir)) {
      return res.json({
        reports: [],
        artifacts: []
      });
    }

    // List files in build directory
    const files = await fs.readdir(buildDir);
    const stats = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(buildDir, file);
        const stat = await fs.stat(filePath);
        return {
          name: file,
          path: path.relative(project.path, filePath),
          size: stat.size,
          modified: stat.mtime.toISOString(),
          type: path.extname(file).substring(1) || 'file'
        };
      })
    );

    // Categorize files
    const reports = stats.filter(f => f.type === 'txt' || f.type === 'log' || f.type === 'rpt');
    const artifacts = stats.filter(f => f.type === 'vvp' || f.type === 'vcd' || f.type === 'bin');

    res.json({
      reports,
      artifacts,
      all: stats
    });

  } catch (error) {
    res.status(500).json({
      error: {
        code: 'LIST_ERROR',
        message: error.message
      }
    });
  }
});

export default router;
