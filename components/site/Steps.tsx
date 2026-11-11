import { CheckIcon } from '@/components/ui/icons';
import { num } from '@/lib/format';

const STEPS = ['اختار مرحلتك', 'اختار لعبة', 'العب واجمع نقط'];

/** Shows students where they are: pick a grade, pick a game, then play. */
export function Steps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="steps" aria-label="الخطوات">
      {STEPS.map((label, i) => {
        const n = i + 1;
        return (
          <li key={label} className={n < current ? 'done' : n === current ? 'on' : undefined} aria-current={n === current ? 'step' : undefined}>
            <span className="n" aria-hidden="true">
              {n < current ? <CheckIcon size={13} strokeWidth={3} /> : num(n)}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}
