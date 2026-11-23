import { Router } from 'express';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import {
  getDashboardStatistics,
  getPeriodStatistics,
  getStudentStatistics,
} from '../services/statisticsService.js';
import { getMonthRange, getWeekRange, parseDateOnly } from '../utils/dateRange.js';

export const statisticsRouter = Router();

statisticsRouter.get(
  '/dashboard',
  asyncHandler(async (_req, res) => {
    const data = await getDashboardStatistics();
    res.json(data);
  }),
);

statisticsRouter.get(
  '/students/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, 'Некорректный ID студента');
    }
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;

    const data = await getStudentStatistics(id, from, to);
    res.json(data);
  }),
);

statisticsRouter.get(
  '/weekly',
  asyncHandler(async (req, res) => {
    const refStr = typeof req.query.date === 'string' ? req.query.date : undefined;
    const refDate = refStr ? parseDateOnly(refStr) : new Date();
    const range = getWeekRange(refDate);
    const data = await getPeriodStatistics(range);
    res.json(data);
  }),
);

statisticsRouter.get(
  '/monthly',
  asyncHandler(async (req, res) => {
    const refStr = typeof req.query.date === 'string' ? req.query.date : undefined;
    const refDate = refStr ? parseDateOnly(refStr) : new Date();
    const range = getMonthRange(refDate);
    const data = await getPeriodStatistics(range);
    res.json(data);
  }),
);
