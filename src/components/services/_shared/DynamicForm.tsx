// Path: /src/components/services/_shared/DynamicForm.tsx
// Module: DynamicForm
// Depends on: react, @/services/_registry/serviceForms
// Description: Renders generic form fields from a service form definition.

'use client'

import type { DynamicFormField } from '@/services/_registry/serviceForms'

interface DynamicFormProps {
  fields: DynamicFormField[]
  values: Record<string, string>
  onChange: (name: string, value: string) => void
}

function shouldShow(field: DynamicFormField, values: Record<string, string>) {
  if (!field.showWhen) return true
  return field.showWhen.values.includes(values[field.showWhen.field])
}

/** Renders a dynamic form field list. */
export function DynamicForm({ fields, values, onChange }: DynamicFormProps) {
  const baseFieldClassName = 'msi-field'

  return (
    <div className="space-y-4">
      {fields.filter((field) => shouldShow(field, values)).map((field) => (
        <div key={field.name}>
          <label className="mb-2 block text-sm font-medium text-slate-300">{field.label}</label>
          {field.type === 'select' ? (
              <select
                value={values[field.name] ?? field.defaultValue ?? ''}
                onChange={(e) => onChange(field.name, e.target.value)}
                className={baseFieldClassName}
              >
                {(field.options ?? []).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
          ) : field.type === 'textarea' ? (
            <textarea
              value={values[field.name] ?? field.defaultValue ?? ''}
              onChange={(e) => onChange(field.name, e.target.value)}
              className={`min-h-[120px] ${baseFieldClassName}`}
              placeholder={field.placeholder}
            />
          ) : (
            <input
              value={values[field.name] ?? field.defaultValue ?? ''}
              onChange={(e) => onChange(field.name, e.target.value)}
              className={baseFieldClassName}
              placeholder={field.placeholder}
              type={field.type}
            />
          )}
        </div>
      ))}
    </div>
  )
}
