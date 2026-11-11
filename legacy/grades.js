(function(){
  var quotes=["حلِّق حتَّى تعانقَ النجوم", "الحلمُ لا يعرفُ المستحيل", "مُصدِّقُ نفسِهِ يَصِلُ", "أخبرِ العالمَ مَن أنت", "يليقُ باسمِكَ السماء", "القمة قرار والنجاح إصرار", "المجدُ لمن يجرؤ", "﴿وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ﴾ (الضحى: ٥)", "الاستمرارية تصنع المستحيل", "لا تحلم بنجم، احلم بالمجرّة", "كن مضيئًا لنفسِك", "عقيدةُ الحالمين الصمود", "لا تخذل نفسك", "اعصِ هواكَ لتنالَ مُناك", "كن أثرًا طيّبًا", "لا ترتدِ ثوبَ الاستسلام؛ فثوبُ العزيمةِ أليقُ بك.", "أبحِرْ؛ فاليأسُ هو الغرق.", "الأملُ مِجدافُك، والعزيمةُ شِراعُك؛ فأبحِر.", "لا تُطفئ شمعةَ حلمِك بأنفاسِ اليأس.", "اغرسْ تعبَك اليوم، تحصدْ فرحتَك غدًا.", "اجعلْ من عثرتِك سُلَّمًا لا قبرًا.", "النجاحُ ثمرةٌ لا يقطفُها إلا الصابرون.", "الحلمُ يطرقُ بابَ مَن سهِرَ له.", "تذكّرْ أن الفجرَ يُولَدُ من رَحِمِ الليل.", "مَن صعِدَ جبلَ التعب، رأى سهلَ النجاح.", "اكتبْ حلمَك بحبرِ الاجتهاد.", "الطريقُ إلى القمةِ لا يعرفُ المصاعد."];
  var now=new Date();var day=Math.floor(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())/86400000);
  document.getElementById('dailyQuote').textContent=quotes[day%quotes.length];
  var items=[
    {label:'مسابقات',desc:'نافس زمايلك، وخش لوحة الشرف.',bg:'#7A2A3A',fg:'#FFFFFF'},
    {label:'ألعاب',desc:'اتعلم العربي وإنت بتلعب.',bg:'#E8C46F',fg:'#2E2E30'},
    {label:'ع السريع',desc:'١٠ أسئلة، وبعد كل سؤال تحليل يقولك مشكلتك فين.',bg:'#F4E6CF',fg:'#2E2E30',href:'https://tahadi-team-hamthalah.vercel.app/'},
    {label:'نصايح',desc:'نصايح من التيم هتسهّل عليك.',bg:'#1F6FB5',fg:'#FFFFFF'},
    {label:'فيديوهات تحفيزية',desc:'فيديوهات من التيم هتفرق معاك.',bg:'#E8C46F',fg:'#2E2E30'},
    {label:'سؤال اليوم',desc:'سؤال واحد، يتحل في ١٠ ثواني.',bg:'#F4E6CF',fg:'#2E2E30'}
  ];
  var n=items.length,step=360/n,wheel=document.getElementById('wheel');
  wheel.style.background='conic-gradient('+items.map(function(it,i){return it.bg+' '+(i*step)+'deg '+((i+1)*step)+'deg';}).join(', ')+')';
  items.forEach(function(it,i){var s=document.createElement('span');s.className='seg';s.textContent=it.label;s.style.color=it.fg;s.style.transform='translate(-50%, -50%) rotate('+(i*step+step/2)+'deg) translateY(calc(min(400px, 82vw) * -0.31))';wheel.appendChild(s);});
  var angle=0,spinning=false,btn=document.getElementById('spinBtn'),res=document.getElementById('result');
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  btn.addEventListener('click',function(){
    if(spinning)return;spinning=true;btn.disabled=true;btn.textContent='بتلف...';res.hidden=true;
    var idx=Math.floor(Math.random()*n);var target=((-(idx*step+step/2))%360+360)%360;var cur=((angle%360)+360)%360;
    angle+=360*5+((target-cur)+360)%360;wheel.style.transform='rotate('+angle+'deg)';
    setTimeout(function(){spinning=false;btn.disabled=false;btn.textContent='لف تاني';
      document.getElementById('rName').textContent=items[idx].label;document.getElementById('rDesc').textContent=items[idx].desc;
      var go=document.getElementById('rGo');if(items[idx].href){go.href=items[idx].href;go.target='_blank';go.rel='noopener';}else{go.href='#';go.removeAttribute('target');}
      go.dataset.soon=items[idx].href?'':'1';res.hidden=false;},reduce?50:4300);
  });
  var toast=document.getElementById('toast'),tt;
  function showToast(m){toast.textContent=m;toast.classList.add('show');clearTimeout(tt);tt=setTimeout(function(){toast.classList.remove('show');},2600);}
  document.getElementById('rGo').addEventListener('click',function(e){if(this.dataset.soon==='1'){e.preventDefault();showToast('الجزء ده تحت التجهيز، وقريب هيبقى موجود');}});
  Array.prototype.forEach.call(document.querySelectorAll('.gp-card'),function(c){c.addEventListener('click',function(){showToast('صفحة طلاب '+c.dataset.grade+' تحت التجهيز، وقريب هتبقى موجودة');});});
})();
