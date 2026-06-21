// ═══════════════════════════════════════════════════════════════════════════════
// WORLD FESTIVALS & HOLIDAYS DATABASE
// Location-based, name-based, and date-based festival detection for Zoe Infinity
// ═══════════════════════════════════════════════════════════════════════════════

export interface Festival {
  name: string;
  month: number; // 1-12
  day: number;
  endDay?: number; // multi-day festivals
  regions: string[]; // country/state codes
  namePatterns?: RegExp[]; // name-based detection (religion/culture)
  greeting: string;
  emoji: string;
  type: 'national' | 'religious' | 'cultural' | 'regional';
}

// Helper: Get current year's movable dates (approximations for lunar/solar calendar festivals)
function getMovableFestivals(year: number): Festival[] {
  // Easter Sunday calculation (Computus algorithm)
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const easterMonth = Math.floor((h + l - 7 * m + 114) / 31);
  const easterDay = ((h + l - 7 * m + 114) % 31) + 1;

  const easter = new Date(year, easterMonth - 1, easterDay);
  const goodFriday = new Date(easter); goodFriday.setDate(easter.getDate() - 2);

  // Approximate Ramadan/Eid dates (shifts ~11 days yearly)
  // 2025: Mar 28 - Apr 27, Eid Apr 28
  // 2026: Mar 17 - Apr 16, Eid Apr 17
  const eidBase = year === 2025 ? { m: 4, d: 28 } :
                  year === 2026 ? { m: 4, d: 17 } :
                  year === 2027 ? { m: 4, d: 6 } :
                  { m: 3, d: 26 };

  // Diwali approximate dates
  const diwaliBase = year === 2025 ? { m: 10, d: 20 } :
                     year === 2026 ? { m: 11, d: 8 } :
                     year === 2027 ? { m: 10, d: 29 } :
                     { m: 11, d: 1 };

  // Chinese New Year approximate
  const cnyBase = year === 2025 ? { m: 1, d: 29 } :
                  year === 2026 ? { m: 2, d: 17 } :
                  year === 2027 ? { m: 2, d: 6 } :
                  { m: 2, d: 10 };

  // Vishu (Kerala) - April 14 every year (fixed solar calendar)
  // Tamil New Year (Puthandu) - April 14 every year
  // Bengali New Year (Pohela Boishakh) - April 14
  // Sinhala New Year - April 13-14

  return [
    {
      name: 'Easter Sunday', month: easterMonth, day: easterDay,
      regions: ['US', 'UK', 'EU', 'AU', 'NZ', 'CA', 'BR', 'PH', 'GLOBAL'],
      namePatterns: [/\b(john|mary|paul|peter|james|michael|david|sarah|grace|faith|hope|matthew|mark|luke|joseph|daniel|samuel|benjamin|elizabeth|anna|rachel|ruth|esther|thomas|andrew|philip|stephen|george|christopher|nicholas|anthony|patrick|francis|christine|catherine|margaret|victoria|claire|maria|rosa|teresa|gabriel|raphael|emmanuel)\b/i],
      greeting: 'Happy Easter! May this day bring you joy, hope, and renewed faith.',
      emoji: '🐣✝️', type: 'religious',
    },
    {
      name: 'Good Friday', month: goodFriday.getMonth() + 1, day: goodFriday.getDate(),
      regions: ['US', 'UK', 'EU', 'AU', 'NZ', 'CA', 'IN', 'PH', 'GLOBAL'],
      namePatterns: [/\b(john|mary|paul|peter|james|michael|david|sarah|grace|matthew|joseph|daniel|elizabeth|thomas|george|christopher|nicholas|anthony|patrick|francis|maria|teresa|gabriel|emmanuel)\b/i],
      greeting: 'Wishing you peace and reflection on this Good Friday.',
      emoji: '✝️🙏', type: 'religious',
    },
    {
      name: 'Eid al-Fitr', month: eidBase.m, day: eidBase.d, endDay: eidBase.d + 2,
      regions: ['SA', 'AE', 'PK', 'BD', 'IN', 'ID', 'MY', 'TR', 'EG', 'NG', 'MENA'],
      namePatterns: [/\b(mohammed|muhammad|ahmed|ali|fatima|aisha|omar|hassan|hussein|ibrahim|yusuf|hamza|bilal|zainab|khadija|maryam|abdul|sheikh|imam|sultan|amira|noor|nour|layla|sara|hasan|mustafa|khalid|tariq|jamal|karim|salim|nadia|samira|yasmin|amina|rashid|faisal|mansoor|arif|asif|nawaz|iqbal|shahid|shazia|nasreen|afzal|pervez|rizwan|farooq|zubair|anwar)\b/i],
      greeting: 'Eid Mubarak! May this Eid bring you and your family happiness and blessings.',
      emoji: '🌙☪️', type: 'religious',
    },
    {
      name: 'Diwali', month: diwaliBase.m, day: diwaliBase.d, endDay: diwaliBase.d + 4,
      regions: ['IN', 'NP', 'LK', 'MY', 'SG', 'FJ', 'MU', 'TT', 'GY'],
      namePatterns: [/\b(ram|krishna|shiva|ganesh|lakshmi|parvati|durga|vishnu|arjun|arjuna|sita|radha|hanuman|dev|devi|priya|anand|arun|ravi|suresh|mahesh|raj|amit|ankit|rohit|sachin|pooja|neha|shreya|swati|deepak|sunil|anil|sanjay|vijay|vinod|ashok|rajesh|dinesh|naresh|kiran|rekha|kavita|sunita|geeta|seema|meena|sapna|jyoti|nisha|ritu|manisha|komal)\b/i],
      greeting: 'Happy Diwali! May the festival of lights illuminate your life with joy, prosperity, and happiness.',
      emoji: '🪔✨🎆', type: 'religious',
    },
    {
      name: 'Chinese New Year', month: cnyBase.m, day: cnyBase.d, endDay: cnyBase.d + 14,
      regions: ['CN', 'TW', 'HK', 'SG', 'MY', 'ID', 'TH', 'VN', 'PH', 'KR'],
      namePatterns: [/\b(wei|chen|zhang|wang|li|liu|yang|huang|zhao|wu|zhou|xu|sun|ma|zhu|lin|guo|he|luo|liang|song|zheng|xie|han|tang|feng|dong|xiao|cao|yuan|deng|pan|su|jiang|lu|cheng|jin|qian|ming|jun|yan|lei|qing|hua|xin|yu|jing|hong|bao|fang|long|yi)\b/i],
      greeting: 'Happy Chinese New Year! Wishing you prosperity, good health, and happiness in the new year!',
      emoji: '🧧🐲🎊', type: 'cultural',
    },
  ];
}

// ═══ FIXED DATE FESTIVALS (worldwide) ═══
export const FIXED_FESTIVALS: Festival[] = [
  // ═══ INDIA - Regional ═══
  { name: 'Vishu', month: 4, day: 14, endDay: 15, regions: ['IN-KL'], namePatterns: [/\b(arun|arjun|deepak|divya|gayathri|gopika|hari|jaya|krishna|lakshmi|mahesh|manu|maya|meera|nandana|nair|pillai|priya|rajesh|ravi|rekha|sandeep|santhosh|sarath|sreeja|suresh|unni|varma|vishnu|vinod|anand|ajith|ammu|anu|aparna|athira|bijoy|gopi|jayakrishnan|jishnu|lekha|manoj|mini|mohanan|murali|nanda|padma|parvathy|radhika|rajan|saju|shaiju|shaji|shyam|sindhu|sobha|soman|sree|sudha|thankam|thomas|vijayan|vineeth)\b/i], greeting: 'Vishu Ashamsakal! May this new year bring prosperity and joy to you and your family! 🌼', emoji: '🌼🌾', type: 'regional' },
  { name: 'Tamil New Year (Puthandu)', month: 4, day: 14, endDay: 15, regions: ['IN-TN'], namePatterns: [/\b(murugan|selvam|kumar|raja|lakshmi|priya|kavitha|senthil|karthik|anbu|devi|ganesh|hari|kannan|mani|nila|pandi|rajan|sakti|selvi|subha|surya|tamil|valli|vel|arasan|chellan|ezhil|ilango|jaya|kalai|madhan|nandha|oviya|pandian|ponni|ravi|sangeetha|thamizh|usha|vasuki)\b/i], greeting: 'Puthandu Vazthukal! Wishing you a wonderful Tamil New Year filled with blessings!', emoji: '🌸🎉', type: 'regional' },
  { name: 'Bengali New Year (Pohela Boishakh)', month: 4, day: 14, endDay: 15, regions: ['IN-WB', 'BD'], namePatterns: [/\b(arnab|anirban|ayan|biplab|chanchal|debashis|dipak|durga|gopal|isha|jaya|kamal|mamata|nandini|partha|pranab|rimi|rina|saurav|subhash|sudipta|sumit|tapas|ujjwal)\b/i], greeting: 'Shubho Noboborsho! May this Bengali New Year bring happiness and prosperity!', emoji: '🎊🌺', type: 'regional' },
  { name: 'Assamese New Year (Rongali Bihu)', month: 4, day: 14, endDay: 15, regions: ['IN-AS'], greeting: 'Happy Rongali Bihu! May this harvest season bless you with abundance!', emoji: '🌾🎶', type: 'regional' },
  { name: 'Sinhala & Tamil New Year', month: 4, day: 13, endDay: 15, regions: ['LK'], greeting: 'Subha Aluth Avuruddhak Wewa! Happy Sinhala & Tamil New Year!', emoji: '🌸☀️', type: 'regional' },
  { name: 'Republic Day (India)', month: 1, day: 26, regions: ['IN'], greeting: 'Happy Republic Day! Jai Hind! 🇮🇳', emoji: '🇮🇳🎖️', type: 'national' },
  { name: 'Independence Day (India)', month: 8, day: 15, regions: ['IN'], greeting: 'Happy Independence Day! Jai Hind! 🇮🇳', emoji: '🇮🇳🎆', type: 'national' },
  { name: 'Gandhi Jayanti', month: 10, day: 2, regions: ['IN'], greeting: 'Remembering the Father of the Nation on Gandhi Jayanti. Be the change you wish to see.', emoji: '🕊️🇮🇳', type: 'national' },
  { name: 'Onam', month: 8, day: 29, regions: ['IN-KL'], greeting: 'Happy Onam! May King Mahabali bless you with joy and prosperity!', emoji: '🌸🐍🛶', type: 'regional' },
  { name: 'Pongal', month: 1, day: 14, endDay: 17, regions: ['IN-TN'], greeting: 'Happy Pongal! May the harvest festival bring sweetness to your life!', emoji: '🌾🍚☀️', type: 'regional' },
  { name: 'Ugadi', month: 3, day: 30, regions: ['IN-AP', 'IN-TG', 'IN-KA'], greeting: 'Ugadi Subhakankshalu! Happy New Year!', emoji: '🌸🎊', type: 'regional' },
  { name: 'Baisakhi', month: 4, day: 13, regions: ['IN-PB', 'IN-HR'], greeting: 'Happy Baisakhi! May the harvest season bring you prosperity!', emoji: '🌾🎶💛', type: 'regional' },
  { name: 'Makar Sankranti', month: 1, day: 14, regions: ['IN'], greeting: 'Happy Makar Sankranti! May the sun bring warmth and new beginnings!', emoji: '☀️🪁🌾', type: 'cultural' },
  { name: 'Holi', month: 3, day: 14, regions: ['IN', 'NP'], greeting: 'Happy Holi! May your life be as colorful as this festival! 🎨', emoji: '🎨💜💚', type: 'cultural' },
  { name: 'Raksha Bandhan', month: 8, day: 9, regions: ['IN'], greeting: 'Happy Raksha Bandhan! Celebrating the beautiful bond between siblings!', emoji: '🧶❤️', type: 'cultural' },
  { name: 'Ganesh Chaturthi', month: 9, day: 5, regions: ['IN-MH', 'IN-KA', 'IN-AP', 'IN-TG', 'IN-GA'], greeting: 'Ganpati Bappa Morya! Happy Ganesh Chaturthi!', emoji: '🐘🪷🙏', type: 'religious' },
  { name: 'Navratri', month: 10, day: 2, endDay: 11, regions: ['IN-GJ', 'IN'], greeting: 'Happy Navratri! May Goddess Durga bless you with strength and wisdom!', emoji: '🪷🔱💃', type: 'religious' },
  { name: 'Durga Puja', month: 10, day: 9, endDay: 13, regions: ['IN-WB', 'IN-AS', 'IN-OR'], greeting: 'Shubho Durga Puja! May Ma Durga protect and bless you!', emoji: '🪷🔱🙏', type: 'religious' },

  // ═══ USA ═══
  { name: 'New Year\'s Day', month: 1, day: 1, regions: ['GLOBAL'], greeting: 'Happy New Year! Here\'s to amazing new beginnings!', emoji: '🎊🥂✨', type: 'cultural' },
  { name: 'Martin Luther King Jr. Day', month: 1, day: 20, regions: ['US'], greeting: 'Honoring the legacy of Dr. Martin Luther King Jr. Let us dream and act for justice.', emoji: '✊🕊️', type: 'national' },
  { name: 'Valentine\'s Day', month: 2, day: 14, regions: ['GLOBAL'], greeting: 'Happy Valentine\'s Day! Sending love your way! 💕', emoji: '❤️💕🌹', type: 'cultural' },
  { name: 'Independence Day (USA)', month: 7, day: 4, regions: ['US'], greeting: 'Happy 4th of July! Celebrating freedom and unity! 🇺🇸', emoji: '🇺🇸🎆🗽', type: 'national' },
  { name: 'Thanksgiving (USA)', month: 11, day: 27, regions: ['US'], greeting: 'Happy Thanksgiving! Grateful for you and all the blessings in life!', emoji: '🦃🍂🧡', type: 'national' },
  { name: 'Halloween', month: 10, day: 31, regions: ['US', 'UK', 'CA', 'AU', 'IE'], greeting: 'Happy Halloween! Hope your day is spook-tacular! 🎃', emoji: '🎃👻🦇', type: 'cultural' },

  // ═══ CHRISTMAS (Global) ═══
  { name: 'Christmas', month: 12, day: 25,
    regions: ['GLOBAL'],
    namePatterns: [/\b(john|mary|paul|peter|james|michael|david|sarah|grace|faith|hope|matthew|mark|luke|joseph|daniel|samuel|benjamin|elizabeth|anna|rachel|ruth|esther|thomas|andrew|philip|stephen|george|christopher|nicholas|anthony|patrick|francis|christine|catherine|margaret|victoria|claire|maria|rosa|teresa|gabriel|raphael|emmanuel|noel|natasha|christian|carol|holly)\b/i],
    greeting: 'Merry Christmas! May the spirit of Christmas fill your heart with warmth and love!',
    emoji: '🎄🎅❄️', type: 'religious',
  },
  { name: 'Christmas Eve', month: 12, day: 24, regions: ['GLOBAL'], greeting: 'Merry Christmas Eve! The magic of Christmas is almost here!', emoji: '🎄⭐', type: 'religious' },

  // ═══ UK / EUROPE ═══
  { name: 'St. Patrick\'s Day', month: 3, day: 17, regions: ['IE', 'UK', 'US'], greeting: 'Happy St. Patrick\'s Day! May luck be on your side! ☘️', emoji: '☘️🍀💚', type: 'cultural' },
  { name: 'Bastille Day (France)', month: 7, day: 14, regions: ['FR'], greeting: 'Joyeux 14 Juillet! Vive la France! 🇫🇷', emoji: '🇫🇷🎆', type: 'national' },
  { name: 'German Unity Day', month: 10, day: 3, regions: ['DE'], greeting: 'Happy German Unity Day! Tag der Deutschen Einheit!', emoji: '🇩🇪🎊', type: 'national' },
  { name: 'King\'s Day (Netherlands)', month: 4, day: 27, regions: ['NL'], greeting: 'Happy King\'s Day! Fijne Koningsdag! 🧡', emoji: '🧡👑🇳🇱', type: 'national' },

  // ═══ EAST ASIA ═══
  { name: 'Buddha\'s Birthday (Vesak)', month: 5, day: 12, regions: ['KR', 'JP', 'TH', 'LK', 'MM', 'KH', 'LA', 'IN', 'NP'], greeting: 'Happy Vesak! May peace and compassion guide your path.', emoji: '🪷☸️🙏', type: 'religious' },
  { name: 'Chuseok (Korean Thanksgiving)', month: 9, day: 17, regions: ['KR'], greeting: 'Happy Chuseok! Enjoy this beautiful harvest season with family!', emoji: '🌕🍂🎑', type: 'cultural' },
  { name: 'Golden Week Start (Japan)', month: 4, day: 29, regions: ['JP'], greeting: 'Happy Golden Week! Enjoy the holiday season!', emoji: '🇯🇵🌸', type: 'national' },
  { name: 'Tanabata (Japan)', month: 7, day: 7, regions: ['JP'], greeting: 'Happy Tanabata! May your wishes come true among the stars! 🎋', emoji: '🎋⭐🌌', type: 'cultural' },

  // ═══ MIDDLE EAST ═══
  { name: 'UAE National Day', month: 12, day: 2, regions: ['AE'], greeting: 'Happy UAE National Day! 🇦🇪', emoji: '🇦🇪🎆', type: 'national' },
  { name: 'Saudi National Day', month: 9, day: 23, regions: ['SA'], greeting: 'Happy Saudi National Day! 🇸🇦', emoji: '🇸🇦🎊', type: 'national' },

  // ═══ SOUTHEAST ASIA ═══
  { name: 'Songkran (Thai New Year)', month: 4, day: 13, endDay: 15, regions: ['TH', 'LA', 'KH', 'MM'], greeting: 'Sawasdee Pee Mai! Happy Songkran! May the water wash away all worries!', emoji: '💧🔫🎉', type: 'cultural' },

  // ═══ AFRICA ═══
  { name: 'Africa Day', month: 5, day: 25, regions: ['ZA', 'NG', 'KE', 'ET', 'GH', 'TZ', 'EG', 'MA', 'TN'], greeting: 'Happy Africa Day! Celebrating the unity and strength of the continent!', emoji: '🌍✊🎊', type: 'cultural' },
  { name: 'Heritage Day (South Africa)', month: 9, day: 24, regions: ['ZA'], greeting: 'Happy Heritage Day! Celebrating South Africa\'s beautiful diversity!', emoji: '🇿🇦🌈🎉', type: 'national' },

  // ═══ SOUTH AMERICA ═══
  { name: 'Carnival (Brazil)', month: 2, day: 28, endDay: 3, regions: ['BR'], greeting: 'Feliz Carnaval! Let the celebrations begin! 🎭', emoji: '🎭💃🎶', type: 'cultural' },

  // ═══ OCEANIA ═══
  { name: 'Australia Day', month: 1, day: 26, regions: ['AU'], greeting: 'Happy Australia Day! 🇦🇺', emoji: '🇦🇺🦘', type: 'national' },
  { name: 'Waitangi Day (New Zealand)', month: 2, day: 6, regions: ['NZ'], greeting: 'Happy Waitangi Day! 🇳🇿', emoji: '🇳🇿🌿', type: 'national' },
  { name: 'ANZAC Day', month: 4, day: 25, regions: ['AU', 'NZ'], greeting: 'Lest we forget. Honoring the ANZAC spirit today.', emoji: '🌺🙏', type: 'national' },

  // ═══ JEWISH HOLIDAYS (approximate) ═══
  { name: 'Hanukkah', month: 12, day: 14, endDay: 22,
    regions: ['IL', 'US', 'UK', 'FR', 'CA'],
    namePatterns: [/\b(david|sarah|rachel|rebecca|miriam|isaac|jacob|aaron|moses|solomon|ruth|esther|naomi|hannah|abigail|benjamin|noah|nathan|eli|levy|cohen|goldberg|rosenberg|weinstein|bernstein|friedman|schwartz)\b/i],
    greeting: 'Happy Hanukkah! May the Festival of Lights brighten your life!',
    emoji: '🕎✡️🕯️', type: 'religious',
  },

  // ═══ UNIVERSAL ═══
  { name: 'Mother\'s Day', month: 5, day: 11, regions: ['US', 'CA', 'AU', 'NZ', 'IN', 'GLOBAL'], greeting: 'Happy Mother\'s Day! Celebrating the incredible mothers in our lives!', emoji: '💐👩‍👧‍👦❤️', type: 'cultural' },
  { name: 'Father\'s Day', month: 6, day: 15, regions: ['US', 'CA', 'UK', 'IN', 'GLOBAL'], greeting: 'Happy Father\'s Day! Honoring all the amazing dads out there!', emoji: '👔👨‍👧‍👦💙', type: 'cultural' },
  { name: 'International Women\'s Day', month: 3, day: 8, regions: ['GLOBAL'], greeting: 'Happy International Women\'s Day! Celebrating the strength, courage, and brilliance of women everywhere!', emoji: '💜👩‍💼🌸', type: 'cultural' },
  { name: 'Earth Day', month: 4, day: 22, regions: ['GLOBAL'], greeting: 'Happy Earth Day! Let\'s cherish and protect our beautiful planet!', emoji: '🌍🌱💚', type: 'cultural' },
  { name: 'World Mental Health Day', month: 10, day: 10, regions: ['GLOBAL'], greeting: 'Today is World Mental Health Day. Remember, it\'s okay to not be okay. I\'m here for you. 💚', emoji: '💚🧠🤗', type: 'cultural' },
];

// ═══ LOCATION → REGION MAPPING ═══
export const LOCATION_TO_REGION: Record<string, string[]> = {
  // India states
  'kerala': ['IN-KL', 'IN'], 'trivandrum': ['IN-KL', 'IN'], 'thiruvananthapuram': ['IN-KL', 'IN'],
  'kochi': ['IN-KL', 'IN'], 'kozhikode': ['IN-KL', 'IN'], 'calicut': ['IN-KL', 'IN'],
  'kannur': ['IN-KL', 'IN'], 'thrissur': ['IN-KL', 'IN'], 'ernakulam': ['IN-KL', 'IN'],
  'tamil nadu': ['IN-TN', 'IN'], 'tamilnadu': ['IN-TN', 'IN'], 'chennai': ['IN-TN', 'IN'],
  'madurai': ['IN-TN', 'IN'], 'coimbatore': ['IN-TN', 'IN'], 'salem': ['IN-TN', 'IN'],
  'karnataka': ['IN-KA', 'IN'], 'bangalore': ['IN-KA', 'IN'], 'bengaluru': ['IN-KA', 'IN'],
  'mysore': ['IN-KA', 'IN'], 'mangalore': ['IN-KA', 'IN'],
  'west bengal': ['IN-WB', 'IN'], 'kolkata': ['IN-WB', 'IN'],
  'assam': ['IN-AS', 'IN'], 'guwahati': ['IN-AS', 'IN'],
  'maharashtra': ['IN-MH', 'IN'], 'mumbai': ['IN-MH', 'IN'], 'pune': ['IN-MH', 'IN'],
  'goa': ['IN-GA', 'IN'], 'gujarat': ['IN-GJ', 'IN'], 'ahmedabad': ['IN-GJ', 'IN'],
  'andhra pradesh': ['IN-AP', 'IN'], 'hyderabad': ['IN-TG', 'IN'], 'telangana': ['IN-TG', 'IN'],
  'delhi': ['IN', 'IN-DL'], 'new delhi': ['IN', 'IN-DL'],
  'punjab': ['IN-PB', 'IN'], 'haryana': ['IN-HR', 'IN'],
  'rajasthan': ['IN-RJ', 'IN'], 'jaipur': ['IN-RJ', 'IN'],
  'uttar pradesh': ['IN-UP', 'IN'], 'lucknow': ['IN-UP', 'IN'],
  'odisha': ['IN-OR', 'IN'], 'bhubaneswar': ['IN-OR', 'IN'],
  'india': ['IN'],

  // Countries
  'united states': ['US'], 'usa': ['US'], 'america': ['US'],
  'new york': ['US'], 'los angeles': ['US'], 'chicago': ['US'], 'san francisco': ['US'],
  'united kingdom': ['UK'], 'london': ['UK'], 'england': ['UK'],
  'france': ['FR'], 'paris': ['FR'],
  'germany': ['DE'], 'berlin': ['DE'], 'munich': ['DE'],
  'netherlands': ['NL'], 'amsterdam': ['NL'],
  'japan': ['JP'], 'tokyo': ['JP'], 'osaka': ['JP'],
  'south korea': ['KR'], 'seoul': ['KR'],
  'china': ['CN'], 'beijing': ['CN'], 'shanghai': ['CN'],
  'thailand': ['TH'], 'bangkok': ['TH'],
  'singapore': ['SG'], 'malaysia': ['MY'], 'kuala lumpur': ['MY'],
  'indonesia': ['ID'], 'jakarta': ['ID'],
  'philippines': ['PH'], 'manila': ['PH'],
  'vietnam': ['VN'], 'hanoi': ['VN'],
  'pakistan': ['PK'], 'karachi': ['PK'], 'lahore': ['PK'], 'islamabad': ['PK'],
  'bangladesh': ['BD'], 'dhaka': ['BD'],
  'sri lanka': ['LK'], 'colombo': ['LK'],
  'uae': ['AE'], 'dubai': ['AE'], 'abu dhabi': ['AE'],
  'saudi arabia': ['SA'], 'riyadh': ['SA'],
  'turkey': ['TR'], 'istanbul': ['TR'],
  'israel': ['IL'], 'tel aviv': ['IL'],
  'egypt': ['EG'], 'cairo': ['EG'],
  'south africa': ['ZA'], 'cape town': ['ZA'], 'johannesburg': ['ZA'],
  'nigeria': ['NG'], 'lagos': ['NG'],
  'kenya': ['KE'], 'nairobi': ['KE'],
  'ethiopia': ['ET'], 'addis ababa': ['ET'],
  'ghana': ['GH'], 'accra': ['GH'],
  'tanzania': ['TZ'], 'dar es salaam': ['TZ'],
  'morocco': ['MA'], 'casablanca': ['MA'],
  'tunisia': ['TN'], 'tunis': ['TN'],
  'australia': ['AU'], 'sydney': ['AU'], 'melbourne': ['AU'],
  'new zealand': ['NZ'], 'auckland': ['NZ'],
  'brazil': ['BR'], 'sao paulo': ['BR'], 'rio de janeiro': ['BR'],
  'argentina': ['AR'], 'buenos aires': ['AR'],
  'colombia': ['CO'], 'bogota': ['CO'],
  'mexico': ['MX'], 'mexico city': ['MX'],
  'canada': ['CA'], 'toronto': ['CA'], 'vancouver': ['CA'],
  'ireland': ['IE'], 'dublin': ['IE'],
  'nepal': ['NP'], 'kathmandu': ['NP'],
};

// ═══ COUNTRY CODE → REGION MAPPING ═══
const COUNTRY_CODE_TO_REGIONS: Record<string, string[]> = {
  'IN': ['IN'], 'US': ['US'], 'UK': ['UK'], 'GB': ['UK'], 'FR': ['FR'], 'DE': ['DE'],
  'NL': ['NL'], 'JP': ['JP'], 'KR': ['KR'], 'CN': ['CN'], 'TH': ['TH'], 'SG': ['SG'],
  'MY': ['MY'], 'ID': ['ID'], 'PH': ['PH'], 'VN': ['VN'], 'PK': ['PK'], 'BD': ['BD'],
  'LK': ['LK'], 'AE': ['AE'], 'SA': ['SA'], 'TR': ['TR'], 'IL': ['IL'], 'EG': ['EG'],
  'ZA': ['ZA'], 'NG': ['NG'], 'KE': ['KE'], 'ET': ['ET'], 'GH': ['GH'], 'TZ': ['TZ'],
  'MA': ['MA'], 'TN': ['TN'], 'AU': ['AU'], 'NZ': ['NZ'], 'BR': ['BR'], 'AR': ['AR'],
  'CO': ['CO'], 'MX': ['MX'], 'CA': ['CA'], 'IE': ['IE'], 'NP': ['NP'],
};

// ═══ MAIN DETECTION FUNCTION ═══
export function detectTodaysFestivals(
  userLocation?: string,
  userName?: string,
  userCountry?: string,
): Festival[] {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const year = now.getFullYear();

  // Combine fixed + movable festivals
  const allFestivals = [...FIXED_FESTIVALS, ...getMovableFestivals(year)];

  // Resolve user regions from location
  const userRegions: string[] = ['GLOBAL'];
  if (userLocation) {
    const loc = userLocation.toLowerCase().trim();
    for (const [key, regions] of Object.entries(LOCATION_TO_REGION)) {
      if (loc.includes(key) || key.includes(loc)) {
        userRegions.push(...regions);
      }
    }
  }
  if (userCountry) {
    const c = userCountry.trim();
    // First check exact country code match (e.g., "IN", "US")
    const upperCode = c.toUpperCase();
    if (COUNTRY_CODE_TO_REGIONS[upperCode]) {
      userRegions.push(...COUNTRY_CODE_TO_REGIONS[upperCode]);
    }
    // Also check by country name
    const lower = c.toLowerCase();
    for (const [key, regions] of Object.entries(LOCATION_TO_REGION)) {
      if (lower.includes(key) || key.includes(lower)) {
        userRegions.push(...regions);
      }
    }
  }

  const uniqueRegions = [...new Set(userRegions)];
  const lowerName = (userName || '').toLowerCase();

  const matches: Festival[] = [];

  for (const f of allFestivals) {
    // Check date match
    const endDay = f.endDay || f.day;
    if (f.month !== month) continue;
    if (day < f.day || day > endDay) continue;

    // Check region OR name match
    const regionMatch = f.regions.some(r => uniqueRegions.includes(r));
    const nameMatch = f.namePatterns?.some(p => p.test(lowerName)) || false;

    if (regionMatch || nameMatch) {
      matches.push(f);
    }
  }

  return matches;
}

// ═══ BIRTHDAY DETECTION ═══
export function isBirthdayToday(dateOfBirth: string | Date | null): boolean {
  if (!dateOfBirth) return false;
  const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  const now = new Date();
  return dob.getMonth() === now.getMonth() && dob.getDate() === now.getDate();
}

export function getBirthdayGreeting(name: string, age?: number): string {
  const ageText = age ? ` You're turning ${age} today!` : '';
  const greetings = [
    `🎂🎉 HAPPY BIRTHDAY, ${name}!${ageText} I hope your day is as amazing as you are! Wishing you love, laughter, and everything your heart desires! 🥳💛`,
    `🎂 Happy Birthday, ${name}!${ageText} Another beautiful year of your life begins today. I'm so grateful to know you! 🎈💕`,
    `🥳🎉 It's YOUR day, ${name}!${ageText} May this birthday bring you closer to all your dreams. You deserve all the happiness! 🎂✨`,
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
}

// ═══ FAMILY BIRTHDAY DETECTION ═══
export function getFamilyBirthdayReminder(
  familyMember: string,
  relation: string,
  userName: string,
): string {
  return `Hey ${userName}! Just a reminder — today is your ${relation} ${familyMember}'s birthday! 🎂 Don't forget to wish them! Would you like me to help you draft a message? 💛`;
}
