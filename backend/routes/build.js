import express from 'express';
import fs from 'fs-extra';

const router = express.Router();

// HTTP status per BuildError code; anything else is a 500
const STATUS = {
  PROJECT_NOT_FOUND: 404,
  TOOL_MISSING: 424,
  CHIPDB_MISSING: 424,
  NO_CONSTRAINTS: 400,
  NO_SOURCES: 400,
  NO_TESTBENCH: 400,
  NO_VCD: 422,
  COMPILE_FAILED: 422,
  SIM_FAILED: 422,
  SIM_TIMEOUT: 422,
  SYNTH_FAILED: 422,
  IMPLEMENT_FAILED: 422,
  BITSTREAM_FAILED: 422,
  PREREQUISITE_MISSING: 409,
  UNSUPPORTED_DEVICE: 422,
  ARTIFACT_NOT_FOUND: 404,
  INVALID_ARTIFACT: 403,
  BUILD_BUSY: 409,
  SOURCE_CHANGED: 409,
  INVALID_PROJECT_ID: 400,
  INVALID_INPUT: 400
};

const MODULE_NAME = /^[A-Za-z_][\w$]{0,127}$/;

function validate(req) {
  const { projectId } = req.params;
  if (!projectId || projectId.includes('..') || projectId.includes('/')) {
    return { code: 'INVALID_PROJECT_ID', message: 'Invalid project identifier' };
  }
  const { topModule, runTime, package: pkg, frequency } = req.body || {};
  if (topModule !== undefined && topModule !== null && topModule !== '' && (typeof topModule !== 'string' || !MODULE_NAME.test(topModule))) {
    return { code: 'INVALID_INPUT', message: 'topModule must be a Verilog identifier' };
  }
  if (pkg !== undefined && (typeof pkg !== 'string' || !/^[A-Za-z][A-Za-z0-9]{1,20}$/.test(pkg))) {
    return { code: 'INVALID_INPUT', message: 'package must be a valid device package name' };
  }
  if (frequency !== undefined && (!['number', 'string'].includes(typeof frequency) || !Number.isFinite(Number(frequency)) || Number(frequency) <= 0 || Number(frequency) > 1000)) {
    return { code: 'INVALID_INPUT', message: 'frequency must be greater than 0 and at most 1000 MHz' };
  }
  if (runTime !== undefined) {
    const n = Number(runTime);
    if (!Number.isInteger(n) || n <= 0 || n > 1e9) {
      return { code: 'INVALID_INPUT', message: 'runTime must be a positive integer (max 1e9 ns)' };
    }
  }
  return null;
}

function sendError(res, error) {
  const status = STATUS[error.code] || 500;
  res.status(status).json({
    success: false,
    error: { code: error.code || 'BUILD_ERROR', message: error.message },
    diagnostics: error.diagnostics || [],
    log: error.log || ''
  });
}

// POST /api/build/:projectId/<step> — runs one build step
function step(name, run) {
  router.post(`/:projectId/${name}`, async (req, res) => {
    const invalid = validate(req);
    if (invalid) return sendError(res, invalid);

    const buildService = req.app.locals.buildService;
    const { topModule, runTime, package: pkg, frequency } = req.body || {};
    try {
      const result = await run(buildService, req.params.projectId, {
        topModule: topModule || undefined,
        runTime: runTime !== undefined ? Number(runTime) : undefined,
        package: pkg,
        frequency: frequency !== undefined ? Number(frequency) : undefined
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  });
}

step('compile', (svc, id, opts) => svc.compile(id, opts));
step('simulate', (svc, id, opts) => svc.simulate(id, opts));
step('synthesize', (svc, id, opts) => svc.synthesize(id, opts));
step('implement', (svc, id, opts) => svc.implement(id, opts));
step('bitstream', (svc, id, opts) => svc.bitstream(id, opts));

router.get('/:projectId/netlist', async (req, res) => {
  try {
    res.json({ success: true, netlist: await req.app.locals.buildService.getNetlist(req.params.projectId) });
  } catch (error) { sendError(res, error); }
});

router.get('/:projectId/artifacts/:name', async (req, res) => {
  try {
    const service = req.app.locals.buildService;
    const file = req.params.name === 'bitstream.bin'
      ? await service.requireFreshBitstream(req.params.projectId)
      : await service.artifactPath(req.params.projectId, req.params.name);
    res.download(file, req.params.name);
  } catch (error) { sendError(res, error); }
});

/**
 * GET /api/build/:projectId/status - Current build status
 */
router.get('/:projectId/status', async (req, res) => {
  const invalid = validate(req);
  if (invalid) return sendError(res, invalid);
  try {
    res.json(await req.app.locals.buildService.getBuildStatus(req.params.projectId));
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * GET /api/build/:projectId/reports - List build artifacts
 */
router.get('/:projectId/reports', async (req, res) => {
  const invalid = validate(req);
  if (invalid) return sendError(res, invalid);
  try {
    const project = await req.app.locals.projectManager.getProject(req.params.projectId);
    if (!project) return sendError(res, { code: 'PROJECT_NOT_FOUND', message: `Project "${req.params.projectId}" not found` });

    const buildDir = await req.app.locals.buildService.buildDirectory(project);
    if (!await fs.pathExists(buildDir)) return res.json({ reports: [], artifacts: [], all: [] });

    const names = (await fs.readdir(buildDir, { withFileTypes: true })).filter(e => e.isFile()).map(e => e.name);
    const all = await req.app.locals.buildService.artifacts(project, names);
    res.json({
      reports: all.filter(f => ['txt', 'log', 'rpt'].includes(f.type) || f.name.startsWith('synth_stat')),
      artifacts: all.filter(f => ['vvp', 'vcd', 'bin', 'json', 'asc'].includes(f.type)),
      all
    });
  } catch (error) {
    sendError(res, error);
  }
});

export default router;
