import { z } from 'zod';
import { ELoopType } from '../enums';

const loopFixedSchema = z.object({
  loopType: z.literal(ELoopType.FIXED),
  maxIterations: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val >= 1, {
      message: 'Max iterations must be at least 1',
    }),
});

const loopWhileSchema = z.object({
  loopType: z.literal(ELoopType.WHILE),
  exitCondition: z.string().min(1, 'Exit condition is required'),
});

const loopForEachSchema = z.object({
  loopType: z.literal(ELoopType.FOR_EACH),
  dataSourcePath: z.string().min(1, 'Data source path is required'),
});

export const LoopSchema = z.union([loopFixedSchema, loopWhileSchema, loopForEachSchema])

