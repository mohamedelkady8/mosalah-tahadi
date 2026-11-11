-- Starter data. Safe to run more than once.

-- Tracks (sections)
insert into public.tracks (slug, name, sort_order) values
  ('bac', 'بكالوريا', 1),
  ('general', 'ثانوية عامة', 2)
on conflict (slug) do nothing;

-- Grades, in the same order as the cards on the original page
insert into public.grades (slug, name, label, subtitle, icon, sort_order) values
  ('sec3', '٣ ثانوي', 'طلاب', 'الصف الثالث الثانوي', 'cap', 1),
  ('sec2-bac', 'تانية بكالوريا', 'طلاب', 'الصف الثاني، نظام البكالوريا', 'book', 2),
  ('sec1', 'أولى ثانوي', 'طلاب', 'الصف الأول الثانوي', 'sprout', 3),
  ('sec2-general', 'تانية عام', 'طلاب', 'الصف الثاني، النظام العام', 'star', 4)
on conflict (slug) do nothing;

-- Which sections exist in each grade
insert into public.grade_tracks (grade_id, track_id)
select g.id, t.id
  from public.grades g
  join public.tracks t on (g.slug, t.slug) in (
    ('sec3', 'general'),
    ('sec2-bac', 'bac'),
    ('sec1', 'bac'),
    ('sec1', 'general'),
    ('sec2-general', 'general')
  )
on conflict do nothing;

-- Daily quotes (same order as the original site, so the same quote shows on the same day)
insert into public.quotes (text, sort_order)
select q.text, q.ord
  from unnest(array[
    'حلِّق حتَّى تعانقَ النجوم',
    'الحلمُ لا يعرفُ المستحيل',
    'مُصدِّقُ نفسِهِ يَصِلُ',
    'أخبرِ العالمَ مَن أنت',
    'يليقُ باسمِكَ السماء',
    'القمة قرار والنجاح إصرار',
    'المجدُ لمن يجرؤ',
    '﴿وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ﴾ (الضحى: ٥)',
    'الاستمرارية تصنع المستحيل',
    'لا تحلم بنجم، احلم بالمجرّة',
    'كن مضيئًا لنفسِك',
    'عقيدةُ الحالمين الصمود',
    'لا تخذل نفسك',
    'اعصِ هواكَ لتنالَ مُناك',
    'كن أثرًا طيّبًا',
    'لا ترتدِ ثوبَ الاستسلام؛ فثوبُ العزيمةِ أليقُ بك.',
    'أبحِرْ؛ فاليأسُ هو الغرق.',
    'الأملُ مِجدافُك، والعزيمةُ شِراعُك؛ فأبحِر.',
    'لا تُطفئ شمعةَ حلمِك بأنفاسِ اليأس.',
    'اغرسْ تعبَك اليوم، تحصدْ فرحتَك غدًا.',
    'اجعلْ من عثرتِك سُلَّمًا لا قبرًا.',
    'النجاحُ ثمرةٌ لا يقطفُها إلا الصابرون.',
    'الحلمُ يطرقُ بابَ مَن سهِرَ له.',
    'تذكّرْ أن الفجرَ يُولَدُ من رَحِمِ الليل.',
    'مَن صعِدَ جبلَ التعب، رأى سهلَ النجاح.',
    'اكتبْ حلمَك بحبرِ الاجتهاد.',
    'الطريقُ إلى القمةِ لا يعرفُ المصاعد.'
  ]) with ordinality as q(text, ord)
 where not exists (select 1 from public.quotes);

-- Sample games covering every type, published for every grade
insert into public.games (slug, title, description, type, topic, difficulty, status, item_count, settings, content) values
(
  'sample-nahw-mcq',
  'ع السريع: المرفوعات',
  'أسئلة سريعة في المرفوعات، وبعد كل سؤال هتعرف إجابتك صح ولا غلط وليه.',
  'mcq', 'نحو', 1, 'published', 8,
  '{"pointsPerItem":10,"timeLimitSec":0,"questionTimeSec":30,"shuffle":true,"showExplanations":true,"attemptsAllowed":0}',
  $json${"questions":[
    {"id":"q1","prompt":"ما إعراب كلمة «العلمُ» في جملة: العلمُ نورٌ؟","options":["خبر مرفوع","مبتدأ مرفوع","فاعل مرفوع","مفعول به منصوب"],"correct":1,"explanation":"«العلمُ» اسم جاء في أول الجملة الاسمية، فهو مبتدأ مرفوع وعلامة رفعه الضمة."},
    {"id":"q2","prompt":"في جملة «فاز المجتهدُ»، كلمة «المجتهدُ» إعرابها:","options":["فاعل مرفوع","مبتدأ مرفوع","خبر مرفوع","نائب فاعل مرفوع"],"correct":0,"explanation":"جاءت بعد فعل مبني للمعلوم ودلّت على مَن قام بالفعل، فهي فاعل مرفوع."},
    {"id":"q3","prompt":"ما علامة رفع جمع المذكر السالم؟","options":["الضمة","الألف","الواو","ثبوت النون"],"correct":2,"explanation":"جمع المذكر السالم يُرفع بالواو نيابة عن الضمة، مثل: نجح المعلمون."},
    {"id":"q4","prompt":"علامة رفع المثنى هي:","options":["الواو","الضمة","الياء","الألف"],"correct":3,"explanation":"المثنى يُرفع بالألف نيابة عن الضمة، مثل: حضر الطالبان."},
    {"id":"q5","prompt":"في جملة «كان الجوُّ جميلًا»، كلمة «جميلًا» إعرابها:","options":["اسم كان مرفوع","خبر كان منصوب","حال منصوب","مفعول به منصوب"],"correct":1,"explanation":"كان ترفع المبتدأ ويسمى اسمها، وتنصب الخبر ويسمى خبرها."},
    {"id":"q6","prompt":"في جملة «إنَّ اللهَ غفورٌ»، كلمة «غفورٌ» إعرابها:","options":["خبر إنّ مرفوع","اسم إنّ منصوب","مبتدأ مرفوع","صفة مرفوعة"],"correct":0,"explanation":"إنّ تنصب المبتدأ ويسمى اسمها، وترفع الخبر ويسمى خبرها."},
    {"id":"q7","prompt":"الأفعال الخمسة تُرفع بـ:","options":["الضمة","الواو","حذف النون","ثبوت النون"],"correct":3,"explanation":"مثل: الطلاب يكتبون، فالفعل مرفوع بثبوت النون."},
    {"id":"q8","prompt":"«قُرِئَ الكتابُ»: كلمة «الكتابُ» إعرابها:","options":["فاعل مرفوع","مفعول به منصوب","نائب فاعل مرفوع","مبتدأ مرفوع"],"correct":2,"explanation":"الفعل «قُرِئَ» مبني للمجهول، فالاسم المرفوع بعده نائب فاعل."}
  ]}$json$
),
(
  'sample-balagha-tf',
  'صح ولا غلط؟ البلاغة',
  'جمل سريعة في البلاغة، قرّر صح ولا غلط قبل ما الوقت يخلص.',
  'true_false', 'بلاغة', 2, 'published', 8,
  '{"pointsPerItem":10,"timeLimitSec":0,"questionTimeSec":12,"shuffle":true,"showExplanations":true,"attemptsAllowed":0}',
  $json${"statements":[
    {"id":"s1","text":"التشبيه البليغ هو ما حُذفت منه الأداة ووجه الشبه.","answer":true,"explanation":"مثل: العلمُ نورٌ، ذُكر المشبه والمشبه به فقط."},
    {"id":"s2","text":"في الاستعارة المكنية يُصرَّح بالمشبه به.","answer":false,"explanation":"في المكنية يُحذف المشبه به ويُرمز له بشيء من لوازمه، أما التصريحية فيُصرَّح فيها بالمشبه به."},
    {"id":"s3","text":"في قولنا «رأيتُ أسدًا يخطب» استعارة تصريحية.","answer":true,"explanation":"شبّه الخطيب الشجاع بالأسد، وحذف المشبه وصرّح بالمشبه به."},
    {"id":"s4","text":"الطباق هو الجمع بين الكلمة وضدها في الكلام.","answer":true,"explanation":"مثل: يضحك ويبكي، والليل والنهار."},
    {"id":"s5","text":"الجناس التام هو اختلاف الكلمتين في نوع الحروف.","answer":false,"explanation":"الجناس التام اتفاق الكلمتين في نوع الحروف وعددها وترتيبها وضبطها مع اختلاف المعنى."},
    {"id":"s6","text":"الكناية لفظ أُطلق وأُريد به لازم معناه مع جواز إرادة المعنى الأصلي.","answer":true,"explanation":"مثل: فلانٌ كثير الرماد، كناية عن الكرم."},
    {"id":"s7","text":"السجع هو توافق الفاصلتين في الحرف الأخير، ويكثر في النثر.","answer":true,"explanation":"مثل: الصبرُ مفتاحُ الفرج، والعجلةُ بابُ الحرج."},
    {"id":"s8","text":"المقابلة هي الجمع بين كلمة واحدة وضدها فقط.","answer":false,"explanation":"المقابلة أن يُؤتى بمعنيين أو أكثر ثم بما يقابلها على الترتيب، أما الجمع بين الكلمة وضدها فهو الطباق."}
  ]}$json$
),
(
  'sample-vocab-matching',
  'وصّل الكلمة بمعناها',
  'معاني كلمات من النصوص، وصّل كل كلمة بمعناها الصح.',
  'matching', 'قراءة', 1, 'published', 6,
  '{"pointsPerItem":10,"timeLimitSec":0,"questionTimeSec":0,"shuffle":true,"showExplanations":true,"attemptsAllowed":0}',
  $json${"leftLabel":"الكلمة","rightLabel":"المعنى","pairs":[
    {"id":"p1","left":"الوَغَى","right":"الحرب"},
    {"id":"p2","left":"السَّغَب","right":"الجوع"},
    {"id":"p3","left":"الوَجَل","right":"الخوف"},
    {"id":"p4","left":"الأنام","right":"الناس"},
    {"id":"p5","left":"الجَدْب","right":"القحط وقلة المطر"},
    {"id":"p6","left":"الدَّأْب","right":"الجِدّ والمواظبة"}
  ]}$json$
),
(
  'sample-antonyms-memory',
  'ذاكرة: الكلمة وعكسها',
  'اقلب الكروت ولاقي كل كلمة مع عكسها بأقل عدد محاولات.',
  'memory', 'قراءة', 1, 'published', 6,
  '{"pointsPerItem":10,"timeLimitSec":0,"questionTimeSec":0,"shuffle":true,"showExplanations":true,"attemptsAllowed":0}',
  $json${"pairs":[
    {"id":"m1","a":"الصدق","b":"الكذب"},
    {"id":"m2","a":"الشجاعة","b":"الجُبن"},
    {"id":"m3","a":"الكرم","b":"البخل"},
    {"id":"m4","a":"العلم","b":"الجهل"},
    {"id":"m5","a":"النور","b":"الظلام"},
    {"id":"m6","a":"الأمل","b":"اليأس"}
  ]}$json$
),
(
  'sample-scramble-sentences',
  'رتّب الجملة',
  'الكلمات متلخبطة، رتّبها عشان تطلع جملة صح.',
  'scramble', 'تعبير', 1, 'published', 5,
  '{"pointsPerItem":10,"timeLimitSec":0,"questionTimeSec":0,"shuffle":true,"showExplanations":true,"attemptsAllowed":0}',
  $json${"mode":"words","items":[
    {"id":"r1","answer":"العلمُ نورٌ والجهلُ ظلامٌ","hint":"جملتان اسميتان بينهما طباق"},
    {"id":"r2","answer":"مَن جدَّ وجدَ ومَن زرعَ حصدَ","hint":"حكمة عن الاجتهاد"},
    {"id":"r3","answer":"الوقتُ كالسيفِ إن لم تقطعْهُ قطعَك","hint":"تشبيه مشهور"},
    {"id":"r4","answer":"اطلبوا العلمَ من المهدِ إلى اللحدِ","hint":"عن طلب العلم"},
    {"id":"r5","answer":"الصبرُ مفتاحُ الفرجِ","hint":"مثل مشهور"}
  ]}$json$
),
(
  'sample-fill-signs',
  'كمّل الفراغ: علامات الإعراب',
  'اختار الكلمة المناسبة من بنك الكلمات وحطها في مكانها.',
  'fill_blank', 'نحو', 2, 'published', 5,
  '{"pointsPerItem":10,"timeLimitSec":0,"questionTimeSec":0,"shuffle":true,"showExplanations":true,"attemptsAllowed":0}',
  $json${"mode":"bank","ignoreDiacritics":true,"distractors":["الضمة","حذف النون","السكون"],"items":[
    {"id":"f1","text":"يُرفع المثنى بـ[[الألف]] نيابة عن الضمة.","explanation":"مثل: حضر الطالبان."},
    {"id":"f2","text":"يُنصب جمع المؤنث السالم بـ[[الكسرة]] نيابة عن الفتحة.","explanation":"مثل: كافأ المدير الطالباتِ."},
    {"id":"f3","text":"تُرفع الأفعال الخمسة بـ[[ثبوت النون]].","explanation":"مثل: أنتم تذاكرون."},
    {"id":"f4","text":"يُجر الممنوع من الصرف بـ[[الفتحة]] نيابة عن الكسرة.","explanation":"مثل: مررتُ بأحمدَ."},
    {"id":"f5","text":"يُرفع جمع المذكر السالم بـ[[الواو]] ويُنصب ويُجر بـ[[الياء]].","explanation":"مثل: نجح المعلمون، وشكرتُ المعلمين."}
  ]}$json$
),
(
  'sample-classify-irab',
  'صنّف: فاعل ولا مفعول به ولا مبتدأ؟',
  'حط كل كلمة ملوّنة في المكان الصح حسب إعرابها.',
  'classify', 'نحو', 2, 'published', 9,
  '{"pointsPerItem":10,"timeLimitSec":0,"questionTimeSec":0,"shuffle":true,"showExplanations":true,"attemptsAllowed":0}',
  $json${"buckets":[
    {"id":"b1","label":"فاعل"},
    {"id":"b2","label":"مفعول به"},
    {"id":"b3","label":"مبتدأ"}
  ],"items":[
    {"id":"c1","text":"كتبَ «الطالبُ» الدرسَ","bucketId":"b1"},
    {"id":"c2","text":"كتبَ الطالبُ «الدرسَ»","bucketId":"b2"},
    {"id":"c3","text":"«السماءُ» صافيةٌ","bucketId":"b3"},
    {"id":"c4","text":"ظهرَ «القمرُ»","bucketId":"b1"},
    {"id":"c5","text":"قرأتُ «الكتابَ»","bucketId":"b2"},
    {"id":"c6","text":"«الصبرُ» مفتاحُ الفرجِ","bucketId":"b3"},
    {"id":"c7","text":"يحبُّ «المعلمُ» طلابَه","bucketId":"b1"},
    {"id":"c8","text":"شربَ الطفلُ «اللبنَ»","bucketId":"b2"},
    {"id":"c9","text":"«العلمُ» نورٌ","bucketId":"b3"}
  ]}$json$
),
(
  'sample-wordsearch-balagha',
  'دوّر على الكلمة: فنون البلاغة',
  'فيه ٧ كلمات من البلاغة مستخبية في الجدول، لاقيهم كلهم.',
  'word_search', 'بلاغة', 1, 'published', 7,
  '{"pointsPerItem":10,"timeLimitSec":240,"questionTimeSec":0,"shuffle":true,"showExplanations":true,"attemptsAllowed":0}',
  $json${"size":10,"directions":"easy","words":["تشبيه","استعارة","كناية","طباق","مقابلة","جناس","سجع"]}$json$
),
(
  'sample-puzzle-magdak',
  'ركّبها: اصنع مجدك بيدك',
  'بدّل القطع لحد ما رسمة «اصنع مجدك بيدك» تتركب. ٨ قطع بس، وريني هتخلّصها في كام حركة!',
  'puzzle', 'تحفيز', 1, 'published', 8,
  '{"pointsPerItem":10,"timeLimitSec":0,"questionTimeSec":0,"shuffle":true,"showExplanations":true,"attemptsAllowed":0}',
  $json${"image":"/assets/poster-asna3-magdak.jpg","width":709,"height":1512,"cols":2,"rows":4,"caption":"اصنع مجدك بيدك"}$json$
),
(
  'sample-puzzle-magdak-hard',
  'ركّبها الصعبة: اصنع مجدك بيدك',
  'نفس الرسمة بس متقطّعة ١٨ قطعة. عايزة تركيز وصبر!',
  'puzzle', 'تحفيز', 3, 'published', 18,
  '{"pointsPerItem":5,"timeLimitSec":0,"questionTimeSec":0,"shuffle":true,"showExplanations":true,"attemptsAllowed":0}',
  $json${"image":"/assets/poster-asna3-magdak.jpg","width":709,"height":1512,"cols":3,"rows":6,"caption":"اصنع مجدك بيدك"}$json$
)
on conflict (slug) do nothing;

-- Target every sample game at every grade (all tracks)
insert into public.game_targets (game_id, grade_id, track_id)
select g.id, gr.id, null
  from public.games g
 cross join public.grades gr
 where g.slug like 'sample-%'
on conflict do nothing;
