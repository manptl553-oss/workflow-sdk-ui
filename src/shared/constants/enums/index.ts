/**
 * Add-on types available for onboarding workflows.
 * These represent optional verifications or checks performed during onboarding.
 */
export enum EOnboardingAddonType {
  PEPCheck = 'PEP_CHECK',
  CriminalBackgroundCheck = 'CRIMINAL_BACKGROUND_CHECK',
  SSNVerification = 'SSN_VERIFICATION',
  BankAuth = 'PLAID_BANK_VERIFICATION',
  BankStatements = 'PLAID_BANK_STATEMENTS',
}

/**
 * Supported time ranges for retrieving bank statements.
 */
export enum EBankStatementDuration {
  LastMonth = 'lastMonth',
  PastTwoMonths = 'pastTwoMonths',
  PastThreeMonths = 'pastThreeMonths',
  PastSixMonths = 'pastSixMonths',
}

/**
 * Authentication methods supported in API workflow nodes.
 */
export enum EAuthType {
  NONE = 'none',
  BASIC = 'basic',
  HEADER = 'header',
}

/**
 * Loop execution types for Loop Workflow Nodes.
 * Determines how the loop iterates or terminates.
 */
export enum ELoopType {
  FOR_EACH = "for_each",
  FIXED = "fixed_count",
  WHILE = "while_loop",
}

/**
 * Units of time supported for delay operations.
 */
export enum EDelayUnit {
  SECONDS = 'seconds',
  MINUTES = 'minutes',
  HOURS = 'hours',
  DAYS = 'days',
}

/**
 * Dropdown options mapped from EDelayUnit enum.
 * Used in UI components where users select a delay duration unit.
 */
export const DelayUnitSelect = Object.entries(EDelayUnit).map(
  ([key, value]) => ({
    label: key,
    value,
  }),
);

/**
 * Schedule modes used in scheduling workflow nodes.
 * Determines if a job runs at a specific time or on an interval.
 */
export enum EScheduleType {
  FIXED_TIME = 'FIXED_TIME',
  INTERVAL = 'INTERVAL',
}

/**
 * Units of time used for interval-based scheduling.
 */
export enum ETimeUnit {
  SECONDS = 'seconds',
  MINUTES = 'minutes',
  HOURS = 'hours',
  DAYS = 'days',
}


/**
 * Logical conjunction operators used in conditional and switch logic.
 */
export enum EConjunctionType {
  And = '&&',
  Or = '||',
}

/**
 * Modes for evaluating logic rules inside workflow conditions.
 * - `switch`: Matches exact values using switch-like evaluation.
 * - `conditional`: Evaluates boolean expressions dynamically.
 */
export enum ELogicRulesModes {
  Switch = 'switch',
  Conditional = 'conditional',
}

/**
 * Workflow node types representing all supported actions,
 * triggers, transformations, and flow operations within the system.
 */
export enum NodeTypeProps {
  SEND_EMAIL = 'send_email',
  SEND_HTTP_REQUEST = 'send_http_request',
  UPDATE_DATABASE = 'update_database',

  CONDITIONAL = 'conditional',
  LOOP = 'loop',
  SWITCH = 'switch',
  RULE_EXECUTOR = 'rule_executor',

  MAP = 'map',
  RENAME = 'rename',
  REMOVE = 'remove',
  COPY = 'copy',
  FILTER = 'filter',
  AGGREGATE = 'aggregate',
  GROUP = 'group',
  CONCAT = 'concat',

  FORMULA = 'formula',
  CONVERT_TYPE = 'convert_type',
  MERGE = 'merge',
  SPLIT = 'split',

  DATE_FORMAT = 'date_format',
  DATE_OPERATION = 'date_operation',
  TIMESTAMP = 'timestamp',

  CODE_BLOCK = 'code_block',

  MEMBERSHIP_INVITE = 'membership_invite',

  HTTP_REQUEST = 'http_request',
  WEBHOOK = 'webhook',
  EVENT = 'event',
  SCHEDULE = 'schedule',
  WAIT = 'wait',

  VOID = 'void_node',
}

/**
 * High-level categories used to group workflow nodes
 * in the node picker UI and internal workflow organization.
 */
export enum CategoryTypes {
  TRIGGER = 'trigger',
  ACTION = 'action',
  DATA_TRANSFORM = 'data_transform',
  FLOW_CONTROL = 'flow_control',
  UTILITIES = 'utilities',
  GENERAL = 'general',
  KYC = 'kyc',
  KYB = 'kyb',
}

/**
 * Represents the publish state of a workflow.
 */
export enum WorkFlowStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}
