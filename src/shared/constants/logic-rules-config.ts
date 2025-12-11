import { EConjunctionType } from "./enums";

export enum EOperatorType {
  Equals = '==',
  StrictEquals = '===',
  NotEquals = '!=',
  GreaterThan = '>',
  LessThan = '<',
  GreaterOrEqual = '>=',
  LessOrEqual = '<=',
}


export const operatorLabels: Record<EOperatorType, string> = {
  [EOperatorType.Equals]: 'EQUALS',
  [EOperatorType.StrictEquals]: 'STRICT EQUALS',
  [EOperatorType.NotEquals]: 'NOT EQUALS',
  [EOperatorType.GreaterThan]: 'GREATER THAN',
  [EOperatorType.LessThan]: 'LESS THAN',
  [EOperatorType.GreaterOrEqual]: 'GREATER OR EQUAL',
  [EOperatorType.LessOrEqual]: 'LESS OR EQUAL',
};

export const ConjunctionLabels: Record<EConjunctionType, string> = {
  [EConjunctionType.And]: 'AND',
  [EConjunctionType.Or]: 'OR',
};

export const operatorsOptions = Object.entries(operatorLabels).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

export const conjunctionOptions = Object.entries(ConjunctionLabels).map(
  ([value, label]) => ({
    value,
    label,
  }),
);
