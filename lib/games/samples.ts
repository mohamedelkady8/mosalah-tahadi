import type { PlayableGame } from '@/components/games/types';

/** Built-in practice games (same as supabase/seed.sql). Playable at /try without an account. */
export const SAMPLE_GAMES: PlayableGame[] = [
  {
    "id": "sample-nahw-mcq",
    "slug": "nahw-mcq",
    "title": "ع السريع: المرفوعات",
    "description": "أسئلة سريعة في المرفوعات، وبعد كل سؤال هتعرف إجابتك صح ولا غلط وليه.",
    "type": "mcq",
    "topic": "نحو",
    "difficulty": 1,
    "item_count": 8,
    "cover_url": null,
    "settings": {
      "shuffle": true,
      "timeLimitSec": 0,
      "pointsPerItem": 10,
      "attemptsAllowed": 0,
      "questionTimeSec": 30,
      "showExplanations": true
    },
    "content": {
      "questions": [
        {
          "id": "q1",
          "prompt": "ما إعراب كلمة «العلمُ» في جملة: العلمُ نورٌ؟",
          "correct": 1,
          "options": [
            "خبر مرفوع",
            "مبتدأ مرفوع",
            "فاعل مرفوع",
            "مفعول به منصوب"
          ],
          "explanation": "«العلمُ» اسم جاء في أول الجملة الاسمية، فهو مبتدأ مرفوع وعلامة رفعه الضمة."
        },
        {
          "id": "q2",
          "prompt": "في جملة «فاز المجتهدُ»، كلمة «المجتهدُ» إعرابها:",
          "correct": 0,
          "options": [
            "فاعل مرفوع",
            "مبتدأ مرفوع",
            "خبر مرفوع",
            "نائب فاعل مرفوع"
          ],
          "explanation": "جاءت بعد فعل مبني للمعلوم ودلّت على مَن قام بالفعل، فهي فاعل مرفوع."
        },
        {
          "id": "q3",
          "prompt": "ما علامة رفع جمع المذكر السالم؟",
          "correct": 2,
          "options": [
            "الضمة",
            "الألف",
            "الواو",
            "ثبوت النون"
          ],
          "explanation": "جمع المذكر السالم يُرفع بالواو نيابة عن الضمة، مثل: نجح المعلمون."
        },
        {
          "id": "q4",
          "prompt": "علامة رفع المثنى هي:",
          "correct": 3,
          "options": [
            "الواو",
            "الضمة",
            "الياء",
            "الألف"
          ],
          "explanation": "المثنى يُرفع بالألف نيابة عن الضمة، مثل: حضر الطالبان."
        },
        {
          "id": "q5",
          "prompt": "في جملة «كان الجوُّ جميلًا»، كلمة «جميلًا» إعرابها:",
          "correct": 1,
          "options": [
            "اسم كان مرفوع",
            "خبر كان منصوب",
            "حال منصوب",
            "مفعول به منصوب"
          ],
          "explanation": "كان ترفع المبتدأ ويسمى اسمها، وتنصب الخبر ويسمى خبرها."
        },
        {
          "id": "q6",
          "prompt": "في جملة «إنَّ اللهَ غفورٌ»، كلمة «غفورٌ» إعرابها:",
          "correct": 0,
          "options": [
            "خبر إنّ مرفوع",
            "اسم إنّ منصوب",
            "مبتدأ مرفوع",
            "صفة مرفوعة"
          ],
          "explanation": "إنّ تنصب المبتدأ ويسمى اسمها، وترفع الخبر ويسمى خبرها."
        },
        {
          "id": "q7",
          "prompt": "الأفعال الخمسة تُرفع بـ:",
          "correct": 3,
          "options": [
            "الضمة",
            "الواو",
            "حذف النون",
            "ثبوت النون"
          ],
          "explanation": "مثل: الطلاب يكتبون، فالفعل مرفوع بثبوت النون."
        },
        {
          "id": "q8",
          "prompt": "«قُرِئَ الكتابُ»: كلمة «الكتابُ» إعرابها:",
          "correct": 2,
          "options": [
            "فاعل مرفوع",
            "مفعول به منصوب",
            "نائب فاعل مرفوع",
            "مبتدأ مرفوع"
          ],
          "explanation": "الفعل «قُرِئَ» مبني للمجهول، فالاسم المرفوع بعده نائب فاعل."
        }
      ]
    }
  },
  {
    "id": "sample-balagha-tf",
    "slug": "balagha-tf",
    "title": "صح ولا غلط؟ البلاغة",
    "description": "جمل سريعة في البلاغة، قرّر صح ولا غلط قبل ما الوقت يخلص.",
    "type": "true_false",
    "topic": "بلاغة",
    "difficulty": 2,
    "item_count": 8,
    "cover_url": null,
    "settings": {
      "shuffle": true,
      "timeLimitSec": 0,
      "pointsPerItem": 10,
      "attemptsAllowed": 0,
      "questionTimeSec": 12,
      "showExplanations": true
    },
    "content": {
      "statements": [
        {
          "id": "s1",
          "text": "التشبيه البليغ هو ما حُذفت منه الأداة ووجه الشبه.",
          "answer": true,
          "explanation": "مثل: العلمُ نورٌ، ذُكر المشبه والمشبه به فقط."
        },
        {
          "id": "s2",
          "text": "في الاستعارة المكنية يُصرَّح بالمشبه به.",
          "answer": false,
          "explanation": "في المكنية يُحذف المشبه به ويُرمز له بشيء من لوازمه، أما التصريحية فيُصرَّح فيها بالمشبه به."
        },
        {
          "id": "s3",
          "text": "في قولنا «رأيتُ أسدًا يخطب» استعارة تصريحية.",
          "answer": true,
          "explanation": "شبّه الخطيب الشجاع بالأسد، وحذف المشبه وصرّح بالمشبه به."
        },
        {
          "id": "s4",
          "text": "الطباق هو الجمع بين الكلمة وضدها في الكلام.",
          "answer": true,
          "explanation": "مثل: يضحك ويبكي، والليل والنهار."
        },
        {
          "id": "s5",
          "text": "الجناس التام هو اختلاف الكلمتين في نوع الحروف.",
          "answer": false,
          "explanation": "الجناس التام اتفاق الكلمتين في نوع الحروف وعددها وترتيبها وضبطها مع اختلاف المعنى."
        },
        {
          "id": "s6",
          "text": "الكناية لفظ أُطلق وأُريد به لازم معناه مع جواز إرادة المعنى الأصلي.",
          "answer": true,
          "explanation": "مثل: فلانٌ كثير الرماد، كناية عن الكرم."
        },
        {
          "id": "s7",
          "text": "السجع هو توافق الفاصلتين في الحرف الأخير، ويكثر في النثر.",
          "answer": true,
          "explanation": "مثل: الصبرُ مفتاحُ الفرج، والعجلةُ بابُ الحرج."
        },
        {
          "id": "s8",
          "text": "المقابلة هي الجمع بين كلمة واحدة وضدها فقط.",
          "answer": false,
          "explanation": "المقابلة أن يُؤتى بمعنيين أو أكثر ثم بما يقابلها على الترتيب، أما الجمع بين الكلمة وضدها فهو الطباق."
        }
      ]
    }
  },
  {
    "id": "sample-vocab-matching",
    "slug": "vocab-matching",
    "title": "وصّل الكلمة بمعناها",
    "description": "معاني كلمات من النصوص، وصّل كل كلمة بمعناها الصح.",
    "type": "matching",
    "topic": "قراءة",
    "difficulty": 1,
    "item_count": 6,
    "cover_url": null,
    "settings": {
      "shuffle": true,
      "timeLimitSec": 0,
      "pointsPerItem": 10,
      "attemptsAllowed": 0,
      "questionTimeSec": 0,
      "showExplanations": true
    },
    "content": {
      "pairs": [
        {
          "id": "p1",
          "left": "الوَغَى",
          "right": "الحرب"
        },
        {
          "id": "p2",
          "left": "السَّغَب",
          "right": "الجوع"
        },
        {
          "id": "p3",
          "left": "الوَجَل",
          "right": "الخوف"
        },
        {
          "id": "p4",
          "left": "الأنام",
          "right": "الناس"
        },
        {
          "id": "p5",
          "left": "الجَدْب",
          "right": "القحط وقلة المطر"
        },
        {
          "id": "p6",
          "left": "الدَّأْب",
          "right": "الجِدّ والمواظبة"
        }
      ],
      "leftLabel": "الكلمة",
      "rightLabel": "المعنى"
    }
  },
  {
    "id": "sample-antonyms-memory",
    "slug": "antonyms-memory",
    "title": "ذاكرة: الكلمة وعكسها",
    "description": "اقلب الكروت ولاقي كل كلمة مع عكسها بأقل عدد محاولات.",
    "type": "memory",
    "topic": "قراءة",
    "difficulty": 1,
    "item_count": 6,
    "cover_url": null,
    "settings": {
      "shuffle": true,
      "timeLimitSec": 0,
      "pointsPerItem": 10,
      "attemptsAllowed": 0,
      "questionTimeSec": 0,
      "showExplanations": true
    },
    "content": {
      "pairs": [
        {
          "a": "الصدق",
          "b": "الكذب",
          "id": "m1"
        },
        {
          "a": "الشجاعة",
          "b": "الجُبن",
          "id": "m2"
        },
        {
          "a": "الكرم",
          "b": "البخل",
          "id": "m3"
        },
        {
          "a": "العلم",
          "b": "الجهل",
          "id": "m4"
        },
        {
          "a": "النور",
          "b": "الظلام",
          "id": "m5"
        },
        {
          "a": "الأمل",
          "b": "اليأس",
          "id": "m6"
        }
      ]
    }
  },
  {
    "id": "sample-scramble-sentences",
    "slug": "scramble-sentences",
    "title": "رتّب الجملة",
    "description": "الكلمات متلخبطة، رتّبها عشان تطلع جملة صح.",
    "type": "scramble",
    "topic": "تعبير",
    "difficulty": 1,
    "item_count": 5,
    "cover_url": null,
    "settings": {
      "shuffle": true,
      "timeLimitSec": 0,
      "pointsPerItem": 10,
      "attemptsAllowed": 0,
      "questionTimeSec": 0,
      "showExplanations": true
    },
    "content": {
      "mode": "words",
      "items": [
        {
          "id": "r1",
          "hint": "جملتان اسميتان بينهما طباق",
          "answer": "العلمُ نورٌ والجهلُ ظلامٌ"
        },
        {
          "id": "r2",
          "hint": "حكمة عن الاجتهاد",
          "answer": "مَن جدَّ وجدَ ومَن زرعَ حصدَ"
        },
        {
          "id": "r3",
          "hint": "تشبيه مشهور",
          "answer": "الوقتُ كالسيفِ إن لم تقطعْهُ قطعَك"
        },
        {
          "id": "r4",
          "hint": "عن طلب العلم",
          "answer": "اطلبوا العلمَ من المهدِ إلى اللحدِ"
        },
        {
          "id": "r5",
          "hint": "مثل مشهور",
          "answer": "الصبرُ مفتاحُ الفرجِ"
        }
      ]
    }
  },
  {
    "id": "sample-fill-signs",
    "slug": "fill-signs",
    "title": "كمّل الفراغ: علامات الإعراب",
    "description": "اختار الكلمة المناسبة من بنك الكلمات وحطها في مكانها.",
    "type": "fill_blank",
    "topic": "نحو",
    "difficulty": 2,
    "item_count": 5,
    "cover_url": null,
    "settings": {
      "shuffle": true,
      "timeLimitSec": 0,
      "pointsPerItem": 10,
      "attemptsAllowed": 0,
      "questionTimeSec": 0,
      "showExplanations": true
    },
    "content": {
      "mode": "bank",
      "items": [
        {
          "id": "f1",
          "text": "يُرفع المثنى بـ[[الألف]] نيابة عن الضمة.",
          "explanation": "مثل: حضر الطالبان."
        },
        {
          "id": "f2",
          "text": "يُنصب جمع المؤنث السالم بـ[[الكسرة]] نيابة عن الفتحة.",
          "explanation": "مثل: كافأ المدير الطالباتِ."
        },
        {
          "id": "f3",
          "text": "تُرفع الأفعال الخمسة بـ[[ثبوت النون]].",
          "explanation": "مثل: أنتم تذاكرون."
        },
        {
          "id": "f4",
          "text": "يُجر الممنوع من الصرف بـ[[الفتحة]] نيابة عن الكسرة.",
          "explanation": "مثل: مررتُ بأحمدَ."
        },
        {
          "id": "f5",
          "text": "يُرفع جمع المذكر السالم بـ[[الواو]] ويُنصب ويُجر بـ[[الياء]].",
          "explanation": "مثل: نجح المعلمون، وشكرتُ المعلمين."
        }
      ],
      "distractors": [
        "الضمة",
        "حذف النون",
        "السكون"
      ],
      "ignoreDiacritics": true
    }
  },
  {
    "id": "sample-classify-irab",
    "slug": "classify-irab",
    "title": "صنّف: فاعل ولا مفعول به ولا مبتدأ؟",
    "description": "حط كل كلمة ملوّنة في المكان الصح حسب إعرابها.",
    "type": "classify",
    "topic": "نحو",
    "difficulty": 2,
    "item_count": 9,
    "cover_url": null,
    "settings": {
      "shuffle": true,
      "timeLimitSec": 0,
      "pointsPerItem": 10,
      "attemptsAllowed": 0,
      "questionTimeSec": 0,
      "showExplanations": true
    },
    "content": {
      "items": [
        {
          "id": "c1",
          "text": "كتبَ «الطالبُ» الدرسَ",
          "bucketId": "b1"
        },
        {
          "id": "c2",
          "text": "كتبَ الطالبُ «الدرسَ»",
          "bucketId": "b2"
        },
        {
          "id": "c3",
          "text": "«السماءُ» صافيةٌ",
          "bucketId": "b3"
        },
        {
          "id": "c4",
          "text": "ظهرَ «القمرُ»",
          "bucketId": "b1"
        },
        {
          "id": "c5",
          "text": "قرأتُ «الكتابَ»",
          "bucketId": "b2"
        },
        {
          "id": "c6",
          "text": "«الصبرُ» مفتاحُ الفرجِ",
          "bucketId": "b3"
        },
        {
          "id": "c7",
          "text": "يحبُّ «المعلمُ» طلابَه",
          "bucketId": "b1"
        },
        {
          "id": "c8",
          "text": "شربَ الطفلُ «اللبنَ»",
          "bucketId": "b2"
        },
        {
          "id": "c9",
          "text": "«العلمُ» نورٌ",
          "bucketId": "b3"
        }
      ],
      "buckets": [
        {
          "id": "b1",
          "label": "فاعل"
        },
        {
          "id": "b2",
          "label": "مفعول به"
        },
        {
          "id": "b3",
          "label": "مبتدأ"
        }
      ]
    }
  },
  {
    "id": "sample-wordsearch-balagha",
    "slug": "wordsearch-balagha",
    "title": "دوّر على الكلمة: فنون البلاغة",
    "description": "فيه ٧ كلمات من البلاغة مستخبية في الجدول، لاقيهم كلهم.",
    "type": "word_search",
    "topic": "بلاغة",
    "difficulty": 1,
    "item_count": 7,
    "cover_url": null,
    "settings": {
      "shuffle": true,
      "timeLimitSec": 240,
      "pointsPerItem": 10,
      "attemptsAllowed": 0,
      "questionTimeSec": 0,
      "showExplanations": true
    },
    "content": {
      "size": 10,
      "words": [
        "تشبيه",
        "استعارة",
        "كناية",
        "طباق",
        "مقابلة",
        "جناس",
        "سجع"
      ],
      "directions": "easy"
    }
  },
  {
    "id": "sample-puzzle-magdak",
    "slug": "puzzle-magdak",
    "title": "ركّبها: اصنع مجدك بيدك",
    "description": "بدّل القطع لحد ما رسمة «اصنع مجدك بيدك» تتركب. ٨ قطع بس، وريني هتخلّصها في كام حركة!",
    "type": "puzzle",
    "topic": "تحفيز",
    "difficulty": 1,
    "item_count": 8,
    "cover_url": null,
    "settings": {
      "shuffle": true,
      "timeLimitSec": 0,
      "pointsPerItem": 10,
      "attemptsAllowed": 0,
      "questionTimeSec": 0,
      "showExplanations": true
    },
    "content": {
      "image": "/assets/poster-asna3-magdak.jpg",
      "width": 709,
      "height": 1512,
      "cols": 2,
      "rows": 4,
      "caption": "اصنع مجدك بيدك"
    }
  },
  {
    "id": "sample-puzzle-magdak-hard",
    "slug": "puzzle-magdak-hard",
    "title": "ركّبها الصعبة: اصنع مجدك بيدك",
    "description": "نفس الرسمة بس متقطّعة ١٨ قطعة. عايزة تركيز وصبر!",
    "type": "puzzle",
    "topic": "تحفيز",
    "difficulty": 3,
    "item_count": 18,
    "cover_url": null,
    "settings": {
      "shuffle": true,
      "timeLimitSec": 0,
      "pointsPerItem": 5,
      "attemptsAllowed": 0,
      "questionTimeSec": 0,
      "showExplanations": true
    },
    "content": {
      "image": "/assets/poster-asna3-magdak.jpg",
      "width": 709,
      "height": 1512,
      "cols": 3,
      "rows": 6,
      "caption": "اصنع مجدك بيدك"
    }
  }
];

export function getSample(slug: string): PlayableGame | undefined {
  return SAMPLE_GAMES.find((g) => g.slug === slug);
}
