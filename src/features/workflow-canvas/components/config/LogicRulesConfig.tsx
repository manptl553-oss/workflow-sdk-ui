import {
  Button,
  conjunctionOptions,
  EConjunctionType,
  Input,
  Label,
  operatorsOptions,
  EOperatorType,
  Select,
  ConjunctionLabels,
  ELogicRulesModes,
} from '@/shared';
import { useFlowStore } from '@/store';
import { Trash2 } from 'lucide-react';
import React, { useCallback } from 'react';
import { Controller, useFieldArray } from 'react-hook-form';
import { LogicRulesFieldProps } from '../../types';

export const LogicRulesField = ({
  control,
  name,
  label,
  errors,
  watch,
  setValue,
  mode = ELogicRulesModes.Conditional,
}: LogicRulesFieldProps) => {
  const { fields, append, remove } = useFieldArray({
    name,
    control,
  });

  const { edges, activeNode, setEdges } = useFlowStore();
  const removeEdge = useCallback((index: number) => {
    const existingEdges = edges.filter((e) => e.source === activeNode?.id);
    remove(index);
    const caseIndex = index + 1;
    if (caseIndex <= 0 || caseIndex >= existingEdges.length) return;

    const edgeToRemove = edges.findIndex(
      (e) => e.sourceHandle === `case_${caseIndex}`,
    );
    const lastEdge = edges.findIndex(
      (e) => e.sourceHandle === `case_${existingEdges.length}`,
    );

    const newEdges = [...edges];
    const temp = newEdges[edgeToRemove];
    newEdges[edgeToRemove] = {
      ...newEdges[lastEdge],
      sourceHandle: `case_${caseIndex}`,
      data: {
        ...newEdges[lastEdge].data,
        condition: `case_${caseIndex}`,
      },
    };
    newEdges[lastEdge] = {
      ...temp,
      sourceHandle: `case_${existingEdges.length}`,
      data: {
        ...temp.data,
        condition: `case_${existingEdges.length}`,
      },
    };
    setEdges(newEdges);
  }, [activeNode?.id, edges, remove, setEdges]);

  return (
    <div className="wf-field-group">
      <Label className="wf-field-label">{label}</Label>

      {/* <div className="wf-logic-rows"> */}

      {fields.map((item, index) => (
        <React.Fragment key={item.id}>
          <div className="wf-logic-row">
            {/* Field */}
            <div className="wf-field-wrapper">
              <Controller
                control={control}
                name={`${name}.${index}.field`}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Field"
                    className="wf-input-bordered"
                  />
                )}
              />
              {errors?.[index]?.field && (
                <p className="wf-error-inline">
                  {errors?.[index]?.field.message}
                </p>
              )}
            </div>

            {/* Operator */}
            <div className="wf-field-wrapper">
              <Controller
                control={control}
                name={`${name}.${index}.operator`}
                render={({ field }) => (
                  <Select
                    options={operatorsOptions}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Operator"
                  />
                )}
              />
            </div>

            {/* Value */}
            <div className="wf-field-wrapper">
              <Controller
                control={control}
                name={`${name}.${index}.value`}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Value"
                    className="wf-input-bordered"
                  />
                )}
              />
              {errors?.[index]?.value && (
                <p className="wf-error-inline">
                  {errors?.[index]?.value.message}
                </p>
              )}
            </div>

            {fields.length > 1 && (
              <Button
                variant="destructive"
                size="icon"
                type="button"
                onClick={() =>
                  mode === ELogicRulesModes.Switch ? removeEdge(index) : remove(index)
                }
              >
                <Trash2 />
              </Button>
            )}
          </div>
          <div className="wf-logic-select">
            {mode == ELogicRulesModes.Conditional &&
              fields.length > 1 &&
              (index === 0 ? (
                <Controller
                  control={control}
                  name={`${name}.${index}.conjunction`}
                  render={({ field }) => (
                    <Select
                      options={conjunctionOptions}
                      value={field.value ?? EConjunctionType.And}
                      onValueChange={(value) => {
                        field.onChange(value);

                        // update all conjunctions
                        fields.forEach((_, idx) => {
                          setValue!(`${name}.${idx}.conjunction`, value);
                        });
                      }}
                      placeholder={`select operator`}
                    />
                  )}
                />
              ) : (
                index !== fields.length - 1 && (
                  <p>
                    {
                      ConjunctionLabels[
                        (watch(`${name}.0.conjunction`) as EConjunctionType) ??
                          EConjunctionType.And
                      ]
                    }
                  </p>
                )
              ))}
          </div>
        </React.Fragment>
      ))}
      {/* </div> */}

      <Button
        type="button"
        variant="outline"
        className="wf-primary-cta"
        onClick={() =>
          append({ field: '', operator: EOperatorType.Equals, value: '' })
        }
      >
        + Add {mode === ELogicRulesModes.Switch ? 'Case' : 'Condition'}
      </Button>

      {errors && <p className="wf-error-text">{errors.message}</p>}
    </div>
  );
};
