// backend/src/routes/checkins.ts
import { Router, Request, Response } from 'express';
import { PrismaClient, Quarter } from '@prisma/client';
import { computeScore, computeSheetScore } from '../services/goalService';

const router = Router();
const prisma = new PrismaClient();

// ─── EMPLOYEE: Log quarterly achievement ─────────────────────────────────

router.post('/log', async (req: Request, res: Response) => {
  const { goalId, quarter, actualAchievement, completionDate, status } = req.body;

  const goal = await prisma.goal.findFirst({
    where: { id: goalId },
    include: { sheet: true }
  });
  if (!goal) return res.status(404).json({ error: 'Goal not found' });
  if (goal.sheet.employeeId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });
  if (goal.sheet.status !== 'APPROVED') return res.status(400).json({ error: 'Goals must be approved before check-in' });

  const score = computeScore(
    goal.uomType,
    goal.target,
    actualAchievement ?? 0,
    goal.targetDate,
    completionDate ? new Date(completionDate) : null
  );

  const checkIn = await prisma.checkIn.upsert({
    where: { goalId_quarter: { goalId, quarter } },
    update: { actualAchievement, completionDate, status, score },
    create: { goalId, quarter, actualAchievement, completionDate, status, score }
  });

  // If shared goal, sync score to shared check-in
  if (goal.isShared && goal.sharedGoalId) {
    await prisma.sharedCheckIn.upsert({
      where: { sharedGoalId_quarter: { sharedGoalId: goal.sharedGoalId, quarter } },
      update: { actualAchievement, completionDate, status, score },
      create: { sharedGoalId: goal.sharedGoalId, quarter, actualAchievement, completionDate, status, score }
    });
  }

  res.json(checkIn);
});

// ─── MANAGER: View team check-ins ────────────────────────────────────────

router.get('/team/:cycleId/:quarter', async (req: Request, res: Response) => {
  const { cycleId, quarter } = req.params;

  const sheets = await prisma.goalSheet.findMany({
    where: { managerId: req.user!.id, cycleId },
    include: {
      employee: { select: { id: true, name: true, email: true } },
      goals: {
        include: {
          checkIns: { where: { quarter: quarter as Quarter } }
        }
      }
    }
  });

  res.json(sheets);
});

// ─── MANAGER: Add check-in comment ───────────────────────────────────────

router.post('/comment', async (req: Request, res: Response) => {
  const { checkInId, comment } = req.body;
  if (!comment) return res.status(400).json({ error: 'Comment is required' });

  const checkIn = await prisma.checkIn.findFirst({
    where: { id: checkInId },
    include: { goal: { include: { sheet: true } } }
  });
  if (!checkIn) return res.status(404).json({ error: 'Check-in not found' });
  if (checkIn.goal.sheet.managerId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });

  const updated = await prisma.checkIn.update({
    where: { id: checkInId },
    data: { managerComment: comment, managerId: req.user!.id, commentedAt: new Date() }
  });
  res.json(updated);
});

// ─── EMPLOYEE: Get my check-in history ───────────────────────────────────

router.get('/my/:cycleId', async (req: Request, res: Response) => {
  const sheet = await prisma.goalSheet.findUnique({
    where: { employeeId_cycleId: { employeeId: req.user!.id, cycleId: req.params.cycleId } },
    include: { goals: { include: { checkIns: { orderBy: { quarter: 'asc' } } } } }
  });
  res.json(sheet);
});

// ─── SHEET SCORE ─────────────────────────────────────────────────────────

router.get('/score/:sheetId/:quarter', async (req: Request, res: Response) => {
  const score = await computeSheetScore(req.params.sheetId, req.params.quarter);
  res.json({ score });
});

export { router as checkinsRouter };
