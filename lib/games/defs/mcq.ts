import { z } from 'zod';
import { makeResult, NOT_ANSWERED, type GameDef } from '../def';
import { GAME_META } from '../meta';
import { uid } from '../random';

const question = z
  .object({
    id: z.string().min(1),
    /** Optional text the question is about. Words in [ ] are underlined, words in « » highlighted. */
    passage: z.string().trim().max(1500, 'النص طويل أوي.').default(''),
    prompt: z.string().trim().min(1, 'اكتب نص السؤال.').max(500, 'نص السؤال طويل أوي.'),
    image: z.string().trim().max(1000).default(''),
    options: z
      .array(z.string().trim().min(1, 'فيه اختيار فاضي.').max(200, 'اختيار طويل أوي.'))
      .min(2, 'كل سؤال محتاج اختيارين على الأقل.')
      .max(6, 'أقصى عدد اختيارات ٦.'),
    correct: z.number().int().min(0),
    explanation: z.string().trim().max(600).default(''),
    /** One explanation per option, same order. A wrong one may name the mistake: "(مشكلتك: التسرع)". */
    whys: z.array(z.string().trim().max(600, 'شرح الاختيار طويل أوي.')).max(6).default([]),
  })
  .refine((q) => q.correct < q.options.length, { message: 'اختار الإجابة الصح.', path: ['correct'] });

export const mcqContent = z.object({
  questions: z.array(question).min(1, 'ضيف سؤال واحد على الأقل.').max(100, 'أقصى عدد أسئلة ١٠٠.'),
});

export const mcqAnswers = z.object({
  answers: z
    .array(z.object({ id: z.string().max(40), choice: z.number().int().min(0).max(10).nullable() }))
    .max(200),
});

export type McqContent = z.output<typeof mcqContent>;
export type McqQuestion = McqContent['questions'][number];
export type McqAnswers = z.output<typeof mcqAnswers>;

export const TIMEOUT_PROBLEM = 'خلص الوقت قبل ما تجاوب';

/** "خطأ؛ (مشكلتك: عدم التركيز)؛ لأن ..." -> "عدم التركيز" */
export function problemOf(why: string | undefined): string | null {
  const m = why ? /مشكلتك\s*[:：]\s*([^)）؛;\n]+)/.exec(why) : null;
  return m ? m[1].trim() || null : null;
}

/** The mistake behind a wrong pick, or null when it was right or the option names none. */
export function pickProblem(q: McqQuestion, choice: number | null): string | null {
  if (choice === q.correct) return null;
  if (choice === null) return TIMEOUT_PROBLEM;
  return problemOf(q.whys[choice]);
}

export function newMcqQuestion(): McqQuestion {
  return { id: uid(), passage: '', prompt: '', image: '', options: ['', '', '', ''], correct: 0, explanation: '', whys: [] };
}

export const mcqDef: GameDef<McqContent, McqAnswers> = {
  type: 'mcq',
  label: GAME_META.mcq.label,
  description: 'أسئلة بأكتر من اختيار، وبعد كل سؤال يظهر الشرح.',
  howTo: 'اختار الإجابة الصح قبل ما الوقت يخلص، وبعد كل سؤال هتعرف السبب.',
  accent: '#E8C46F',
  itemForms: GAME_META.mcq.itemForms,
  contentSchema: mcqContent,
  answersSchema: mcqAnswers,
  usesQuestionTimer: true,
  defaultContent: () => ({ questions: [newMcqQuestion()] }),
  itemCount: (c) => c.questions.length,
  score(content, answers, settings) {
    const given = new Map(answers.answers.map((a) => [a.id, a.choice]));
    let correct = 0;
    const review = content.questions.map((q) => {
      const choice = given.get(q.id) ?? null;
      const ok = choice === q.correct;
      if (ok) correct++;
      return {
        prompt: q.prompt,
        correct: ok,
        given: choice === null ? NOT_ANSWERED : (q.options[choice] ?? NOT_ANSWERED),
        expected: q.options[q.correct],
        explanation: q.whys[q.correct] || q.explanation || undefined,
        problem: pickProblem(q, choice) ?? undefined,
      };
    });
    return makeResult(correct, content.questions.length, settings, review);
  },
};
