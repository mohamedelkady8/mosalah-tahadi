'use client';

export interface GradeOption {
  id: string;
  name: string;
}

/** Picks one grade, or none for "every grade". */
export function GradeSelect({
  grades,
  value,
  onChange,
  id,
  small = false,
  label = 'المرحلة',
}: {
  grades: GradeOption[];
  value: string | null;
  onChange: (gradeId: string | null) => void;
  id?: string;
  small?: boolean;
  label?: string;
}) {
  return (
    <select id={id} className={`select${small ? ' input-sm' : ''}`} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} aria-label={id ? undefined : label}>
      <option value="">كل المراحل</option>
      {grades.map((g) => (
        <option key={g.id} value={g.id}>
          {g.name}
        </option>
      ))}
    </select>
  );
}

export const gradeName = (grades: GradeOption[], id: string | null) => (id ? (grades.find((g) => g.id === id)?.name ?? 'مرحلة اتمسحت') : 'كل المراحل');
