import express from 'express';

const router = express.Router();
const codes = {
  INVALID_INPUT: 400, NO_BITSTREAM: 409, INVALID_ARTIFACT: 400,
  PROJECT_NOT_FOUND: 404, HARDWARE_BUSY: 409, TOOL_MISSING: 424,
  HARDWARE_FAILED: 422, PROGRAM_FAILED: 422, PREREQUISITE_MISSING: 409, BUILD_BUSY: 409
};
const route = fn => async (req, res) => {
  try {
    res.json(await fn(req.app.locals.hardwareService, req));
  } catch (error) {
    res.status(codes[error.code] || 500).json({
      success: false, error: { code: error.code || 'HARDWARE_ERROR', message: error.message }, log: error.log || ''
    });
  }
};
router.get('/', route(service => service.listBoards()));
router.post('/detect', route((service, req) => service.detect(req.body)));
router.post('/:projectId/program', route((service, req) => service.program(req.params.projectId, req.body)));
export default router;
