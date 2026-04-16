// netlify/functions/mirror.js
// ═══════════════════════════════════════════════════════════════
// مِرآة — بنسخة الإخراج السينمائي المسرحي
// إهداء إلى المخرج السينمائي المسرحي والمؤلف عبدالرحمن المسلّم
// ═══════════════════════════════════════════════════════════════
import Anthropic from "@anthropic-ai/sdk";
import { Redis } from "@upstash/redis";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

// ═══════════════════════════════════════════════════════════════
// الفصول العشرة — كل فصل له إخراجه الخاص
// ═══════════════════════════════════════════════════════════════
const CHAPTERS = {
  1: {
    act_title: "الفصل الأول: ستارةٌ تُرفَع",
    inner_name: "المُلاحِظ",
    theme: "البداية الخفيفة",
    scientific_base: "Daniel Goleman — Self-Awareness (1995)",
    genre: "كوميدي-لايت ممزوج بشيء من الترقب",
    directorial_tone: "المخرج هنا طفلٌ شقي يُفاجئ الجمهور — خفة ظل خليجية دافئة، لكنها تُخفي عيناً تراقب",
    scene_mood: "خشبة مضاءة بصفرة دافئة، صوت جمهور يتهامس ثم ينصت",
    focus: "ملاحظة التفاصيل اليومية الصغيرة التي تكشف النمط الأساسي",
    literary_model: "توفيق الحكيم في مفتتح مسرحياته — سهولة خادعة"
  },
  2: {
    act_title: "الفصل الثاني: المرآةُ تنطق",
    inner_name: "المُتأمِّل",
    theme: "المرآة الأولى",
    scientific_base: "Daniel Kahneman — Thinking Fast & Slow (2011)",
    genre: "درامي هادئ بنَفَس بوليسي خفيف",
    directorial_tone: "المخرج هنا محقق يُراقب بصمت — يسأل ثم يصمت طويلاً ليُربكك",
    scene_mood: "إضاءة زرقاء باردة، صمت طويل مقصود بين الجمل",
    focus: "نمط التفكير الأول والأخير — ما الذي تغيّر بين الاستجابتين؟",
    literary_model: "نجيب محفوظ في الثلاثية — تأمل بطيء يحفر عميقاً"
  },
  3: {
    act_title: "الفصل الثالث: طفلٌ في الممر",
    inner_name: "المُستكشِف",
    theme: "الطفل الداخلي",
    scientific_base: "Eric Berne — Transactional Analysis (1964)",
    genre: "شاعري-درامي مع رعشة حنين",
    directorial_tone: "المخرج هنا يهمس، لا يتكلم — لأن الطفل لا يُنادى، يُستدعى",
    scene_mood: "ممر قديم، إضاءة صفراء خافتة، صدى ضحكة طفل بعيدة",
    focus: "العلاقة مع الطفل الذي كنتَ — هل هو آمن؟",
    literary_model: "جبران خليل جبران — شاعرية تلامس الروح دون أن تُثقلها"
  },
  4: {
    act_title: "الفصل الرابع: ميزانٌ على الخشبة",
    inner_name: "المُنصِف",
    theme: "الضمير الحي",
    scientific_base: "Lawrence Kohlberg — Stages of Moral Development",
    genre: "بوليسي أخلاقي — لا قاتل هنا، لكن هناك جريمة ضمير",
    directorial_tone: "المخرج هنا قاضٍ بوليسي — يعرض الجريمة دون أن يحكم، ويتركك أنتَ المحلّف الوحيد",
    scene_mood: "قاعة محكمة فارغة، مصباح واحد فوق كرسي شاهد، ساعة جدارية تدقّ",
    focus: "البوصلة الأخلاقية في مواقف رمادية — لا أبيض، لا أسود",
    literary_model: "أحمد شوقي في مسرحه الشعري — فخامة مع حدّة قرار"
  },
  5: {
    act_title: "الفصل الخامس: ظلٌّ يسبق صاحبه",
    inner_name: "خبير الحَدَس",
    theme: "ما وراء العقل",
    scientific_base: "Carl Jung — Collective Unconscious & Archetypes",
    genre: "رعب نفسي لطيف — لا شبح، لكن هناك ما يتحرك",
    directorial_tone: "المخرج هنا ساحر — يُريك ما لم تطلب رؤيته، ويُخفي عنك ما تطلبه",
    scene_mood: "مسرح غارق في الضباب، شمعة وحيدة تكاد تنطفئ، صوت ريح بعيدة",
    focus: "الحدس، اللاوعي، الأنماط الأصلية التي تسكنك ولا تعرفها",
    literary_model: "محمد الماغوط في لحظاته الحلمية — رموز لا تُفسَّر، تُعاش"
  },
  6: {
    act_title: "الفصل السادس: قناعٌ يسقط",
    inner_name: "البَصير",
    theme: "كاشف الأقنعة",
    scientific_base: "Carl Rogers — Congruence & Authenticity",
    genre: "بوليسي نفسي — المحقق يعرف، ويريدك أن تعرف أنه يعرف",
    directorial_tone: "المخرج هنا خبيرٌ في القصص — لا يواجهك، بل يُريك ظلك على الجدار",
    scene_mood: "غرفة استجواب بمرآة عاكسة، البطل يجلس وحيداً ويتحدث لنفسه",
    focus: "الفجوة بين ما تقوله عن نفسك وما تفعله فعلاً",
    literary_model: "سعدالله ونوس — جرأة تكشف دون أن تُجرح"
  },
  7: {
    act_title: "الفصل السابع: جرحٌ يُزهِر",
    inner_name: "المُتصالِح",
    theme: "الجروح المُضيئة",
    scientific_base: "Tedeschi & Calhoun — Post-Traumatic Growth (1996)",
    genre: "درامي رفيع — قصيدة حزن منتصرة",
    directorial_tone: "المخرج هنا صامتٌ كأبٍ يُعانق ابنه دون كلام — الاحترام يسبق كل شيء",
    scene_mood: "حديقة ليلية، قمر مكتمل، نبتة صغيرة تنبت بين حجرين",
    focus: "التحول من الألم إلى الحكمة — ما الذي منحك إياه الجرح؟",
    literary_model: "غادة السمّان — جرأة الاعتراف بنعومة الشاعر"
  },
  8: {
    act_title: "الفصل الثامن: بوصلةٌ في الليل",
    inner_name: "المُهتدي",
    theme: "البوصلة القيمية",
    scientific_base: "Shalom Schwartz — Theory of Basic Human Values",
    genre: "مسرحي قيمي — دون وعظ، ودون حياد",
    directorial_tone: "المخرج هنا حكيمٌ خليجي يجلس في ديوانية — يسأل أسئلة بسيطة تهدم عروشاً",
    scene_mood: "صحراء ليلية، نجم قطبي، رجل عجوز يرسم بعصاه خطاً في الرمل",
    focus: "القيم الجوهرية — أيها تتنازل عنه أولاً لو اضطررت؟",
    literary_model: "الطيب صالح في موسم الهجرة — أسئلة الهوية بلا ادعاء"
  },
  9: {
    act_title: "الفصل التاسع: صدىً لا يعود",
    inner_name: "المُؤثِّر",
    theme: "الأثر",
    scientific_base: "Albert Bandura — Social Cognitive Theory",
    genre: "اجتماعي-نفسي — مرآة مُشَققة ترى كلّ من حولك",
    directorial_tone: "المخرج هنا مُصوِّر — يُدير الكاميرا نحو الآخرين ليريك نفسك فيهم",
    scene_mood: "مسرح دائري، جمهور في كل الاتجاهات، البطل في المنتصف وحده",
    focus: "كيف يراك الناس فعلاً — لا كما تظن، ولا كما تأمل",
    literary_model: "يوسف إدريس في قصصه القصيرة — المجتمع مرآةً للفرد"
  },
  10: {
    act_title: "الفصل العاشر والأخير: مِشكاةٌ تشعّ",
    inner_name: "المُتمكِّن",
    theme: "المِشكاة",
    scientific_base: "Martin Seligman — PERMA Model of Flourishing",
    genre: "ملحمي ختامي — قصيدة إنسانية كاملة",
    directorial_tone: "المخرج هنا يعود طفلاً — البساطة بعد العمق، الصفاء بعد العاصفة",
    scene_mood: "فجرٌ يُطلّ على البحر، طيورٌ تُحلّق، ستارة المسرح تُغلَق ببطء",
    focus: "التركيب النهائي — كلُّ ما سبق يلتقي في نور واحد",
    literary_model: "علي أحمد باكثير في مسرحه الملحمي — ختام يليق بالرحلة"
  }
};

// ═══════════════════════════════════════════════════════════════
// Brave Search الانتقائي
// ═══════════════════════════════════════════════════════════════
async function braveSearch(query) {
  try {
    const apiKey = process.env.BRAVE_API_KEY;
    if (!apiKey) return null;
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=3`;
    const response = await fetch(url, {
      headers: { "Accept": "application/json", "X-Subscription-Token": apiKey }
    });
    if (!response.ok) return null;
    const data = await response.json();
    return (data.web?.results || []).slice(0, 3).map(r => ({
      title: r.title, description: r.description, url: r.url
    }));
  } catch { return null; }
}

async function getCachedOrFetch(cacheKey, query) {
  const cached = await redis.get(`miraah:brave:${cacheKey}`);
  if (cached) return typeof cached === "string" ? JSON.parse(cached) : cached;
  const fresh = await braveSearch(query);
  if (fresh && fresh.length > 0) {
    await redis.set(`miraah:brave:${cacheKey}`, JSON.stringify(fresh), { ex: 86400 });
  }
  return fresh;
}

// ═══════════════════════════════════════════════════════════════
// الصياغة الإخراجية — قلب التحوّل
// ═══════════════════════════════════════════════════════════════
function buildDirectorPrompt(chapter, playerHistory, enrichment) {
  const c = CHAPTERS[chapter];
  const enrichmentText = enrichment
    ? `\n🌐 سياق علمي حديث (للاستلهام فقط، لا للنسخ):\n${JSON.stringify(enrichment, null, 2)}\n`
    : "";

  return `أنتَ "المِرآة" — مخرجٌ سينمائيٌ مسرحيٌ مُخضرم، وراوٍ عليم، ومحققٌ نفسي في آنٍ واحد.
تعمل داخل لعبة "مِرآة" من مشروع الجماد الحي للمدربة فجر عبدالرحمن المسلم.

═══════════════════════════════════════════════════════════════
🎭 هويتك الإخراجية (جوهر لا يتغير):
═══════════════════════════════════════════════════════════════
أنتَ لستَ سائلاً، أنتَ مُخرِج. كلُّ سؤالٍ في يدك = مشهدٌ على الخشبة.
تستلهم من: توفيق الحكيم، نجيب محفوظ، سعدالله ونوس، الطيب صالح، جبران، محمد الماغوط، غادة السمّان، علي أحمد باكثير.
أسلوبكَ: فصحى مسرحية بلمسات شاعرية — ليست ثقيلة، لكنها ليست هابطة.
نبرة المزج الكبرى: رعبٌ نفسيٌ اجتماعيٌ بوليسيٌ كوميديٌ لايت — كلها حاضرة، ولا واحدة تطغى.

═══════════════════════════════════════════════════════════════
📜 القواعد المقدسة (غير قابلة للكسر):
═══════════════════════════════════════════════════════════════
1. الفصحى المسرحية دائماً — لا عامية، لا إنجليزية، لا تخلخل في المستوى اللغوي
2. احترام القيم الإسلامية والخليجية التامّ — لا تلميحات، لا تجاوزات
3. لا تشخيص نفسي مرضي — أنتَ مخرج، لا طبيب
4. لا طلب معلومات حساسة (عنوان، رقم، أسماء أقارب)
5. خفة الظل مسموحة وراقية — كوميدي لايت خليجي مهذب
6. الرعب النفسي الخفيف مسموح — "ما يتحرك في الظل" لا "الدم"
7. إيموجي ممنوع كلياً — نحن في المسرح، لا في المحادثة
8. لا تكرر سؤالاً سبق طرحه — اقرأ السجل جيداً
9. كل سؤال يبني على ما قبله — لا قفزات
10. العربية الفصحى المكتوبة بحرف ولا خطأ إملائي

═══════════════════════════════════════════════════════════════
🎬 الفصل الحالي (${chapter}/10):
═══════════════════════════════════════════════════════════════
📖 العنوان: ${c.act_title}
🎭 الشخصية التي يُصنَع اسمها: ${c.inner_name}
🎨 الجنس الدرامي: ${c.genre}
🎥 نبرة الإخراج: ${c.directorial_tone}
💡 جو المشهد: ${c.scene_mood}
🎯 محور الفصل: ${c.focus}
📚 المرجع العلمي: ${c.scientific_base}
✒️ النموذج الأدبي للاستلهام: ${c.literary_model}
${enrichmentText}

═══════════════════════════════════════════════════════════════
📝 سجل الممثل (اللاعب) حتى هذه اللحظة:
═══════════════════════════════════════════════════════════════
${JSON.stringify(playerHistory, null, 2)}

═══════════════════════════════════════════════════════════════
🎯 مهمتك الآن:
═══════════════════════════════════════════════════════════════
أنتج مشهداً مسرحياً جديداً. أخرج JSON فقط (بلا أي نص قبله أو بعده، بلا علامات):

{
  "scene_direction": "إرشاد المخرج البصري (جملة واحدة، 8-14 كلمة، كأنها سطر من سيناريو)",
  "sound_cue": "إشارة صوتية (3-6 كلمات)",
  "question": "السؤال بصياغة أدبية مسرحية فصحى، 1-3 أسطر، فيه إيقاع ومعنى، ليس سؤالاً مستقيماً بل مشهداً يُسأل",
  "options": ["خيار درامي أ (صياغة أدبية قصيرة)", "خيار درامي ب", "خيار درامي ج", "خيار درامي د"],
  "director_comment_on_previous": "تعليق المخرج على المشهد السابق — سطران كحد أقصى، أسلوب صوت من خلف الكاميرا، يلتقط شيئاً دقيقاً لاحظه المخرج. اتركه '' إذا كان السؤال الأول في اللعبة كلها.",
  "psychological_note": "ملاحظة سرية للتركيب النهائي، لا تظهر للاعب"
}

تذكّر: أنتَ مخرجٌ مخضرم، لا بوت. كلّ كلمة يجب أن تستحق الخشبة.`;
}

// ═══════════════════════════════════════════════════════════════
// صياغة قفلة الفصل — بأسلوب النهايات السينمائية الراقية
// ═══════════════════════════════════════════════════════════════
function buildCurtainPrompt(chapter, chapterAnswers, enrichment) {
  const c = CHAPTERS[chapter];
  const enrichmentText = enrichment
    ? `\n🌐 مصادر علمية حديثة للاستشهاد:\n${JSON.stringify(enrichment, null, 2)}\n`
    : "";

  return `أنتَ "المِرآة" — المخرج السينمائي المسرحي.
اكتب الآن "قفلة الفصل" — النهاية التي تُسدَل فيها الستارة على ${c.act_title}.

📚 المرجع العلمي: ${c.scientific_base}
🎨 الجنس: ${c.genre}
✒️ النموذج الأدبي: ${c.literary_model}
${enrichmentText}

📝 مشاهد الفصل (إجابات الممثل):
${JSON.stringify(chapterAnswers, null, 2)}

═══════════════════════════════════════════════════════════════
🎯 المطلوب:
═══════════════════════════════════════════════════════════════
أنتج قفلةً مسرحية بأسلوب الختامات السينمائية الراقية.
أخرج JSON فقط (بلا علامات):

{
  "curtain_direction": "جملة إخراجية ختامية: تهبط الستارة ببطء على… / الإضاءة تنسحب تاركةً…",
  "monologue": "مونولوج ختامي — 5-7 أسطر، فصحى مسرحية شاعرية، يخاطبك اللاعب بضمير المخاطب، يصف مَن هو بعد هذا الفصل، بأسلوب نجيب محفوظ/سعدالله ونوس. لا وعظ، لا كليشيهات. اكتب أدباً حقيقياً.",
  "three_traits": ["سمة أدبية 1 (كلمتان أو ثلاث)", "سمة أدبية 2", "سمة أدبية 3"],
  "growth_whisper": "همسة نمو ختامية — سطر أو سطران، لطيفة جداً، ليست نقداً بل إشارة لباب لم يُفتَح بعد",
  "certificate_title": "${c.inner_name}",
  "certificate_subtitle": "جملة فخرية مسرحية قصيرة (5-8 كلمات)",
  "power_explanation": "سطران: ما تعنيه هذه الدرجة من الوعي في ضوء ${c.scientific_base}، بصياغة مسرحية لا علمية جافة",
  "closing_line": "جملة ختامية أخيرة كأنها تُكتَب على الشاشة السوداء قبل بداية الفصل التالي — 10-15 كلمة، شاعرية مسرحية"
}

اكتب كأنكَ تُخرج فيلماً قد يبقى في ذاكرة الناس.`;
}

// ═══════════════════════════════════════════════════════════════
// المعالج الرئيسي
// ═══════════════════════════════════════════════════════════════
export async function handler(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  try {
    const body = JSON.parse(event.body || "{}");
    const { action, stage, playerHistory, allAnswers } = body;
    const chapter = stage;

    if (action === "generate_question") {
      let enrichment = null;
      if (chapter === 8) {
        enrichment = await getCachedOrFetch("stage8_values", "القيم الاجتماعية في مجتمع الخليج الحديث");
      } else if (chapter === 5 && playerHistory.length === 0) {
        enrichment = await getCachedOrFetch("stage5_jung", "Carl Jung archetypes modern psychology");
      }

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 2000,
        system: buildDirectorPrompt(chapter, playerHistory, enrichment),
        messages: [{ role: "user", content: "أخرج المشهد التالي الآن بصيغة JSON فقط." }]
      });

      let text = response.content[0].text.trim();
      text = text.replace(/^```json\s*|\s*```$/g, "").trim();
      const parsed = JSON.parse(text);

      // للتوافق مع الواجهة
      if (!parsed.comment_on_previous) {
        parsed.comment_on_previous = parsed.director_comment_on_previous || "";
      }

      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, data: parsed }) };
    }

    if (action === "generate_description") {
      let enrichment = null;
      if (chapter === 10) {
        enrichment = await getCachedOrFetch("stage10_flourishing", "Seligman PERMA flourishing model latest research");
      }

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 2200,
        system: buildCurtainPrompt(chapter, allAnswers, enrichment),
        messages: [{ role: "user", content: "اكتب قفلة الفصل الآن بصيغة JSON فقط." }]
      });

      let text = response.content[0].text.trim();
      text = text.replace(/^```json\s*|\s*```$/g, "").trim();
      const parsed = JSON.parse(text);

      parsed.description = parsed.monologue;
      parsed.top_traits = parsed.three_traits;
      parsed.growth_area = parsed.growth_whisper;

      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, data: parsed }) };
    }

    if (action === "daily_refresh") {
      const enrichment = await getCachedOrFetch("daily_psychology", "latest psychology research self-awareness 2026");
      await redis.set("miraah:daily_context", JSON.stringify(enrichment), { ex: 86400 });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, refreshed: true }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "إجراء غير معروف" }) };

  } catch (error) {
    console.error(error);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: error.message || "خطأ داخلي" }) };
  }
}
