import { z } from 'zod';
import { EAuthType } from '../enums';

// ----------------------------------------------------------------------
// 1. DEFINE INDIVIDUAL SUB-SCHEMAS
// ----------------------------------------------------------------------

const authNoneSchema = z.object({
  type: z.literal(EAuthType.NONE, { message: 'Auth type is required' }),
});

const authBasicSchema = z.object({
  type: z.literal(EAuthType.BASIC),
  username: z
    .string({ message: 'Username required' })
    .min(1, 'Username required'),
  password: z
    .string({ message: 'Password required' })
    .min(1, 'Password required'),
});

const headerItemSchema = z.object({
  headerKey: z
    .string({ message: 'Header Key required' })
    .min(1, 'Header Key required'),
  headerValue: z
    .string({ message: 'Header Value required' })
    .min(1, 'Header Value required'),
});

const authHeaderSchema = z.object({
  type: z.literal(EAuthType.HEADER),
  auth: z.array(headerItemSchema).min(1, 'At least one header required'),
});

// ----------------------------------------------------------------------
// 2. REGISTRY
// ----------------------------------------------------------------------

type AuthSubSchema =
  | typeof authNoneSchema
  | typeof authBasicSchema
  | typeof authHeaderSchema;

const AUTH_SCHEMA_REGISTRY: Record<EAuthType, AuthSubSchema> = {
  [EAuthType.NONE]: authNoneSchema,
  [EAuthType.BASIC]: authBasicSchema,
  [EAuthType.HEADER]: authHeaderSchema,
};

// ----------------------------------------------------------------------
// 3. MAIN SCHEMA (matches style of scheduleSchema)
// ----------------------------------------------------------------------

export const authSchema = z
  .object({
    type: z.nativeEnum(EAuthType, {
      message: 'Auth type is required',
    }),
  })
  .catchall(z.unknown())
  .superRefine((data, ctx) => {
    const selectedSchema = AUTH_SCHEMA_REGISTRY[data.type];

    if (!selectedSchema) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid Auth Type',
        path: ['type'],
      });
      return;
    }

    const result = selectedSchema.safeParse(data);

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        ctx.addIssue(issue as Parameters<typeof ctx.addIssue>[0]);
      });
    }
  })
  .transform((data) => {
    const selectedSchema = AUTH_SCHEMA_REGISTRY[data.type];

    if (selectedSchema) {
      const clean = selectedSchema.parse(data);
      return { ...clean };
    }

    return { ...data };
  });

export type AuthSchemaType = z.infer<typeof authSchema>;
