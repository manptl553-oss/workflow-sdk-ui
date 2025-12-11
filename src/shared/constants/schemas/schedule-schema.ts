import { z } from 'zod';
import { EScheduleType, ETimeUnit } from '../enums';

// ----------------------------------------------------------------------
// 1. DEFINE INDIVIDUAL SCHEMAS
// ----------------------------------------------------------------------

const fixedTimeSchema = z.object({
  date: z
    .string({ message: 'Date is required' })
    .min(1, 'Date is required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),

  hour: z.preprocess(
    (val) =>
      val === '' || val === null || val === undefined ? undefined : Number(val),
    z
      .number({ message: 'Hour is required' })
      .min(0, 'Hour must be between 0 and 23')
      .max(23, 'Hour must be between 0 and 23'),
  ),

  minute: z.preprocess(
    (val) =>
      val === '' || val === null || val === undefined ? undefined : Number(val),
    z
      .number({ message: 'Minute is required' })
      .min(0, 'Minute must be between 0 and 59')
      .max(59, 'Minute must be between 0 and 59'),
  ),

  timezone: z.string().optional(),
});

const intervalSchema = z
  .object({
    intervalValue: z.preprocess(
      (val) =>
        val === '' || val === null || val === undefined
          ? undefined
          : Number(val),
      z
        .number({ message: 'Interval value is required' })
        .min(1, 'Interval value must be at least 1'),
    ),

    intervalUnit: z.nativeEnum(ETimeUnit, {
      message: 'Select Valid IntervalUnit',
    }),
    timezone: z.string().optional(),

    enableRepeat: z.boolean().optional(),

    // FIX: Handle repeatCount so it NEVER throws "received nan"
    repeatCount: z.preprocess((val) => {
      if (val === '' || val === null || val === undefined) return undefined;
      const parsed = Number(val);
      // KEY FIX: If parsed value is NaN, return undefined.
      // This allows z.number().optional() to pass successfully,
      // handing full control to superRefine below.
      return isNaN(parsed) ? undefined : parsed;
    }, z.number().optional()),
  })
  .superRefine((data, ctx) => {
    // Logic: Check enableRepeat first.
    if (data.enableRepeat) {
      // If repeatCount is undefined (meaning it was empty OR invalid NaN), throw custom error
      if (data.repeatCount === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Repeat count is required',
          path: ['repeatCount'],
        });
      } else if (data.repeatCount < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Repeat count must be at least 1',
          path: ['repeatCount'],
        });
      }
    }
  });

// ----------------------------------------------------------------------
// 2. REGISTRY & TYPES
// ----------------------------------------------------------------------

type ScheduleSubSchema = typeof fixedTimeSchema | typeof intervalSchema;

const SCHEMA_REGISTRY: Record<string, ScheduleSubSchema> = {
  [EScheduleType.FIXED_TIME]: fixedTimeSchema,
  [EScheduleType.INTERVAL]: intervalSchema,
};

// ----------------------------------------------------------------------
// 3. MAIN SCHEMA
// ----------------------------------------------------------------------

export const scheduleSchema = z
  .object({
    type: z.nativeEnum(EScheduleType),
  })
  .catchall(z.unknown())
  .superRefine((data, ctx) => {
    const selectedSchema = SCHEMA_REGISTRY[data.type];

    if (selectedSchema) {
      const result = selectedSchema.safeParse(data);

      if (!result.success) {
        result.error.issues.forEach((issue) => {
          // Strict typing for issue passing
          ctx.addIssue(issue as Parameters<typeof ctx.addIssue>[0]);
        });
      }
    } else {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid Schedule Type',
        path: ['type'],
      });
    }
  })
  .transform((data) => {
    const selectedSchema = SCHEMA_REGISTRY[data.type];

    if (selectedSchema) {
      const cleanData = selectedSchema.parse(data);

      if (
        data.type === EScheduleType.INTERVAL &&
        'intervalValue' in cleanData
      ) {
        return {
          type: data.type,
          ...cleanData,
          // If repeat is disabled, strictly return repeatCount as undefined
          repeatCount: cleanData.enableRepeat
            ? cleanData.repeatCount
            : undefined,
        };
      }

      return { type: data.type, ...cleanData };
    }

    return { ...data };
  });

export type ScheduleFormValues = z.infer<typeof scheduleSchema>;