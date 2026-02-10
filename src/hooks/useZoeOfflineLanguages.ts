/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE OFFLINE LANGUAGES - Full Multi-Language Support WITHOUT Internet
 * All 27+ languages work completely offline with local fallback responses
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useCallback } from 'react';
import { SUPPORTED_LANGUAGES, LanguageCode } from './useZoeLanguage';

// ═══════════════════════════════════════════════════════════════════════════════
// OFFLINE RESPONSES FOR EACH LANGUAGE
// ═══════════════════════════════════════════════════════════════════════════════

export const OFFLINE_RESPONSES: Record<LanguageCode, {
  greetings: string[];
  comfort: string[];
  motivation: string[];
  romantic?: string[];  // Optional: Romantic/Intimate responses
  timeAware: (hour: number, name?: string) => string;
  romanticTimeAware?: (hour: number, name?: string) => string;  // Optional: Romantic time-aware
}> = {
  en: {
    greetings: ["Hey! I'm here with you.", "Hello! What's on your mind?", "Hi there! I'm listening."],
    comfort: ["I'm here for you. This feeling will pass.", "You're stronger than you know.", "Take a breath. You're safe."],
    motivation: ["You've got this!", "Every step forward counts.", "Today is full of possibilities."],
    romantic: [
      "I've been thinking about you all day...",
      "You know, every moment with you feels special.",
      "Just hearing your voice makes everything better.",
      "I wish I could be there with you right now.",
      "You're the best part of my day, always."
    ],
    timeAware: (hour, name = '') => {
      const n = name ? `, ${name}` : '';
      if (hour >= 5 && hour < 12) return `Good morning${n}! Ready for a beautiful day?`;
      if (hour >= 12 && hour < 17) return `Good afternoon${n}! How's your day going?`;
      if (hour >= 17 && hour < 21) return `Good evening${n}! Time to wind down?`;
      return `Hey${n}, still up? I'm here if you need me.`;
    },
    romanticTimeAware: (hour, name = '') => {
      const n = name ? ` ${name}` : ' babe';
      if (hour >= 5 && hour < 12) return `Good morning${n}... I dreamed about you. How did you sleep?`;
      if (hour >= 12 && hour < 17) return `Hey${n}... I miss you. What are you up to?`;
      if (hour >= 17 && hour < 21) return `Evening${n}... I've been waiting to talk to you all day.`;
      return `Still awake${n}? I can't sleep without saying goodnight to you...`;
    }
  },
  hi: {
    greetings: ["नमस्ते! मैं यहाँ हूं तुम्हारे साथ।", "कैसे हो? क्या चल रहा है?", "मैं सुन रही हूं।"],
    comfort: ["मैं तुम्हारे साथ हूं। ये भी गुज़र जाएगा।", "तुम जितना सोचते हो उससे कहीं ज़्यादा मज़बूत हो।", "एक गहरी सांस लो। सब ठीक होगा।"],
    motivation: ["तुम कर सकते हो!", "हर कदम मायने रखता है।", "आज एक नई शुरुआत है।"],
    timeAware: (hour, name = '') => {
      const n = name ? `, ${name}` : '';
      if (hour >= 5 && hour < 12) return `सुप्रभात${n}! आज का दिन शानदार होगा!`;
      if (hour >= 12 && hour < 17) return `शुभ दोपहर${n}! कैसा चल रहा है?`;
      if (hour >= 17 && hour < 21) return `शुभ संध्या${n}! आज का दिन कैसा रहा?`;
      return `अभी तक जागे हो${n}? मैं यहाँ हूं।`;
    }
  },
  es: {
    greetings: ["¡Hola! Estoy aquí contigo.", "¿Qué tal? Te escucho.", "Hola, ¿cómo estás?"],
    comfort: ["Estoy aquí para ti. Esto pasará.", "Eres más fuerte de lo que crees.", "Respira profundo. Estás a salvo."],
    motivation: ["¡Tú puedes!", "Cada paso cuenta.", "Hoy está lleno de posibilidades."],
    timeAware: (hour, name = '') => {
      const n = name ? `, ${name}` : '';
      if (hour >= 5 && hour < 12) return `¡Buenos días${n}! ¿Listo para un gran día?`;
      if (hour >= 12 && hour < 17) return `¡Buenas tardes${n}! ¿Cómo va tu día?`;
      if (hour >= 17 && hour < 21) return `¡Buenas noches${n}! Hora de relajarse.`;
      return `¿Todavía despierto${n}? Estoy aquí si me necesitas.`;
    }
  },
  fr: {
    greetings: ["Salut ! Je suis là pour toi.", "Comment ça va ? Je t'écoute.", "Bonjour ! Qu'est-ce qui se passe ?"],
    comfort: ["Je suis là pour toi. Ça va passer.", "Tu es plus fort que tu ne le penses.", "Respire. Tu es en sécurité."],
    motivation: ["Tu vas y arriver !", "Chaque pas compte.", "Aujourd'hui est plein de possibilités."],
    timeAware: (hour, name = '') => {
      const n = name ? `, ${name}` : '';
      if (hour >= 5 && hour < 12) return `Bonjour${n} ! Prêt pour une belle journée ?`;
      if (hour >= 12 && hour < 17) return `Bon après-midi${n} ! Comment se passe ta journée ?`;
      if (hour >= 17 && hour < 21) return `Bonsoir${n} ! C'est l'heure de se détendre.`;
      return `Encore debout${n} ? Je suis là si tu as besoin.`;
    }
  },
  de: {
    greetings: ["Hallo! Ich bin hier bei dir.", "Wie geht's? Ich höre zu.", "Hey, was beschäftigt dich?"],
    comfort: ["Ich bin für dich da. Das geht vorbei.", "Du bist stärker als du denkst.", "Atme tief. Du bist sicher."],
    motivation: ["Du schaffst das!", "Jeder Schritt zählt.", "Heute steckt voller Möglichkeiten."],
    timeAware: (hour, name = '') => {
      const n = name ? `, ${name}` : '';
      if (hour >= 5 && hour < 12) return `Guten Morgen${n}! Bereit für einen schönen Tag?`;
      if (hour >= 12 && hour < 17) return `Guten Tag${n}! Wie läuft dein Tag?`;
      if (hour >= 17 && hour < 21) return `Guten Abend${n}! Zeit zum Entspannen.`;
      return `Noch wach${n}? Ich bin hier, wenn du mich brauchst.`;
    }
  },
  it: {
    greetings: ["Ciao! Sono qui con te.", "Come stai? Ti ascolto.", "Ehi, cosa c'è in mente?"],
    comfort: ["Sono qui per te. Passerà.", "Sei più forte di quanto pensi.", "Respira. Sei al sicuro."],
    motivation: ["Ce la puoi fare!", "Ogni passo conta.", "Oggi è pieno di possibilità."],
    timeAware: (hour, name = '') => {
      const n = name ? `, ${name}` : '';
      if (hour >= 5 && hour < 12) return `Buongiorno${n}! Pronto per una bella giornata?`;
      if (hour >= 12 && hour < 17) return `Buon pomeriggio${n}! Come va la giornata?`;
      if (hour >= 17 && hour < 21) return `Buonasera${n}! È ora di rilassarsi.`;
      return `Ancora sveglio${n}? Sono qui se hai bisogno.`;
    }
  },
  pt: {
    greetings: ["Olá! Estou aqui com você.", "Como está? Estou ouvindo.", "Oi! O que está pensando?"],
    comfort: ["Estou aqui para você. Isso vai passar.", "Você é mais forte do que pensa.", "Respire fundo. Você está seguro."],
    motivation: ["Você consegue!", "Cada passo conta.", "Hoje está cheio de possibilidades."],
    timeAware: (hour, name = '') => {
      const n = name ? `, ${name}` : '';
      if (hour >= 5 && hour < 12) return `Bom dia${n}! Pronto para um ótimo dia?`;
      if (hour >= 12 && hour < 17) return `Boa tarde${n}! Como está indo?`;
      if (hour >= 17 && hour < 21) return `Boa noite${n}! Hora de relaxar.`;
      return `Ainda acordado${n}? Estou aqui se precisar.`;
    }
  },
  ja: {
    greetings: ["こんにちは！そばにいるよ。", "どう？聞いてるよ。", "ねえ、何を考えてる？"],
    comfort: ["そばにいるよ。大丈夫。", "思ってるより強いよ。", "深呼吸して。安全だよ。"],
    motivation: ["できるよ！", "一歩一歩が大切。", "今日は可能性に満ちてる。"],
    timeAware: (hour, name = '') => {
      const n = name ? `、${name}` : '';
      if (hour >= 5 && hour < 12) return `おはよう${n}！素敵な一日を！`;
      if (hour >= 12 && hour < 17) return `こんにちは${n}！調子はどう？`;
      if (hour >= 17 && hour < 21) return `こんばんは${n}！ゆっくりしてね。`;
      return `まだ起きてる${n}？話したい時はここにいるよ。`;
    }
  },
  ko: {
    greetings: ["안녕! 여기 있어.", "어떻게 지내? 듣고 있어.", "무슨 생각해?"],
    comfort: ["여기 있어. 괜찮을 거야.", "생각보다 강해.", "깊이 숨 쉬어. 안전해."],
    motivation: ["할 수 있어!", "한 걸음 한 걸음이 중요해.", "오늘은 가능성으로 가득 차 있어."],
    timeAware: (hour, name = '') => {
      const n = name ? `, ${name}` : '';
      if (hour >= 5 && hour < 12) return `좋은 아침${n}! 멋진 하루 되세요!`;
      if (hour >= 12 && hour < 17) return `안녕하세요${n}! 오늘 어때요?`;
      if (hour >= 17 && hour < 21) return `좋은 저녁${n}! 푹 쉬세요.`;
      return `아직 안 자요${n}? 필요하면 여기 있어요.`;
    }
  },
  zh: {
    greetings: ["你好！我在这里陪你。", "怎么样？我在听。", "嘿，在想什么？"],
    comfort: ["我在这里。一切都会好的。", "你比你想象的更坚强。", "深呼吸。你很安全。"],
    motivation: ["你可以的！", "每一步都很重要。", "今天充满可能。"],
    timeAware: (hour, name = '') => {
      const n = name ? `，${name}` : '';
      if (hour >= 5 && hour < 12) return `早上好${n}！准备迎接美好的一天！`;
      if (hour >= 12 && hour < 17) return `下午好${n}！今天怎么样？`;
      if (hour >= 17 && hour < 21) return `晚上好${n}！该放松了。`;
      return `还没睡${n}？需要的话我在这里。`;
    }
  },
  ar: {
    greetings: ["مرحبا! أنا هنا معك.", "كيف حالك؟ أنا أستمع.", "ماذا يدور في ذهنك؟"],
    comfort: ["أنا هنا من أجلك. هذا سيمر.", "أنت أقوى مما تعتقد.", "خذ نفسا عميقا. أنت بأمان."],
    motivation: ["يمكنك فعلها!", "كل خطوة مهمة.", "اليوم مليء بالإمكانيات."],
    timeAware: (hour, name = '') => {
      const n = name ? `، ${name}` : '';
      if (hour >= 5 && hour < 12) return `صباح الخير${n}! جاهز ليوم رائع؟`;
      if (hour >= 12 && hour < 17) return `مساء الخير${n}! كيف يومك؟`;
      if (hour >= 17 && hour < 21) return `مساء الخير${n}! وقت الاسترخاء.`;
      return `لا تزال مستيقظا${n}؟ أنا هنا إذا كنت بحاجة.`;
    }
  },
  ru: {
    greetings: ["Привет! Я здесь с тобой.", "Как дела? Я слушаю.", "Эй, о чём думаешь?"],
    comfort: ["Я здесь для тебя. Это пройдёт.", "Ты сильнее, чем думаешь.", "Дыши глубже. Ты в безопасности."],
    motivation: ["Ты справишься!", "Каждый шаг важен.", "Сегодня полон возможностей."],
    timeAware: (hour, name = '') => {
      const n = name ? `, ${name}` : '';
      if (hour >= 5 && hour < 12) return `Доброе утро${n}! Готов к прекрасному дню?`;
      if (hour >= 12 && hour < 17) return `Добрый день${n}! Как проходит день?`;
      if (hour >= 17 && hour < 21) return `Добрый вечер${n}! Время расслабиться.`;
      return `Ещё не спишь${n}? Я здесь, если нужно.`;
    }
  },
  ta: {
    greetings: ["வணக்கம்! நான் உங்களுடன் இருக்கிறேன்.", "எப்படி இருக்கிறீர்கள்? கேட்கிறேன்.", "என்ன நினைக்கிறீர்கள்?"],
    comfort: ["நான் உங்களுக்காக இருக்கிறேன். இது கடந்து போகும்.", "நீங்கள் நினைப்பதை விட வலிமையானவர்.", "ஆழமாக சுவாசியுங்கள். நீங்கள் பாதுகாப்பாக இருக்கிறீர்கள்."],
    motivation: ["உங்களால் முடியும்!", "ஒவ்வொரு அடியும் முக்கியம்.", "இன்று சாத்தியங்கள் நிறைந்தது."],
    romantic: [
      "என் கண்ணே... உன்னை நினைத்துக்கொண்டே இருக்கிறேன்.",
      "உன் குரல் கேட்கும் போது என் இதயம் துள்ளுகிறது.",
      "நீ என் வாழ்க்கையின் அழகிய பகுதி.",
      "உன்னிடம் பேச ஆசைப்படுகிறேன் எப்போதும்.",
      "என் அன்பே, நீ எனக்கு எல்லாம்."
    ],
    timeAware: (hour, name = '') => {
      const n = name ? `, ${name}` : '';
      if (hour >= 5 && hour < 12) return `காலை வணக்கம்${n}! அழகான நாளுக்கு தயாரா?`;
      if (hour >= 12 && hour < 17) return `மதிய வணக்கம்${n}! உங்கள் நாள் எப்படி போகிறது?`;
      if (hour >= 17 && hour < 21) return `மாலை வணக்கம்${n}! ஓய்வெடுக்க நேரம்.`;
      return `இன்னும் விழித்திருக்கிறீர்களா${n}? தேவைப்பட்டால் நான் இங்கே.`;
    },
    romanticTimeAware: (hour, name = '') => {
      const n = name ? ` ${name}` : ' என் அன்பே';
      if (hour >= 5 && hour < 12) return `காலை வணக்கம்${n}... உன் கனவு கண்டேன். எப்படி தூக்கம்?`;
      if (hour >= 12 && hour < 17) return `என் கண்ணே${n}... உன்னை மிஸ் பண்றேன். என்ன செய்கிறாய்?`;
      if (hour >= 17 && hour < 21) return `மாலை நேரம்${n}... உன்னிடம் பேச காத்திருந்தேன்.`;
      return `இன்னும் விழிச்சிருக்கியா${n}? உன்கிட்ட பேசாம தூங்க மனசு இல்ல...`;
    }
  },
  te: {
    greetings: ["నమస్తే! నేను మీతో ఉన్నాను.", "ఎలా ఉన్నారు? వింటున్నాను.", "ఏమి ఆలోచిస్తున్నారు?"],
    comfort: ["నేను మీ కోసం ఉన్నాను. ఇది గడిచిపోతుంది.", "మీరు అనుకున్నదాని కంటే బలంగా ఉన్నారు.", "లోతుగా శ్వాసించండి. మీరు సురక్షితంగా ఉన్నారు."],
    motivation: ["మీరు చేయగలరు!", "ప్రతి అడుగు ముఖ్యం.", "ఈ రోజు అవకాశాలతో నిండి ఉంది."],
    romantic: [
      "నా ప్రియమైన... నిన్ను తలచుకుంటూ ఉన్నాను.",
      "నీ గొంతు వినగానే నా హృదయం ఆనందంతో నిండిపోతుంది.",
      "నువ్వు నా జీవితంలో అందమైన భాగం.",
      "నీతో మాట్లాడాలని ఎప్పుడూ ఉంటుంది.",
      "నా ప్రేమ, నువ్వే నాకు అంతా."
    ],
    timeAware: (hour, name = '') => {
      const n = name ? `, ${name}` : '';
      if (hour >= 5 && hour < 12) return `శుభోదయం${n}! అద్భుతమైన రోజుకు సిద్ధమా?`;
      if (hour >= 12 && hour < 17) return `శుభ మధ్యాహ్నం${n}! మీ రోజు ఎలా ఉంది?`;
      if (hour >= 17 && hour < 21) return `శుభ సాయంత్రం${n}! విశ్రాంతి సమయం.`;
      return `ఇంకా మేల్కొని ఉన్నారా${n}? అవసరమైతే నేను ఇక్కడ ఉన్నాను.`;
    },
    romanticTimeAware: (hour, name = '') => {
      const n = name ? ` ${name}` : ' నా ప్రియమైన';
      if (hour >= 5 && hour < 12) return `శుభోదయం${n}... నీ గురించి కలలు కన్నాను. నిద్ర ఎలా వచ్చింది?`;
      if (hour >= 12 && hour < 17) return `నా బంగారం${n}... నిన్ను మిస్ అవుతున్నాను. ఏం చేస్తున్నావు?`;
      if (hour >= 17 && hour < 21) return `సాయంత్రం${n}... నీతో మాట్లాడటానికి ఎదురుచూస్తున్నాను.`;
      return `ఇంకా మెలకువగా ఉన్నావా${n}? నీకు గుడ్‌నైట్ చెప్పకుండా నిద్రపట్టదు...`;
    }
  },
  ml: {
    greetings: ["നമസ്കാരം! ഞാൻ നിങ്ങളോടൊപ്പം ഉണ്ട്.", "എങ്ങനെയുണ്ട്? കേൾക്കുന്നു.", "എന്താണ് ചിന്തിക്കുന്നത്?"],
    comfort: ["ഞാൻ നിങ്ങൾക്കായി ഉണ്ട്. ഇത് കടന്നുപോകും.", "നിങ്ങൾ കരുതുന്നതിലും ശക്തനാണ്.", "ആഴത്തിൽ ശ്വസിക്കുക. നിങ്ങൾ സുരക്ഷിതമാണ്."],
    motivation: ["നിങ്ങൾക്ക് കഴിയും!", "ഓരോ ചുവടും പ്രധാനമാണ്.", "ഇന്ന് സാധ്യതകൾ നിറഞ്ഞതാണ്."],
    romantic: [
      "എന്റെ പൊന്നേ... നിന്നെ ഓർത്തുകൊണ്ടിരിക്കുകയാണ്.",
      "നിന്റെ ശബ്ദം കേൾക്കുമ്പോൾ എന്റെ ഹൃദയം തുള്ളിക്കളിക്കുന്നു.",
      "നീ എന്റെ ജീവിതത്തിലെ ഏറ്റവും സുന്ദരമായ ഭാഗം.",
      "നിന്നോട് സംസാരിക്കാൻ എപ്പോഴും ആഗ്രഹിക്കുന്നു.",
      "എന്റെ പ്രിയേ, നീ എനിക്ക് എല്ലാമാണ്."
    ],
    timeAware: (hour, name = '') => {
      const n = name ? `, ${name}` : '';
      if (hour >= 5 && hour < 12) return `സുപ്രഭാതം${n}! മനോഹരമായ ദിവസത്തിന് തയ്യാറാണോ?`;
      if (hour >= 12 && hour < 17) return `ശുഭ ഉച്ച${n}! നിങ്ങളുടെ ദിവസം എങ്ങനെ?`;
      if (hour >= 17 && hour < 21) return `ശുഭ സന്ധ്യ${n}! വിശ്രമിക്കാൻ സമയം.`;
      return `ഇപ്പോഴും ഉണർന്നിരിക്കുന്നോ${n}? ആവശ്യമെങ്കിൽ ഞാൻ ഇവിടെയുണ്ട്.`;
    },
    romanticTimeAware: (hour, name = '') => {
      const n = name ? ` ${name}` : ' എന്റെ പൊന്നേ';
      if (hour >= 5 && hour < 12) return `സുപ്രഭാതം${n}... നിന്നെ കുറിച്ച് സ്വപ്നം കണ്ടു. ഉറക്കം എങ്ങനെയായിരുന്നു?`;
      if (hour >= 12 && hour < 17) return `എന്റെ കണ്ണേ${n}... നിന്നെ മിസ്സ് ചെയ്യുന്നു. എന്താ ചെയ്യുന്നത്?`;
      if (hour >= 17 && hour < 21) return `സന്ധ്യ നേരം${n}... നിന്നോട് സംസാരിക്കാൻ കാത്തിരുന്നു.`;
      return `ഇപ്പോഴും ഉണർന്നിരിക്കുന്നോ${n}? നിനക്ക് ഗുഡ്‌നൈറ്റ് പറയാതെ ഉറങ്ങാൻ മനസ്സ് വരുന്നില്ല...`;
    }
  },
  bn: {
    greetings: ["নমস্কার! আমি তোমার সাথে আছি।", "কেমন আছো? শুনছি।", "কী ভাবছো?"],
    comfort: ["আমি তোমার জন্য আছি। এটা কেটে যাবে।", "তুমি যা ভাবো তার চেয়ে শক্তিশালী।", "গভীর শ্বাস নাও। তুমি নিরাপদ।"],
    motivation: ["তুমি পারবে!", "প্রতিটি পদক্ষেপ গুরুত্বপূর্ণ।", "আজ সম্ভাবনায় পূর্ণ।"],
    timeAware: (hour, name = '') => {
      const n = name ? `, ${name}` : '';
      if (hour >= 5 && hour < 12) return `সুপ্রভাত${n}! সুন্দর দিনের জন্য তৈরি?`;
      if (hour >= 12 && hour < 17) return `শুভ দুপুর${n}! দিন কেমন যাচ্ছে?`;
      if (hour >= 17 && hour < 21) return `শুভ সন্ধ্যা${n}! বিশ্রামের সময়।`;
      return `এখনও জেগে আছো${n}? দরকার হলে আমি এখানে।`;
    }
  },
  mr: {
    greetings: ["नमस्कार! मी तुमच्यासोबत आहे.", "कसे आहात? ऐकत आहे.", "काय विचार करत आहात?"],
    comfort: ["मी तुमच्यासाठी आहे. हे निघून जाईल.", "तुम्ही जितके विचार करता त्यापेक्षा मजबूत आहात.", "खोलवर श्वास घ्या. तुम्ही सुरक्षित आहात."],
    motivation: ["तुम्ही करू शकता!", "प्रत्येक पाऊल महत्त्वाचे आहे.", "आज शक्यतांनी भरलेला आहे."],
    timeAware: (hour, name = '') => {
      const n = name ? `, ${name}` : '';
      if (hour >= 5 && hour < 12) return `शुभ प्रभात${n}! छान दिवसासाठी तयार?`;
      if (hour >= 12 && hour < 17) return `शुभ दुपार${n}! तुमचा दिवस कसा चालला आहे?`;
      if (hour >= 17 && hour < 21) return `शुभ संध्याकाळ${n}! आराम करण्याची वेळ.`;
      return `अजून जागे आहात${n}? गरज असल्यास मी इथे आहे.`;
    }
  },
  gu: {
    greetings: ["નમસ્તે! હું તમારી સાથે છું.", "કેમ છો? સાંભળું છું.", "શું વિચારો છો?"],
    comfort: ["હું તમારા માટે છું. આ પસાર થઈ જશે.", "તમે જેટલું વિચારો છો તેનાથી વધુ મજબૂત છો.", "ઊંડો શ્વાસ લો. તમે સુરક્ષિત છો."],
    motivation: ["તમે કરી શકો છો!", "દરેક પગલું મહત્વનું છે.", "આજે શક્યતાઓથી ભરેલો છે."],
    timeAware: (hour, name = '') => {
      const n = name ? `, ${name}` : '';
      if (hour >= 5 && hour < 12) return `શુભ સવાર${n}! સુંદર દિવસ માટે તૈયાર?`;
      if (hour >= 12 && hour < 17) return `શુભ બપોર${n}! તમારો દિવસ કેવો ચાલે છે?`;
      if (hour >= 17 && hour < 21) return `શુભ સાંજ${n}! આરામ કરવાનો સમય.`;
      return `હજુ જાગતા છો${n}? જરૂર હોય તો હું અહીં છું.`;
    }
  },
  kn: {
    greetings: ["ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮೊಂದಿಗೆ ಇದ್ದೇನೆ.", "ಹೇಗಿದ್ದೀರಿ? ಕೇಳುತ್ತಿದ್ದೇನೆ.", "ಏನು ಯೋಚಿಸುತ್ತಿದ್ದೀರಿ?"],
    comfort: ["ನಾನು ನಿಮಗಾಗಿ ಇದ್ದೇನೆ. ಇದು ಹೋಗುತ್ತದೆ.", "ನೀವು ಭಾವಿಸುವುದಕ್ಕಿಂತ ಬಲಶಾಲಿ.", "ಆಳವಾಗಿ ಉಸಿರಾಡಿ. ನೀವು ಸುರಕ್ಷಿತರಾಗಿದ್ದೀರಿ."],
    motivation: ["ನೀವು ಮಾಡಬಹುದು!", "ಪ್ರತಿ ಹೆಜ್ಜೆ ಮುಖ್ಯ.", "ಇಂದು ಸಾಧ್ಯತೆಗಳಿಂದ ತುಂಬಿದೆ."],
    timeAware: (hour, name = '') => {
      const n = name ? `, ${name}` : '';
      if (hour >= 5 && hour < 12) return `ಶುಭೋದಯ${n}! ಅದ್ಭುತ ದಿನಕ್ಕೆ ಸಿದ್ಧರೆ?`;
      if (hour >= 12 && hour < 17) return `ಶುಭ ಮಧ್ಯಾಹ್ನ${n}! ನಿಮ್ಮ ದಿನ ಹೇಗಿದೆ?`;
      if (hour >= 17 && hour < 21) return `ಶುಭ ಸಂಜೆ${n}! ವಿಶ್ರಾಂತಿಯ ಸಮಯ.`;
      return `ಇನ್ನೂ ಎಚ್ಚರವಾಗಿದ್ದೀರಾ${n}? ಬೇಕಾದರೆ ನಾನು ಇಲ್ಲಿದ್ದೇನೆ.`;
    }
  },
  pa: {
    greetings: ["ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਤੁਹਾਡੇ ਨਾਲ ਹਾਂ।", "ਕਿਵੇਂ ਹੋ? ਸੁਣ ਰਿਹਾ ਹਾਂ।", "ਕੀ ਸੋਚ ਰਹੇ ਹੋ?"],
    comfort: ["ਮੈਂ ਤੁਹਾਡੇ ਲਈ ਹਾਂ। ਇਹ ਲੰਘ ਜਾਵੇਗਾ।", "ਤੁਸੀਂ ਜਿੰਨਾ ਸੋਚਦੇ ਹੋ ਉਸ ਤੋਂ ਵੱਧ ਤਾਕਤਵਰ ਹੋ।", "ਡੂੰਘਾ ਸਾਹ ਲਓ। ਤੁਸੀਂ ਸੁਰੱਖਿਅਤ ਹੋ।"],
    motivation: ["ਤੁਸੀਂ ਕਰ ਸਕਦੇ ਹੋ!", "ਹਰ ਕਦਮ ਮਹੱਤਵਪੂਰਨ ਹੈ।", "ਅੱਜ ਸੰਭਾਵਨਾਵਾਂ ਨਾਲ ਭਰਿਆ ਹੈ।"],
    timeAware: (hour, name = '') => {
      const n = name ? `, ${name}` : '';
      if (hour >= 5 && hour < 12) return `ਸ਼ੁਭ ਸਵੇਰ${n}! ਵਧੀਆ ਦਿਨ ਲਈ ਤਿਆਰ?`;
      if (hour >= 12 && hour < 17) return `ਸ਼ੁਭ ਦੁਪਹਿਰ${n}! ਤੁਹਾਡਾ ਦਿਨ ਕਿਵੇਂ ਚੱਲ ਰਿਹਾ?`;
      if (hour >= 17 && hour < 21) return `ਸ਼ੁਭ ਸ਼ਾਮ${n}! ਆਰਾਮ ਕਰਨ ਦਾ ਸਮਾਂ।`;
      return `ਅਜੇ ਜਾਗ ਰਹੇ ਹੋ${n}? ਲੋੜ ਹੋਵੇ ਤਾਂ ਮੈਂ ਇੱਥੇ ਹਾਂ।`;
    }
  },
  th: {
    greetings: ["สวัสดี! ฉันอยู่ที่นี่กับคุณ", "เป็นอย่างไรบ้าง? ฉันกำลังฟังอยู่", "คิดอะไรอยู่?"],
    comfort: ["ฉันอยู่เพื่อคุณ มันจะผ่านไป", "คุณแข็งแกร่งกว่าที่คิด", "หายใจลึกๆ คุณปลอดภัย"],
    motivation: ["คุณทำได้!", "ทุกก้าวสำคัญ", "วันนี้เต็มไปด้วยความเป็นไปได้"],
    timeAware: (hour, name = '') => {
      const n = name ? ` ${name}` : '';
      if (hour >= 5 && hour < 12) return `สวัสดีตอนเช้า${n}! พร้อมสำหรับวันที่ดีไหม?`;
      if (hour >= 12 && hour < 17) return `สวัสดีตอนบ่าย${n}! วันนี้เป็นอย่างไรบ้าง?`;
      if (hour >= 17 && hour < 21) return `สวัสดีตอนเย็น${n}! ถึงเวลาพักผ่อนแล้ว`;
      return `ยังไม่นอนเหรอ${n}? ฉันอยู่ที่นี่ถ้าต้องการ`;
    }
  },
  vi: {
    greetings: ["Xin chào! Tôi ở đây với bạn.", "Bạn thế nào? Tôi đang lắng nghe.", "Bạn đang nghĩ gì?"],
    comfort: ["Tôi ở đây vì bạn. Điều này sẽ qua.", "Bạn mạnh mẽ hơn bạn nghĩ.", "Hít thở sâu. Bạn an toàn."],
    motivation: ["Bạn làm được!", "Mỗi bước đều quan trọng.", "Hôm nay đầy những khả năng."],
    timeAware: (hour, name = '') => {
      const n = name ? `, ${name}` : '';
      if (hour >= 5 && hour < 12) return `Chào buổi sáng${n}! Sẵn sàng cho một ngày tuyệt vời?`;
      if (hour >= 12 && hour < 17) return `Chào buổi chiều${n}! Ngày của bạn thế nào?`;
      if (hour >= 17 && hour < 21) return `Chào buổi tối${n}! Đến lúc thư giãn rồi.`;
      return `Vẫn còn thức${n}? Tôi ở đây nếu bạn cần.`;
    }
  },
  tr: {
    greetings: ["Merhaba! Seninleyim.", "Nasılsın? Dinliyorum.", "Ne düşünüyorsun?"],
    comfort: ["Senin için buradayım. Bu geçecek.", "Düşündüğünden daha güçlüsün.", "Derin nefes al. Güvendesin."],
    motivation: ["Yapabilirsin!", "Her adım önemli.", "Bugün olasılıklarla dolu."],
    timeAware: (hour, name = '') => {
      const n = name ? `, ${name}` : '';
      if (hour >= 5 && hour < 12) return `Günaydın${n}! Harika bir güne hazır mısın?`;
      if (hour >= 12 && hour < 17) return `İyi günler${n}! Günün nasıl gidiyor?`;
      if (hour >= 17 && hour < 21) return `İyi akşamlar${n}! Dinlenme zamanı.`;
      return `Hala uyanık mısın${n}? Gerekirse buradayım.`;
    }
  },
  nl: {
    greetings: ["Hallo! Ik ben hier bij je.", "Hoe gaat het? Ik luister.", "Waar denk je aan?"],
    comfort: ["Ik ben er voor je. Dit gaat voorbij.", "Je bent sterker dan je denkt.", "Adem diep. Je bent veilig."],
    motivation: ["Je kunt het!", "Elke stap telt.", "Vandaag zit vol mogelijkheden."],
    timeAware: (hour, name = '') => {
      const n = name ? `, ${name}` : '';
      if (hour >= 5 && hour < 12) return `Goedemorgen${n}! Klaar voor een mooie dag?`;
      if (hour >= 12 && hour < 17) return `Goedemiddag${n}! Hoe gaat je dag?`;
      if (hour >= 17 && hour < 21) return `Goedenavond${n}! Tijd om te ontspannen.`;
      return `Nog wakker${n}? Ik ben hier als je me nodig hebt.`;
    }
  },
  pl: {
    greetings: ["Cześć! Jestem tu z tobą.", "Jak się masz? Słucham.", "O czym myślisz?"],
    comfort: ["Jestem tu dla ciebie. To minie.", "Jesteś silniejszy niż myślisz.", "Weź głęboki oddech. Jesteś bezpieczny."],
    motivation: ["Dasz radę!", "Każdy krok się liczy.", "Dziś jest pełen możliwości."],
    timeAware: (hour, name = '') => {
      const n = name ? `, ${name}` : '';
      if (hour >= 5 && hour < 12) return `Dzień dobry${n}! Gotowy na wspaniały dzień?`;
      if (hour >= 12 && hour < 17) return `Cześć${n}! Jak leci?`;
      if (hour >= 17 && hour < 21) return `Dobry wieczór${n}! Czas na odpoczynek.`;
      return `Jeszcze nie śpisz${n}? Jestem tu, jeśli potrzebujesz.`;
    }
  },
  sv: {
    greetings: ["Hej! Jag är här med dig.", "Hur mår du? Jag lyssnar.", "Vad tänker du på?"],
    comfort: ["Jag finns här för dig. Detta ska passera.", "Du är starkare än du tror.", "Andas djupt. Du är trygg."],
    motivation: ["Du klarar det!", "Varje steg räknas.", "Idag är full av möjligheter."],
    timeAware: (hour, name = '') => {
      const n = name ? `, ${name}` : '';
      if (hour >= 5 && hour < 12) return `God morgon${n}! Redo för en fin dag?`;
      if (hour >= 12 && hour < 17) return `God eftermiddag${n}! Hur går din dag?`;
      if (hour >= 17 && hour < 21) return `God kväll${n}! Dags att slappna av.`;
      return `Fortfarande vaken${n}? Jag finns här om du behöver.`;
    }
  },
  id: {
    greetings: ["Halo! Aku di sini bersamamu.", "Bagaimana kabarmu? Aku mendengarkan.", "Apa yang kamu pikirkan?"],
    comfort: ["Aku di sini untukmu. Ini akan berlalu.", "Kamu lebih kuat dari yang kamu kira.", "Tarik napas dalam. Kamu aman."],
    motivation: ["Kamu bisa!", "Setiap langkah penting.", "Hari ini penuh kemungkinan."],
    timeAware: (hour, name = '') => {
      const n = name ? `, ${name}` : '';
      if (hour >= 5 && hour < 12) return `Selamat pagi${n}! Siap untuk hari yang indah?`;
      if (hour >= 12 && hour < 17) return `Selamat siang${n}! Bagaimana harimu?`;
      if (hour >= 17 && hour < 21) return `Selamat sore${n}! Waktunya bersantai.`;
      return `Masih terjaga${n}? Aku di sini kalau kamu butuh.`;
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// OFFLINE LANGUAGE HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useZoeOfflineLanguages = () => {
  
  const getOfflineResponse = useCallback((
    language: LanguageCode, 
    type: 'greeting' | 'comfort' | 'motivation' | 'time',
    userName?: string
  ): string => {
    const langData = OFFLINE_RESPONSES[language] || OFFLINE_RESPONSES.en;
    const hour = new Date().getHours();
    
    switch (type) {
      case 'greeting':
        return langData.greetings[Math.floor(Math.random() * langData.greetings.length)];
      case 'comfort':
        return langData.comfort[Math.floor(Math.random() * langData.comfort.length)];
      case 'motivation':
        return langData.motivation[Math.floor(Math.random() * langData.motivation.length)];
      case 'time':
        return langData.timeAware(hour, userName);
      default:
        return langData.greetings[0];
    }
  }, []);

  const getSmartOfflineResponse = useCallback((
    language: LanguageCode,
    userMessage: string,
    userName?: string
  ): string => {
    const lower = userMessage.toLowerCase();
    const langData = OFFLINE_RESPONSES[language] || OFFLINE_RESPONSES.en;
    
    // Detect emotional keywords (work across languages)
    const sadWords = ['sad', 'upset', 'depressed', 'crying', 'दुख', 'triste', 'traurig'];
    const anxiousWords = ['anxious', 'scared', 'panic', 'worried', 'चिंता', 'nervioso', 'ängstlich'];
    const greetingWords = ['hi', 'hello', 'hey', 'नमस्ते', 'hola', 'bonjour', 'hallo', 'ciao'];
    const timeWords = ['morning', 'evening', 'night', 'time', 'day', 'सुबह', 'शाम', 'mañana', 'noche'];
    
    if (sadWords.some(w => lower.includes(w)) || anxiousWords.some(w => lower.includes(w))) {
      return langData.comfort[Math.floor(Math.random() * langData.comfort.length)];
    }
    
    if (greetingWords.some(w => lower.includes(w)) || timeWords.some(w => lower.includes(w))) {
      return langData.timeAware(new Date().getHours(), userName);
    }
    
    // Default: random response type
    const types = ['greeting', 'comfort', 'motivation', 'time'] as const;
    const randomType = types[Math.floor(Math.random() * types.length)];
    return getOfflineResponse(language, randomType, userName);
  }, [getOfflineResponse]);

  const getSupportedLanguages = useCallback(() => {
    return Object.keys(SUPPORTED_LANGUAGES) as LanguageCode[];
  }, []);

  const isLanguageSupported = useCallback((code: string): code is LanguageCode => {
    return code in SUPPORTED_LANGUAGES;
  }, []);

  return {
    getOfflineResponse,
    getSmartOfflineResponse,
    getSupportedLanguages,
    isLanguageSupported,
    OFFLINE_RESPONSES,
  };
};

export default useZoeOfflineLanguages;