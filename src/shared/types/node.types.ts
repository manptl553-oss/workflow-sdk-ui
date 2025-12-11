// src/core/types/node.types.ts

export type NodeDefinition = {
  outputs: string[];
  defaultTarget: string;
  selfLoopHandle?: string;
  labels?: Record<string, string>;
};

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(
  (m) => ({
    label: m,
    value: m,
  }),
);

export enum NodeExecutionStatus {
  Running = 'started',
  Completed = 'completed',
  Failed = 'failed',
}
