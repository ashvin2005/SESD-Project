'use strict';
const dashboardService = require('./dashboard.service');
const { successResponse } = require('../../shared/utils/response');

async function getDashboard(req, res, next) {
  try {
    const data = await dashboardService.buildDashboard(req.user.id);
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.json(successResponse(data));
  } catch (err) { next(err); }
}

module.exports = { getDashboard };
