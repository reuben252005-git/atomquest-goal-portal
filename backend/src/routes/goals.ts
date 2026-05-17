// backend/src/routes/goals.ts
import { Router, Request, Response } from 'express';
import { PrismaClient, GoalStatus } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import {
  submitGoalSheet,
  approveGoalSheet,
  returnGoalSheet,
  unlockGoalSheet,
  pushSharedGoal,
  validateGoalSheet
} from '../services/goalService';

const router = Router();
const prisma = new PrismaClient();

// ─── EMPLOYEE: Get my goal sheet ─────────────────────────────────────────

router.get('/my-sheet/:cycleId', async (req: Request, res: Response) => {
  const { cycleId } = req.params;
  const employeeId = req.user!.id;

  let sheet = await prisma.goalSheet.findUnique({
    where: { employeeId_cycleId: { employeeId, cycleId } },
    include: { goals: { include: { checkIns: true } } }
  });

  if (!sheet) {
    sheet = await prisma.goalSheet.create({
      data: { employeeId, cycleId, managerId: req.user!.managerId },
      include: { goals: { include: { checkIns: true } } }
    });
  }

  res.json(sheet);
});

// ─── EMPLOYEE: Add goal to sheet ─────────────────────────────────────────

router.post('/add-goal', [
  body('sheetId').notEmpty(),
  body('thrustArea').notEmpty(),
  body('title').notEmpty(),
  body('uomType').isIn(['MIN_NUMERIC','MAX_NUMERIC','PERCENTAGE','TIMELINE','ZERO_BASED']),
  body('target').isFloat({ min: 0 }),
  body('weightage').isFloat({ min: 10, max: 100 }),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { sheetId, thrustArea, title, description, uomType, target, targetDate, weightage } = req.body;

  const sheet = await prisma.goalSheet.findFirst({
    where: { id: sheetId, employeeId: req.user!.id },
    include: { goals: true }
  });
  if (!sheet) return res.status(404).json({ error: 'Sheet not found' });
  if (sheet.status === GoalStatus.APPROVED) return res.status(403).json({ error: 'Sheet is locked after approval' });
  if (sheet.goals.length >= 8) return res.status(400).json({ error: 'Maximum 8 goals per cycle' });

  const goal = await prisma.goal.create({
    data: { sheetId, thrustArea, title, description, uomType, target, targetDate, weightage }
  });

  // Update total weightage on sheet
  const newTotal = sheet.goals.reduce((s, g) => s + g.weightage, 0) + weightage;
  await prisma.goalSheet.update({ where: { id: sheetId }, data: { totalWeightage: newTotal } });

  res.status(201).json(goal);
});

// ─── EMPLOYEE: Update goal (only if sheet not locked) ────────────────────

router.put('/goal/:id', async (req: Request, res: Response) => {
  const goal = await prisma.goal.findFirst({
    where: { id: req.params.id },
    include: { sheet: true }
  });
  if (!goal) return res.status(404).json({ error: 'Goal not found' });
  if (goal.sheet.employeeId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });
  if (goal.sheet.status === GoalStatus.APPROVED) return res.status(403).json({ error: 'Sheet is locked' });
  // Shared goal: only weightage can be edited
  const updateData = goal.isShared
    ? { weightage: req.body.weightage }
    : req.body;

  const updated = await prisma.goal.update({ where: { id: req.params.id }, data: updateData });
  res.json(updated);
});

// ─── EMPLOYEE: Delete goal ───────────────────────────────────────────────

router.delete('/goal/:id', async (req: Request, res: Response) => {
  const goal = await prisma.goal.findFirst({
    where: { id: req.params.id },
    include: { sheet: true }
  });
  if (!goal) return res.status(404).json({ error: 'Goal not found' });
  if (goal.sheet.employeeId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });
  if (goal.sheet.status === GoalStatus.APPROVED) return res.status(403).json({ error: 'Sheet is locked' });

  await prisma.goal.delete({ where: { id: req.params.id } });
  res.json({ deleted: true });
});

// ─── EMPLOYEE: Submit sheet ──────────────────────────────────────────────

router.post('/submit/:sheetId', async (req: Request, res: Response) => {
  try {
    const sheet = await submitGoalSheet(req.params.sheetId, req.user!.id);
    res.json(sheet);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── MANAGER: Get team sheets ────────────────────────────────────────────

router.get('/team/:cycleId', async (req: Request, res: Response) => {
  const sheets = await prisma.goalSheet.findMany({
    where: { managerId: req.user!.id, cycleId: req.params.cycleId },
    include: {
      employee: { select: { id: true, name: true, email: true, department: true } },
      goals: true
    }
  });
  res.json(sheets);
});

// ─── MANAGER: Approve sheet ──────────────────────────────────────────────

router.post('/approve/:sheetId', async (req: Request, res: Response) => {
  try {
    const sheet = await approveGoalSheet(req.params.sheetId, req.user!.id);
    res.json(sheet);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── MANAGER: Return sheet for rework ───────────────────────────────────

router.post('/return/:sheetId', async (req: Request, res: Response) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: 'Return reason is required' });
  try {
    const sheet = await returnGoalSheet(req.params.sheetId, req.user!.id, reason);
    res.json(sheet);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── MANAGER: Edit goal inline before approval ───────────────────────────

router.put('/manager/goal/:id', async (req: Request, res: Response) => {
  const goal = await prisma.goal.findFirst({
    where: { id: req.params.id },
    include: { sheet: true }
  });
  if (!goal) return res.status(404).json({ error: 'Goal not found' });
  if (goal.sheet.managerId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });
  if (goal.sheet.status !== 'SUBMITTED') return res.status(400).json({ error: 'Can only edit during review' });

  const { target, weightage } = req.body;
  const updated = await prisma.goal.update({
    where: { id: req.params.id },
    data: { ...(target && { target }), ...(weightage && { weightage }) }
  });
  res.json(updated);
});

// ─── ADMIN: Unlock sheet ─────────────────────────────────────────────────

router.post('/admin/unlock/:sheetId', async (req: Request, res: Response) => {
  if (req.user!.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  try {
    const sheet = await unlockGoalSheet(req.params.sheetId, req.user!.id);
    res.json(sheet);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── ADMIN: Push shared goal ─────────────────────────────────────────────

router.post('/shared/push', async (req: Request, res: Response) => {
  if (!['ADMIN', 'MANAGER'].includes(req.user!.role)) return res.status(403).json({ error: 'Forbidden' });
  const { sharedGoalId, sheetIds, defaultWeightage } = req.body;
  try {
    const goals = await pushSharedGoal(sharedGoalId, sheetIds, defaultWeightage);
    res.json(goals);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── VALIDATE: Check weightage before submit ─────────────────────────────

router.get('/validate/:sheetId', async (req: Request, res: Response) => {
  const result = await validateGoalSheet(req.params.sheetId);
  res.json(result);
});

export { router as goalsRouter };
