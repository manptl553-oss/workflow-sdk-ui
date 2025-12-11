import { NodeDefinition } from '../types';
import { NodeTypeProps } from './enums';

export const NODE_DEFINITIONS: Record<NodeTypeProps, NodeDefinition> = {
  webhook: { outputs: ['none'], defaultTarget: 'input' },
  event: { outputs: ['none'], defaultTarget: 'input' },
  schedule: { outputs: ['none'], defaultTarget: 'input' },
  http_request: { outputs: ['none'], defaultTarget: 'input' },

  send_email: { outputs: ['none'], defaultTarget: 'input' },
  send_http_request: { outputs: ['none'], defaultTarget: 'input' },
  update_database: { outputs: ['none'], defaultTarget: 'input' },
  membership_invite: { outputs: ['none'], defaultTarget: 'input' },

  map: { outputs: ['none'], defaultTarget: 'input' },
  rename: { outputs: ['none'], defaultTarget: 'input' },
  remove: { outputs: ['none'], defaultTarget: 'input' },
  copy: { outputs: ['none'], defaultTarget: 'input' },
  filter: { outputs: ['none'], defaultTarget: 'input' },
  aggregate: { outputs: ['none'], defaultTarget: 'input' },
  group: { outputs: ['none'], defaultTarget: 'input' },
  concat: { outputs: ['none'], defaultTarget: 'input' },
  formula: { outputs: ['none'], defaultTarget: 'input' },
  convert_type: { outputs: ['none'], defaultTarget: 'input' },

  merge: { outputs: ['none'], defaultTarget: 'input-1' },

  split: {
    outputs: ['none'],
    defaultTarget: 'input',
    labels: { item: 'Each Item' },
  },

  date_format: { outputs: ['none'], defaultTarget: 'input' },
  date_operation: { outputs: ['none'], defaultTarget: 'input' },
  timestamp: { outputs: ['none'], defaultTarget: 'input' },

  conditional: {
    outputs: ['on_true', 'on_false'],
    defaultTarget: 'input',
    labels: { true: 'True', false: 'False' },
  },

  switch: {
    outputs: ['case_1'],
    defaultTarget: 'input',
    labels: { case_1: 'Case 1' },
  },

  loop: {
    outputs: ['body', 'end'],
    defaultTarget: 'input',
    selfLoopHandle: 'body',
    labels: { body: 'Loop Body', end: 'Loop End' },
  },

  rule_executor: {
    outputs: ['on_true', 'on_false'],
    defaultTarget: 'input',
    labels: { true: 'True', false: 'False' },
  },

  code_block: { outputs: ['none'], defaultTarget: 'input' },

  wait: { outputs: ['none'], defaultTarget: 'input' },

  void_node: { outputs: ['none'], defaultTarget: 'input' },
};
