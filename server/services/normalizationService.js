import crypto from "node:crypto";
import { categoryKeywords } from "../config/categories.js";
import { translateTextToEnglish } from "./translationService.js";

const COMPOUND_TLDS = new Set([
  "ac.uk",
  "co.il",
  "co.in",
  "co.jp",
  "co.nz",
  "co.uk",
  "com.au",
  "com.br",
  "com.cn",
  "com.mx",
  "com.tr",
  "gov.uk",
  "net.au",
  "org.uk",
  "or.jp"
]);

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "before", "but", "by", "for",
  "from", "in", "into", "is", "it", "its", "of", "on", "or", "over", "that",
  "the", "their", "this", "to", "under", "was", "were", "with", "while"
]);

const TITLE_BOILERPLATE_PHRASES = [
  "advertisement",
  "analysis",
  "breaking news",
  "full coverage",
  "latest articles",
  "latest developments",
  "latest updates",
  "live updates",
  "newsletter",
  "opinion",
  "photos",
  "press release",
  "summary of events",
  "sponsored",
  "video",
  "watch live",
  "what to know"
];

const TITLE_PREFIX_PATTERNS = [
  /^breaking news\s+/u,
  /^latest updates?\s+/u,
  /^the latest\s*[:|-]\s*/u,
  /^live updates?\s+/u,
  /^news\s*[:|-]\s*/u,
  /^update\s*[:|-]\s*/u,
  /^watch live\s*[:|-]\s*/u
];

const GENERIC_ROUNDUP_PATTERNS = [
  /^(latest articles|latest updates?|live updates?|full coverage)$/u,
  /^(news|update|story|coverage)$/u,
  /latest developments?/u,
  /summary of events/u,
  /what to know/u
];

const SEO_PATTERNS = [
  /best of/u,
  /full coverage/u,
  /how to/u,
  /newsletter/u,
  /photos?/u,
  /press release/u,
  /sponsored/u,
  /top\s+\d+/u,
  /video/u,
  /watch live/u,
  /what to know/u
];

const PROMO_WRAPPER_PATTERNS = [
  /advertisement/u,
  /all you need to know/u,
  /best of/u,
  /everything to know/u,
  /full guide/u,
  /partner content/u,
  /sponsored/u,
  /top\s+\d+/u,
  /what to know/u
];

const GENERIC_SERVICE_UPDATE_PATTERNS = [
  /customer advisory/u,
  /maintenance notice/u,
  /planned maintenance/u,
  /routine notice/u,
  /scheduled maintenance/u,
  /service interruption/u,
  /service notice/u,
  /status page update/u,
  /temporary downtime/u
];

const NON_EVENT_INFRASTRUCTURE_PATTERNS = [
  /coverage expansion/u,
  /coverage map/u,
  /feature release/u,
  /launches new route/u,
  /launches service/u,
  /network coverage/u,
  /pricing update/u,
  /service map/u,
  /service plan/u,
  /subscription plan/u
];

const ARTICLE_HUB_PATTERNS = [
  /all coverage/u,
  /coverage hub/u,
  /latest articles/u,
  /live blog/u,
  /newsroom/u,
  /topic page/u,
  /updates page/u
];

const COMMERCIAL_VENDOR_TERMS = [
  "announces",
  "bulb",
  "customer",
  "dimmable",
  "enterprise",
  "partner",
  "platform",
  "pricing",
  "product",
  "provider",
  "remote",
  "sale",
  "service provider",
  "set of",
  "smart",
  "subscription",
  "telecom",
  "timer",
  "vendor"
];

const INFRASTRUCTURE_TEXTURE_TERMS = [
  "airport",
  "broadband",
  "communications",
  "coverage",
  "electricity",
  "grid",
  "internet",
  "network",
  "pipeline",
  "port",
  "power",
  "rail",
  "route",
  "service",
  "shipping",
  "telecom"
];

const STRONG_EVENT_PATTERNS = [
  /air\/drone strike/u,
  /attack/u,
  /blackout after/u,
  /blast/u,
  /breach/u,
  /ceasefire/u,
  /closure/u,
  /crash/u,
  /disruption/u,
  /drone strike/u,
  /evacuated/u,
  /explosion/u,
  /halted/u,
  /hostages?/u,
  /incursion/u,
  /missile/u,
  /protests?/u,
  /sabotage/u,
  /shelling/u,
  /shooting/u,
  /strike/u,
  /war/u
];

const LOCAL_INCIDENT_PATTERNS = [
  /city street/u,
  /intersection/u,
  /local road/u,
  /one driver/u,
  /road accident/u,
  /single vehicle/u,
  /traffic incident/u,
  /vehicle collision/u
];

const MUNICIPAL_UTILITY_PATTERNS = [
  /city utility/u,
  /customers in the dark/u,
  /hydro customers/u,
  /municipal utility/u,
  /power outage affects about/u,
  /utility crews/u,
  /utility notice/u
];

const TRAFFIC_COLLISION_PATTERNS = [
  /car accident/u,
  /car crash/u,
  /collision/u,
  /crash/u,
  /road collision/u,
  /traffic collision/u,
  /vehicle accident/u
];

const LOCAL_CRIME_PATTERNS = [
  /arrested/u,
  /charged/u,
  /deputies/u,
  /homicide/u,
  /police say/u,
  /robbery/u,
  /sheriff/u,
  /shooting investigation/u
];

const STRATEGIC_INFRASTRUCTURE_PATTERNS = [
  /airport/u,
  /border crossing/u,
  /grid/u,
  /national rail/u,
  /pipeline/u,
  /port/u,
  /power plant/u,
  /rail corridor/u,
  /refinery/u,
  /shipping lane/u,
  /strait of hormuz/u,
  /telecom backbone/u,
  /terminal/u
];

const STATE_ACTOR_PATTERNS = [
  /army/u,
  /cabinet/u,
  /defense/u,
  /foreign minister/u,
  /government/u,
  /military/u,
  /ministry/u,
  /parliament/u,
  /president/u,
  /prime minister/u,
  /state agency/u,
  /state media/u
];

const CROSS_BORDER_PATTERNS = [
  /ceasefire/u,
  /cross border/u,
  /customs/u,
  /embassy/u,
  /foreign ministry/u,
  /gulf states/u,
  /international/u,
  /maritime/u,
  /sanctions?/u,
  /shipping lane/u,
  /strait of hormuz/u,
  /trade route/u
];

const NATIONAL_IMPACT_PATTERNS = [
  /across the country/u,
  /countrywide/u,
  /millions of customers/u,
  /national grid/u,
  /national impact/u,
  /nationwide/u,
  /major airport/u,
  /across canada/u,
  /across ukraine/u
];

const MILITARY_ACTOR_PATTERNS = [
  /air force/u,
  /armed forces/u,
  /army/u,
  /brigade/u,
  /defense forces/u,
  /drone unit/u,
  /general staff/u,
  /military command/u,
  /missile unit/u,
  /navy/u
];

const DEFENSE_SECURITY_INSTITUTION_PATTERNS = [
  /defense ministry/u,
  /general staff/u,
  /homeland security/u,
  /intelligence service/u,
  /interior ministry/u,
  /national police/u,
  /security council/u,
  /security service/u
];

const RETALIATION_LANGUAGE_PATTERNS = [
  /answers attack with/u,
  /in response to/u,
  /responds after/u,
  /retaliat/u,
  /revenge strike/u,
  /tit for tat/u
];

const CEASEFIRE_BREAKDOWN_PATTERNS = [
  /ceasefire (?:collapse|collapsed|fails?|violat|breaks? down)/u,
  /peace talks fail/u,
  /renewed strikes after truce/u,
  /talks break down/u,
  /truce (?:collapse|collapsed|violat)/u
];

const SANCTION_POLICY_PRESSURE_PATTERNS = [
  /embargo/u,
  /export controls?/u,
  /sanctions?/u,
  /tariff retaliation/u,
  /trade restrictions?/u
];

const MOBILIZATION_PATTERNS = [
  /force deployment/u,
  /military alert/u,
  /mobilization/u,
  /reservists?/u,
  /troop buildup/u
];

const DIPLOMATIC_CRISIS_PATTERNS = [
  /ambassadors? recalled/u,
  /crisis talks/u,
  /diplomatic relations downgraded/u,
  /emergency session/u,
  /formal protest/u,
  /urgent talks/u
];

const RAW_TONE_TO_DISPLAY = {
  neutral: "procedural",
  curious: "exploratory",
  frustrated: "hardening",
  defensive: "guarded"
};

const TONE_CLASS_ORDER = ["neutral", "curious", "frustrated", "defensive"];
const TONE_ENTROPY_MAX = Math.log2(TONE_CLASS_ORDER.length);

const TONE_TERM_MAP = {
  neutral: [
    "advisory",
    "clarified",
    "confirms",
    "coordination",
    "guidance",
    "maintenance",
    "meeting",
    "notice",
    "operator",
    "operational",
    "procedural",
    "recovery",
    "restore",
    "restored",
    "scheduled",
    "service recovery",
    "status",
    "technical talks",
    "update"
  ],
  curious: [
    "assessing",
    "considering",
    "consultation",
    "dialogue",
    "exploring",
    "inquiry",
    "monitoring",
    "probe",
    "review",
    "seeking",
    "sounding out",
    "studying",
    "under review",
    "watching"
  ],
  frustrated: [
    "attack",
    "clash",
    "condemns",
    "crisis",
    "escalation",
    "flare up",
    "hostile",
    "missile",
    "mobilization",
    "offensive",
    "retaliate",
    "retaliation",
    "sanction",
    "shelling",
    "strike",
    "threat",
    "threatens",
    "warning"
  ],
  defensive: [
    "air defense",
    "alert",
    "brace",
    "closed airspace",
    "contain",
    "containment",
    "curfew",
    "denies",
    "guard",
    "intercept",
    "protect",
    "restriction",
    "security measure",
    "shelter",
    "shield",
    "withstand"
  ]
};

const CATEGORY_TONE_PRIORS = {
  security: { frustrated: 0.2, defensive: 0.14 },
  diplomacy: { neutral: 0.14, curious: 0.12 },
  infrastructure: { neutral: 0.16, defensive: 0.08 },
  cyber: { defensive: 0.14, frustrated: 0.08 },
  policy: { neutral: 0.12, curious: 0.1 },
  information: { curious: 0.08, defensive: 0.06 }
};

const ENTERTAINMENT_TERMS = [
  "actor",
  "album",
  "celebrity",
  "concert",
  "daughter",
  "festival",
  "movie",
  "music",
  "roan",
  "singer",
  "star"
];

const ACTION_TERMS = [
  "advisory",
  "agreement",
  "attack",
  "banned",
  "breach",
  "cancelled",
  "ceasefire",
  "collapse",
  "closed",
  "closure",
  "crash",
  "delay",
  "denies",
  "discussed",
  "disruption",
  "evacuated",
  "halted",
  "launch",
  "meeting",
  "negotiation",
  "outage",
  "pause",
  "postpones",
  "restore",
  "restriction",
  "strike",
  "talks",
  "threatens",
  "warns"
];

const INCIDENT_LOCATION_ALIASES = [
  {
    region: "Saudi Arabia",
    country: "Saudi Arabia",
    location: "Prince Sultan Air Base",
    type: "site",
    confidence: 0.96,
    priority: 110,
    tokens: ["saudi_arabia", "saudi_air_base", "prince_sultan_air_base"],
    patterns: [
      /prince sultan air\s*base/u,
      /prince sultan airbase/u,
      /saudi air base/u,
      /saudi arabia base/u
    ]
  },
  {
    region: "Saudi Arabia",
    country: "Saudi Arabia",
    location: "Saudi Arabia",
    type: "country",
    confidence: 0.88,
    priority: 72,
    tokens: ["saudi_arabia"],
    patterns: [
      /\bsaudi arabia\b/u,
      /\b(?:in|at|near|around|on)\s+saudi\b/u,
      /\b(?:in|at|near|around|on)\s+saudi arabia\b/u,
      /\bsaudi base\b/u
    ]
  },
  {
    region: "Qatar",
    country: "Qatar",
    location: "Al Udeid Air Base",
    type: "site",
    confidence: 0.96,
    priority: 110,
    tokens: ["qatar", "al_udeid_air_base", "al_udeid"],
    patterns: [
      /\bal udeid\b/u,
      /\bal[- ]udeid air\s*base\b/u
    ]
  },
  {
    region: "Turkiye",
    country: "Turkiye",
    location: "Incirlik Air Base",
    type: "site",
    confidence: 0.96,
    priority: 110,
    tokens: ["turkiye", "incirlik_air_base", "incirlik"],
    patterns: [
      /\bincirlik\b/u,
      /\bincirlik air\s*base\b/u
    ]
  },
  {
    region: "Germany",
    country: "Germany",
    location: "Ramstein Air Base",
    type: "site",
    confidence: 0.96,
    priority: 110,
    tokens: ["germany", "ramstein_air_base", "ramstein"],
    patterns: [
      /\bramstein\b/u,
      /\bramstein air\s*base\b/u
    ]
  },
  {
    region: "Egypt",
    country: "Egypt",
    location: "Suez Canal",
    type: "chokepoint",
    confidence: 0.97,
    priority: 108,
    tokens: ["egypt", "suez_canal", "suez"],
    patterns: [
      /\bsuez canal\b/u,
      /\bcanal de suez\b/u
    ]
  },
  {
    region: "Bab el-Mandeb",
    country: null,
    location: "Bab el-Mandeb",
    type: "chokepoint",
    confidence: 0.97,
    priority: 108,
    tokens: ["bab_el_mandeb", "mandeb"],
    patterns: [
      /\bbab el[- ]mandeb\b/u,
      /\bmandeb\b/u
    ]
  },
  {
    region: "Red Sea",
    country: null,
    location: "Red Sea",
    type: "region",
    confidence: 0.93,
    priority: 96,
    tokens: ["red_sea"],
    patterns: [
      /\bred sea\b/u
    ]
  },
  {
    region: "Black Sea",
    country: null,
    location: "Black Sea",
    type: "region",
    confidence: 0.93,
    priority: 96,
    tokens: ["black_sea"],
    patterns: [
      /\bblack sea\b/u
    ]
  },
  {
    region: "Ukraine",
    country: "Ukraine",
    location: "Port of Odesa",
    type: "port",
    confidence: 0.95,
    priority: 104,
    tokens: ["ukraine", "odesa", "port_of_odesa"],
    patterns: [
      /\bport of odesa\b/u,
      /\bport of odessa\b/u,
      /\bodesa port\b/u,
      /\bodessa port\b/u
    ]
  },
  {
    region: "Sudan",
    country: "Sudan",
    location: "Port Sudan",
    type: "port",
    confidence: 0.95,
    priority: 104,
    tokens: ["sudan", "port_sudan"],
    patterns: [
      /\bport sudan\b/u
    ]
  },
  {
    region: "Israel",
    country: "Israel",
    location: "Ben Gurion Airport",
    type: "airport",
    confidence: 0.95,
    priority: 104,
    tokens: ["israel", "ben_gurion_airport", "ben_gurion"],
    patterns: [
      /\bben gurion\b/u,
      /\bben gurion airport\b/u
    ]
  },
  {
    region: "United Kingdom",
    country: "United Kingdom",
    location: "Heathrow Airport",
    type: "airport",
    confidence: 0.95,
    priority: 104,
    tokens: ["united_kingdom", "heathrow_airport", "heathrow"],
    patterns: [
      /\bheathrow\b/u,
      /\bheathrow airport\b/u
    ]
  },
  {
    region: "Russia",
    country: "Russia",
    location: "Sheremetyevo Airport",
    type: "airport",
    confidence: 0.95,
    priority: 104,
    tokens: ["russia", "sheremetyevo_airport", "sheremetyevo"],
    patterns: [
      /\bsheremetyevo\b/u,
      /\bsheremetyevo airport\b/u
    ]
  },
  {
    region: "Ukraine",
    country: "Ukraine",
    location: "Boryspil Airport",
    type: "airport",
    confidence: 0.95,
    priority: 104,
    tokens: ["ukraine", "boryspil_airport", "boryspil"],
    patterns: [
      /\bboryspil\b/u,
      /\bboryspil airport\b/u
    ]
  },
  {
    region: "Ukraine",
    country: "Ukraine",
    location: "Kharkiv",
    type: "city",
    confidence: 0.93,
    priority: 94,
    tokens: ["ukraine", "kharkiv"],
    patterns: [
      /\bkharkiv\b/u
    ]
  },
  {
    region: "Ukraine",
    country: "Ukraine",
    location: "Odesa",
    type: "city",
    confidence: 0.93,
    priority: 94,
    tokens: ["ukraine", "odesa"],
    patterns: [
      /\bodesa\b/u,
      /\bodessa\b/u
    ]
  },
  {
    region: "Ukraine",
    country: "Ukraine",
    location: "Donbas",
    type: "region",
    confidence: 0.93,
    priority: 94,
    tokens: ["ukraine", "donbas"],
    patterns: [
      /\bdonbas\b/u
    ]
  },
  {
    region: "West Bank",
    country: null,
    location: "West Bank",
    type: "region",
    confidence: 0.93,
    priority: 94,
    tokens: ["west_bank"],
    patterns: [
      /\bwest bank\b/u
    ]
  },
  {
    region: "Europe",
    country: null,
    location: "Europe",
    type: "region",
    confidence: 0.9,
    priority: 78,
    tokens: ["europe", "european_union"],
    patterns: [
      /\beurope\b/u,
      /\beuropean union\b/u,
      /\beuropean\b/u
    ]
  },
  {
    region: "Belgium",
    country: "Belgium",
    location: "Belgium",
    type: "country",
    confidence: 0.9,
    priority: 78,
    tokens: ["belgium"],
    patterns: [
      /\bbelgique\b/u,
      /^\s*belgium\b/u,
      /^\s*belgique\b/u
    ]
  },
  {
    region: "Strait of Hormuz",
    country: null,
    location: "Strait of Hormuz",
    type: "chokepoint",
    confidence: 0.97,
    priority: 108,
    tokens: ["strait_of_hormuz", "hormuz"],
    patterns: [
      /strait of hormuz/u,
      /\bhormuz\b/u
    ]
  },
  {
    region: "Gaza",
    country: null,
    location: "Gaza",
    type: "region",
    confidence: 0.93,
    priority: 94,
    tokens: ["gaza"],
    patterns: [
      /\bgaza\b/u,
      /\bgaza strip\b/u
    ]
  }
];

const EXPLICIT_TEXT_LOCATION_ALIASES = [
  {
    region: "Israel",
    country: "Israel",
    location: "Israel",
    type: "country",
    confidence: 0.9,
    priority: 82,
    tokens: ["israel"],
    patterns: [
      /\b(?:in|at|near|over|around|across|on)\s+israel\b/u,
      /\battack on israel\b/u,
      /\bstrike on israel\b/u,
      /\bmissile attack on israel\b/u
    ]
  },
  {
    region: "Iran",
    country: "Iran",
    location: "Iran",
    type: "country",
    confidence: 0.89,
    priority: 82,
    tokens: ["iran"],
    patterns: [
      /\b(?:in|at|near|around|across|on)\s+iran\b/u,
      /\biranian nuclear(?: |-)?linked sites?\b/u,
      /\biranian nuclear facilities\b/u
    ]
  },
  {
    region: "Kuwait",
    country: "Kuwait",
    location: "Kuwait",
    type: "country",
    confidence: 0.9,
    priority: 82,
    tokens: ["kuwait"],
    patterns: [
      /\bkuwait ports?\b/u,
      /\bport(?:s)? of kuwait\b/u,
      /\b(?:in|at|near|around|on)\s+kuwait\b/u
    ]
  },
  {
    region: "Qatar",
    country: "Qatar",
    location: "Qatar",
    type: "country",
    confidence: 0.88,
    priority: 84,
    tokens: ["qatar"],
    patterns: [
      /\b(?:in|at|near|around|on)\s+qatar\b/u,
      /^\s*qatar\b.*\b(?:court|courts|jailed|jail|detained|detention|pardon|pardoned|released|release)\b/u,
      /\bjailed in qatar\b/u,
      /\bdetained in qatar\b/u,
      /\bcourt in qatar\b/u
    ]
  },
  {
    region: "Saudi Arabia",
    country: "Saudi Arabia",
    location: "Saudi Arabia",
    type: "country",
    confidence: 0.88,
    priority: 80,
    tokens: ["saudi_arabia"],
    patterns: [
      /\b(?:in|at|near|around|on)\s+saudi arabia\b/u
    ]
  },
  {
    region: "Tehran",
    country: "Iran",
    location: "Tehran",
    type: "city",
    confidence: 0.89,
    priority: 84,
    tokens: ["iran", "tehran"],
    patterns: [
      /\b(?:in|at|near|around|on)\s+tehran\b/u
    ]
  },
  {
    region: "Riyadh",
    country: "Saudi Arabia",
    location: "Riyadh",
    type: "city",
    confidence: 0.89,
    priority: 84,
    tokens: ["saudi_arabia", "riyadh"],
    patterns: [
      /\b(?:in|at|near|around|on)\s+riyadh\b/u
    ]
  }
];

const DIRECTIONAL_EVENT_GEOGRAPHY_REFERENCES = [
  {
    id: "israel",
    region: "Israel",
    country: "Israel",
    location: "Israel",
    type: "country",
    confidence: 0.91,
    priority: 90,
    tokens: ["israel"],
    variants: ["israel"]
  },
  {
    id: "yemen",
    region: "Yemen",
    country: "Yemen",
    location: "Yemen",
    type: "country",
    confidence: 0.9,
    priority: 89,
    tokens: ["yemen"],
    variants: ["yemen"]
  },
  {
    id: "iran",
    region: "Iran",
    country: "Iran",
    location: "Iran",
    type: "country",
    confidence: 0.9,
    priority: 89,
    tokens: ["iran", "tehran"],
    variants: ["iran", "tehran"]
  },
  {
    id: "saudi_arabia",
    region: "Saudi Arabia",
    country: "Saudi Arabia",
    location: "Saudi Arabia",
    type: "country",
    confidence: 0.9,
    priority: 89,
    tokens: ["saudi_arabia", "saudi_air_base"],
    variants: ["saudi arabia", "saudi air base", "saudi base", "saudi arabia base"]
  },
  {
    id: "kuwait",
    region: "Kuwait",
    country: "Kuwait",
    location: "Kuwait",
    type: "country",
    confidence: 0.9,
    priority: 88,
    tokens: ["kuwait"],
    variants: ["kuwait", "kuwait ports", "port of kuwait"]
  },
  {
    id: "qatar",
    region: "Qatar",
    country: "Qatar",
    location: "Qatar",
    type: "country",
    confidence: 0.88,
    priority: 87,
    tokens: ["qatar"],
    variants: ["qatar"]
  },
  {
    id: "gaza",
    region: "Gaza",
    country: null,
    location: "Gaza",
    type: "region",
    confidence: 0.89,
    priority: 87,
    tokens: ["gaza"],
    variants: ["gaza", "gaza strip"]
  },
  {
    id: "west_bank",
    region: "West Bank",
    country: null,
    location: "West Bank",
    type: "region",
    confidence: 0.89,
    priority: 87,
    tokens: ["west_bank"],
    variants: ["west bank"]
  }
];

const DIRECTIONAL_ATTACK_PATTERN = [
  "attack",
  "attacks",
  "drone",
  "drone launch",
  "drone strike",
  "fired",
  "fires",
  "hit",
  "hits",
  "launch",
  "launched",
  "missile",
  "missile attack",
  "missile launch",
  "rocket",
  "rocket attack",
  "rocket fire",
  "rocket launch",
  "strike",
  "strikes",
  "targeted",
  "targeting"
].join("|");

const DIRECTIONAL_TARGET_PREPOSITION_PATTERN = [
  "against",
  "at",
  "into",
  "on",
  "targeting",
  "toward",
  "towards"
].join("|");

const INCIDENT_ACTOR_ALIASES = [
  {
    token: "iran",
    patterns: [/\biran\b/u, /\biranian\b/u, /\btehran\b/u]
  },
  {
    token: "israel",
    patterns: [/\bisrael\b/u, /\bisraeli\b/u]
  },
  {
    token: "us",
    patterns: [/\bu s\b/u, /\bu\.s\b/u, /\bunited states\b/u, /\bamerican\b/u]
  },
  {
    token: "houthi",
    patterns: [/\bhouthi\b/u, /\bhouthis\b/u]
  },
  {
    token: "hezbollah",
    patterns: [/\bhezbollah\b/u]
  }
];

const INCIDENT_TARGET_ALIASES = [
  {
    token: "troops",
    patterns: [/\btroops?\b/u, /\bsoldiers?\b/u, /\bpersonnel\b/u, /\bservice members?\b/u]
  },
  {
    token: "aircraft",
    patterns: [/\bplanes?\b/u, /\baircraft\b/u, /\bjets?\b/u]
  },
  {
    token: "air_base",
    patterns: [/\bair base\b/u, /\bairbase\b/u, /\bairfield\b/u]
  },
  {
    token: "nuclear_site",
    patterns: [/\bnuclear\b/u, /\breactor\b/u, /\benrichment\b/u]
  },
  {
    token: "missile_site",
    patterns: [/\bmissile site\b/u, /\bmissile base\b/u]
  }
];

const INCIDENT_ACTION_ALIASES = [
  {
    token: "strike",
    patterns: [/\bstrike\b/u, /\bstrikes\b/u, /\battack\b/u, /\battacks\b/u, /\bmissile attack\b/u]
  },
  {
    token: "casualties",
    patterns: [/\bwounds?\b/u, /\binjur(?:ed|ies)\b/u, /\bhurts?\b/u, /\bkills?\b/u]
  },
  {
    token: "damage",
    patterns: [/\bdamage(?:d|s)?\b/u, /\bhit\b/u, /\bhits\b/u]
  },
  {
    token: "closure",
    patterns: [/\bclosure\b/u, /\bclosed\b/u, /\brestriction\b/u]
  }
];

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function safeJsonParse(value) {
  if (!value) {
    return {};
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function normalizeWhitespace(value = "") {
  return String(value)
    .replace(/\s+/gu, " ")
    .trim();
}

function normalizedValue(value = "") {
  return String(value || "").trim().toLowerCase();
}

function stripUrls(value = "") {
  return String(value).replace(/https?:\/\/\S+/giu, " ");
}

function stripTranslationWrappers(value = "") {
  return String(value)
    .replace(/^machine-translated to english from [^:]+:\s*/iu, "")
    .replace(/^machine translated to english from [^:]+:\s*/iu, "")
    .replace(/^original:\s*/iu, "")
    .trim();
}

function stripBracketedSuffix(value = "") {
  return String(value).replace(/\s*[\[(][^\])]{1,80}[\])]\s*$/u, "");
}

function toSearchText(value = "") {
  return normalizeWhitespace(
    String(value)
      .normalize("NFKC")
      .toLowerCase()
      .replace(/https?:\/\/\S+/giu, " ")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
  );
}

function isBoilerplateSegment(segment = "") {
  const lowered = toSearchText(segment);
  if (!lowered) {
    return false;
  }

  if (TITLE_BOILERPLATE_PHRASES.some((phrase) => lowered.includes(phrase))) {
    return true;
  }

  if (/\b(news|sports|jobs|business|travel|culture|opinion|newsletter|press release)\b/u.test(lowered)) {
    return true;
  }

  if (/[a-z0-9-]+\.[a-z]{2,}/u.test(lowered)) {
    return true;
  }

  return false;
}

function stripTrailingBoilerplateSegments(value = "") {
  const separators = /\s(?:\||—|–|:)\s/gu;
  const parts = normalizeWhitespace(value).split(separators).filter(Boolean);
  if (parts.length <= 1) {
    return normalizeWhitespace(value);
  }

  while (parts.length > 1 && isBoilerplateSegment(parts[parts.length - 1])) {
    parts.pop();
  }

  return normalizeWhitespace(parts.join(" "));
}

function cleanDisplayText(value = "") {
  let next = normalizeWhitespace(stripUrls(stripTranslationWrappers(value)));

  for (const pattern of TITLE_PREFIX_PATTERNS) {
    next = next.replace(pattern, "");
  }

  next = stripBracketedSuffix(next);
  next = stripTrailingBoilerplateSegments(next);

  return normalizeWhitespace(next);
}

function tokenize(value = "") {
  return toSearchText(value)
    .split(/\s+/u)
    .filter(Boolean)
    .filter((token) => token.length > 1)
    .filter((token) => !STOPWORDS.has(token));
}

function countTermMatches(text = "", terms = []) {
  const lowered = toSearchText(text);
  if (!lowered) {
    return 0;
  }

  return terms.filter((term) => lowered.includes(toSearchText(term))).length;
}

function hasPatternMatch(text = "", patterns = []) {
  const lowered = toSearchText(text);
  return patterns.some((pattern) => pattern.test(lowered));
}

function collectTermMatches(text = "", terms = []) {
  const lowered = toSearchText(text);
  if (!lowered) {
    return [];
  }

  return terms.filter((term) => lowered.includes(toSearchText(term)));
}

function normalizeToneProbabilities(probabilities) {
  const entries = TONE_CLASS_ORDER.map((key) => [
    key,
    Math.max(0, Number(probabilities?.[key] || 0))
  ]);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  if (!total) {
    const fallback = 1 / TONE_CLASS_ORDER.length;
    return Object.fromEntries(TONE_CLASS_ORDER.map((key) => [key, Number(fallback.toFixed(4))]));
  }

  const normalized = {};
  let remainder = 1;
  TONE_CLASS_ORDER.forEach((key, index) => {
    const raw = entries[index][1] / total;
    const rounded = index === TONE_CLASS_ORDER.length - 1
      ? remainder
      : Number(raw.toFixed(4));
    normalized[key] = Number(Math.max(0, rounded).toFixed(4));
    remainder = Number((remainder - normalized[key]).toFixed(4));
  });

  if (remainder !== 0) {
    normalized[TONE_CLASS_ORDER[TONE_CLASS_ORDER.length - 1]] = Number(
      (normalized[TONE_CLASS_ORDER[TONE_CLASS_ORDER.length - 1]] + remainder).toFixed(4)
    );
  }

  return normalized;
}

function calculateToneEntropy(probabilities) {
  let entropy = 0;
  for (const key of TONE_CLASS_ORDER) {
    const probability = Number(probabilities?.[key] || 0);
    if (probability <= 0) {
      continue;
    }

    entropy -= probability * Math.log2(probability);
  }

  return Number(entropy.toFixed(4));
}

function classifyToneState({ entropyNorm, topToneConfidence, toneMargin, evidenceCount }) {
  if (!evidenceCount) {
    return "insufficient_basis";
  }

  if (topToneConfidence >= 0.5 && toneMargin >= 0.14 && entropyNorm <= 0.72) {
    return "concentrated";
  }

  if (entropyNorm >= 0.9 || toneMargin <= 0.08 || topToneConfidence < 0.36) {
    return "diffuse";
  }

  return "mixed";
}

function buildToneProfile({ comparisonText = "", category = "information" } = {}) {
  const toneText = normalizeWhitespace(stripTranslationWrappers(stripUrls(comparisonText)));
  const loweredText = toSearchText(toneText);
  const tokenCount = tokenize(toneText).length;
  const categoryPriors = CATEGORY_TONE_PRIORS[category] || {};
  const scores = {
    neutral: 0.9 + (categoryPriors.neutral || 0),
    curious: 0.82 + (categoryPriors.curious || 0),
    frustrated: 0.82 + (categoryPriors.frustrated || 0),
    defensive: 0.82 + (categoryPriors.defensive || 0)
  };
  const toneSignals = [];

  for (const toneKey of TONE_CLASS_ORDER) {
    const matches = collectTermMatches(loweredText, TONE_TERM_MAP[toneKey] || []);
    for (const match of matches) {
      scores[toneKey] += 0.5;
      toneSignals.push(match);
    }
  }

  if (/\b(question|questions|unclear|uncertain|under review)\b/u.test(loweredText)) {
    scores.curious += 0.24;
    toneSignals.push("uncertainty cue");
  }

  if (/\b(denies|rejects|intercepts?|curfew|restriction|closed airspace|air defense)\b/u.test(loweredText)) {
    scores.defensive += 0.28;
    toneSignals.push("guarded posture");
  }

  if (/\b(attack|missile|strike|retaliat|warning|threat|mobilization|shelling)\b/u.test(loweredText)) {
    scores.frustrated += 0.32;
    toneSignals.push("hardening posture");
  }

  if (/\b(advisory|clarified|coordination|meeting|scheduled|status|recovery|restore)\b/u.test(loweredText)) {
    scores.neutral += 0.26;
    toneSignals.push("procedural posture");
  }

  const evidenceSignals = [...new Set(toneSignals)];
  const evidenceCount = evidenceSignals.length;
  const rawProbabilities = evidenceCount
    ? normalizeToneProbabilities(scores)
    : normalizeToneProbabilities({
        neutral: 0.25,
        curious: 0.25,
        frustrated: 0.25,
        defensive: 0.25
      });
  const ordered = [...TONE_CLASS_ORDER]
    .map((key) => [key, rawProbabilities[key]])
    .sort((left, right) => right[1] - left[1]);
  const [topToneRaw, topToneConfidenceRaw] = ordered[0];
  const secondToneConfidence = ordered[1]?.[1] || 0;
  const topToneConfidence = Number(topToneConfidenceRaw.toFixed(4));
  const toneMargin = Number((topToneConfidence - secondToneConfidence).toFixed(4));
  const toneEntropy = calculateToneEntropy(rawProbabilities);
  const toneEntropyNorm = Number((toneEntropy / TONE_ENTROPY_MAX).toFixed(4));
  const toneState = tokenCount < 3
    ? "insufficient_basis"
    : classifyToneState({
        entropyNorm: toneEntropyNorm,
        topToneConfidence,
        toneMargin,
        evidenceCount
      });

  return {
    raw_probabilities: rawProbabilities,
    top_tone_raw: topToneRaw,
    top_tone_display: RAW_TONE_TO_DISPLAY[topToneRaw] || topToneRaw,
    top_tone_confidence: toneState === "insufficient_basis" ? Number(topToneConfidence.toFixed(4)) : topToneConfidence,
    tone_margin: toneMargin,
    tone_entropy: toneEntropy,
    tone_entropy_norm: toneEntropyNorm,
    tone_state: toneState,
    tone_signals: evidenceSignals.slice(0, 6)
  };
}

function hostnameFromUrl(urlValue = "") {
  if (!urlValue) {
    return null;
  }

  try {
    return new URL(urlValue).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function normalizeHostname(hostname = "") {
  return String(hostname)
    .toLowerCase()
    .replace(/^(www|m|mobile|amp|en|news)\./u, "")
    .trim();
}

function registeredDomain(hostname = "") {
  const normalized = normalizeHostname(hostname);
  const parts = normalized.split(".").filter(Boolean);
  if (parts.length <= 2) {
    return normalized;
  }

  const publicSuffix = parts.slice(-2).join(".");
  if (COMPOUND_TLDS.has(publicSuffix) && parts.length >= 3) {
    return parts.slice(-3).join(".");
  }

  return parts.slice(-2).join(".");
}

function deriveSourceHost(raw, payload) {
  return normalizeHostname(
    payload?.domain ||
    hostnameFromUrl(raw.url) ||
    hostnameFromUrl(payload?.url) ||
    raw.source_name ||
    "unknown"
  );
}

function deriveSourceName(raw, payload) {
  const host = deriveSourceHost(raw, payload);
  return host || String(raw.source_name || "unknown").trim();
}

function deriveSourceFamily(raw, payload) {
  const host = deriveSourceHost(raw, payload);
  if (host && host !== "unknown") {
    return registeredDomain(host);
  }

  return toSearchText(raw.source_name || raw.source_type || "unknown").replace(/\s+/gu, "-") || "unknown";
}

function normalizeLanguage(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function deriveSourceLanguage(payload = {}) {
  return normalizeLanguage(
    payload?.language ||
    payload?.lang ||
    payload?.sourceLanguage ||
    payload?.source_language ||
    payload?.sourcelang ||
    ""
  );
}

function looksTranslatedToEnglish(language = "") {
  return language.startsWith("en") || language.includes("english");
}

function containsNonLatinScript(value = "") {
  return /[\p{Script=Cyrillic}\p{Script=Han}\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Devanagari}\p{Script=Thai}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(String(value || ""));
}

function dedupeComparisonSegments(segments = []) {
  const kept = [];

  for (const segment of segments) {
    const cleaned = normalizeWhitespace(segment);
    if (!cleaned) {
      continue;
    }

    const search = cleanText(cleaned);
    if (!search) {
      continue;
    }

    const alreadyCovered = kept.some((existing) => {
      const existingSearch = cleanText(existing);
      return existingSearch === search || existingSearch.includes(search) || search.includes(existingSearch);
    });

    if (!alreadyCovered) {
      kept.push(cleaned);
    }
  }

  return kept;
}

function cleanSummaryText(summary = "", sourceName = "", sourceFamily = "") {
  const rawSummary = normalizeWhitespace(summary);
  if (/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/iu.test(rawSummary)) {
    return "";
  }

  const cleaned = cleanDisplayText(summary);
  const lowered = toSearchText(cleaned);
  if (!lowered) {
    return "";
  }

  const sourceNameLower = toSearchText(sourceName);
  const sourceFamilyLower = toSearchText(sourceFamily);

  if (
    lowered === sourceNameLower ||
    lowered === sourceFamilyLower ||
    lowered.includes(sourceNameLower) ||
    lowered.includes(sourceFamilyLower)
  ) {
    return "";
  }

  return cleaned;
}

function buildOriginalComparisonText(title = "", summary = "") {
  return dedupeComparisonSegments([title, summary]).join(" ").trim() || title;
}

function matchAliasTokens(text = "", aliases = []) {
  const lowered = toSearchText(text);
  const matched = new Set();

  for (const alias of aliases) {
    if (alias.patterns.some((pattern) => pattern.test(lowered))) {
      if (alias.token) {
        matched.add(alias.token);
      }

      for (const token of alias.tokens || []) {
        matched.add(token);
      }
    }
  }

  return [...matched];
}

function matchLocationAliases(text = "", aliases = []) {
  const lowered = toSearchText(text);
  return aliases.filter((alias) => alias.patterns.some((pattern) => pattern.test(lowered)));
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function buildVariantPattern(variants = []) {
  return [...variants]
    .filter(Boolean)
    .sort((left, right) => String(right).length - String(left).length)
    .map((variant) => escapeRegex(variant))
    .join("|");
}

function matchDirectionalEventGeography(text = "") {
  const lowered = toSearchText(text);
  if (!lowered) {
    return null;
  }

  const matches = [];

  for (const target of DIRECTIONAL_EVENT_GEOGRAPHY_REFERENCES) {
    const targetPattern = buildVariantPattern(target.variants || []);
    if (!targetPattern) {
      continue;
    }

    for (const origin of DIRECTIONAL_EVENT_GEOGRAPHY_REFERENCES) {
      if (origin.id === target.id) {
        continue;
      }

      const originPattern = buildVariantPattern(origin.variants || []);
      if (!originPattern) {
        continue;
      }

      const directionalPatterns = [
        new RegExp(
          `\\b(?:${DIRECTIONAL_ATTACK_PATTERN})\\b.{0,70}\\bfrom\\s+(?:the\\s+)?(?:${originPattern})\\b.{0,90}\\b(?:${DIRECTIONAL_TARGET_PREPOSITION_PATTERN})\\s+(?:the\\s+)?(?:${targetPattern})\\b`,
          "u"
        ),
        new RegExp(
          `\\b(?:${DIRECTIONAL_ATTACK_PATTERN})\\b.{0,70}\\b(?:${DIRECTIONAL_TARGET_PREPOSITION_PATTERN})\\s+(?:the\\s+)?(?:${targetPattern})\\b.{0,90}\\bfrom\\s+(?:the\\s+)?(?:${originPattern})\\b`,
          "u"
        ),
        new RegExp(
          `^\\s*(?:the\\s+)?(?:${targetPattern})\\b.{0,24}\\b(?:reports?|says?|said)\\b.{0,90}\\b(?:${DIRECTIONAL_ATTACK_PATTERN})\\b.{0,50}\\bfrom\\s+(?:the\\s+)?(?:${originPattern})\\b`,
          "u"
        ),
        new RegExp(
          `\\b(?:${originPattern})\\b.{0,30}\\b(?:missile|rocket|drone|strike|attack|launch|launched|fire|fired)\\b.{0,80}\\b(?:${DIRECTIONAL_TARGET_PREPOSITION_PATTERN})\\s+(?:the\\s+)?(?:${targetPattern})\\b`,
          "u"
        )
      ];

      if (!directionalPatterns.some((pattern) => pattern.test(lowered))) {
        continue;
      }

      matches.push({
        region: target.region,
        country: target.country,
        location: target.location,
        type: target.type,
        confidence: Number(target.confidence || 0.9),
        priority: Number(target.priority || 88),
        tokens: [...new Set([...(target.tokens || []), ...(origin.tokens || [])])],
        originCountry: origin.country || null,
        originLocation: origin.location || origin.region || null
      });
    }
  }

  return pickBestLocationAlias(matches);
}

function pickBestLocationAlias(matches = []) {
  if (!matches.length) {
    return null;
  }

  return [...matches].sort((left, right) => {
    const priorityDiff = Number(right.priority || 0) - Number(left.priority || 0);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    const confidenceDiff = Number(right.confidence || 0) - Number(left.confidence || 0);
    if (confidenceDiff !== 0) {
      return confidenceDiff;
    }

    const locationLengthDiff =
      String(right.location || right.region || "").length -
      String(left.location || left.region || "").length;
    if (locationLengthDiff !== 0) {
      return locationLengthDiff;
    }

    return String(right.region || "").localeCompare(String(left.region || ""));
  })[0];
}

function deriveSourceCountry({ rawCountry, payload }) {
  return normalizeWhitespace(payload?.sourcecountry || payload?.sourceCountry || rawCountry || "");
}

function hasTrustedRawEventGeography({ rawRegion, rawCountry, sourceCountry }) {
  const rawRegionNormalized = normalizedValue(rawRegion);
  const rawCountryNormalized = normalizedValue(rawCountry);
  const sourceCountryNormalized = normalizedValue(sourceCountry);

  if (!rawRegionNormalized && !rawCountryNormalized) {
    return false;
  }

  if (!sourceCountryNormalized) {
    return Boolean(rawRegionNormalized || rawCountryNormalized);
  }

  return (
    Boolean(rawRegionNormalized && rawRegionNormalized !== sourceCountryNormalized) ||
    Boolean(rawCountryNormalized && rawCountryNormalized !== sourceCountryNormalized)
  );
}

function inferStructuredLocationType(rawRegion, rawCountry) {
  const rawRegionNormalized = normalizedValue(rawRegion);
  const rawCountryNormalized = normalizedValue(rawCountry);

  if (!rawRegionNormalized && !rawCountryNormalized) {
    return "unknown";
  }

  if (
    rawRegionNormalized &&
    rawCountryNormalized &&
    rawRegionNormalized !== rawCountryNormalized
  ) {
    return "region";
  }

  return "country";
}

function inferStructuredLocationLabel(rawRegion, rawCountry) {
  return normalizeWhitespace(rawRegion || rawCountry || "");
}

function inferEventGeography({ comparisonText, payload, rawRegion, rawCountry }) {
  const sourceCountry = deriveSourceCountry({ rawCountry, payload });
  const rawEventGeographyTrusted = hasTrustedRawEventGeography({
    rawRegion,
    rawCountry,
    sourceCountry
  });
  const directionalMatch = matchDirectionalEventGeography(comparisonText);
  const explicitMatches = matchLocationAliases(comparisonText, EXPLICIT_TEXT_LOCATION_ALIASES);
  const aliasMatches = matchLocationAliases(comparisonText, INCIDENT_LOCATION_ALIASES);
  const matchedAliases = directionalMatch
    ? [directionalMatch, ...explicitMatches, ...aliasMatches]
    : [...explicitMatches, ...aliasMatches];
  const incidentLocationTokens = matchedAliases.flatMap((alias) => alias.tokens || []);
  const preferredAlias = pickBestLocationAlias(matchedAliases);

  if (preferredAlias && Number(preferredAlias.confidence || 0) >= 0.85) {
    const explicitSource =
      directionalMatch === preferredAlias || explicitMatches.includes(preferredAlias);
    return {
      sourceCountry: sourceCountry || null,
      eventLocation: preferredAlias.location || preferredAlias.region || rawRegion || rawCountry || null,
      eventLocationType: preferredAlias.type || "region",
      eventLocationConfidence: Number(preferredAlias.confidence || 0.9),
      eventLocationSource: explicitSource ? "explicit_text" : "alias",
      region: preferredAlias.region || preferredAlias.country || rawRegion || rawCountry || "Unknown",
      country: preferredAlias.country || null,
      eventOriginCountry: preferredAlias.originCountry || null,
      eventOriginLocation: preferredAlias.originLocation || null,
      incidentLocationTokens: [...new Set(incidentLocationTokens)],
      locationSource: explicitSource ? "explicit_text" : "alias"
    };
  }

  if (rawEventGeographyTrusted) {
    const eventLocation = inferStructuredLocationLabel(rawRegion, rawCountry);
    return {
      sourceCountry: sourceCountry || null,
      eventLocation,
      eventLocationType: inferStructuredLocationType(rawRegion, rawCountry),
      eventLocationConfidence: 0.87,
      eventLocationSource: "structured_source",
      region: rawRegion || rawCountry || "Unknown",
      country: rawCountry || null,
      eventOriginCountry: null,
      eventOriginLocation: null,
      incidentLocationTokens: [],
      locationSource: "structured_source"
    };
  }

  return {
    sourceCountry: sourceCountry || null,
    eventLocation: null,
    eventLocationType: "unknown",
    eventLocationConfidence: 0,
    eventLocationSource: "unknown",
    region: "Unknown",
    country: null,
    eventOriginCountry: null,
    eventOriginLocation: null,
    incidentLocationTokens: [],
    locationSource: "unknown"
  };
}

const EVENT_LOCATION_TYPE_PRIORITY = {
  site: 6,
  airport: 5,
  port: 5,
  chokepoint: 5,
  city: 4,
  region: 3,
  country: 2,
  unknown: 0
};

const EVENT_LOCATION_SOURCE_PRIORITY = {
  explicit_text: 4,
  alias: 3,
  structured_source: 2,
  unknown: 0
};

function incidentIdentityRank(identity = {}) {
  return (
    Number(identity.eventLocationConfidence || 0) * 100 +
    (EVENT_LOCATION_SOURCE_PRIORITY[identity.eventLocationSource || identity.locationSource || "unknown"] || 0) * 10 +
    (EVENT_LOCATION_TYPE_PRIORITY[identity.eventLocationType || "unknown"] || 0) * 2 +
    Math.min(1, (identity.incidentLocationTokens || []).length * 0.05)
  );
}

function choosePreferredIncidentIdentity(primaryIdentity, secondaryIdentity) {
  if (!secondaryIdentity) {
    return primaryIdentity;
  }

  if (!primaryIdentity) {
    return secondaryIdentity;
  }

  const primaryRank = incidentIdentityRank(primaryIdentity);
  const secondaryRank = incidentIdentityRank(secondaryIdentity);

  if (secondaryRank > primaryRank + 1) {
    return secondaryIdentity;
  }

  if (!primaryIdentity.eventLocation && secondaryIdentity.eventLocation) {
    return secondaryIdentity;
  }

  if (
    !primaryIdentity.eventOriginCountry &&
    secondaryIdentity.eventOriginCountry &&
    primaryIdentity.eventLocation === secondaryIdentity.eventLocation
  ) {
    return secondaryIdentity;
  }

  return primaryIdentity;
}

function buildIncidentIdentity({ comparisonText, payload, rawRegion, rawCountry }) {
  const geography = inferEventGeography({
    comparisonText,
    payload,
    rawRegion,
    rawCountry
  });
  const incidentActorTokens = matchAliasTokens(comparisonText, INCIDENT_ACTOR_ALIASES);
  const incidentTargetTokens = matchAliasTokens(comparisonText, INCIDENT_TARGET_ALIASES);
  const incidentActionTokens = matchAliasTokens(comparisonText, INCIDENT_ACTION_ALIASES);
  const incidentKeyTokens = [
    ...new Set([
      ...incidentActorTokens,
      ...incidentTargetTokens,
      ...geography.incidentLocationTokens,
      ...incidentActionTokens
    ])
  ];

  return {
    sourceCountry: geography.sourceCountry,
    eventLocation: geography.eventLocation,
    eventLocationType: geography.eventLocationType,
    eventLocationConfidence: geography.eventLocationConfidence,
    eventLocationSource: geography.eventLocationSource,
    eventOriginCountry: geography.eventOriginCountry || null,
    eventOriginLocation: geography.eventOriginLocation || null,
    region: geography.region,
    country: geography.country,
    incidentLocationTokens: geography.incidentLocationTokens,
    incidentActorTokens,
    incidentTargetTokens,
    incidentActionTokens,
    incidentKeyTokens,
    locationSource: geography.locationSource
  };
}

export function cleanText(value = "") {
  return toSearchText(value);
}

export function classifyCategory(text = "", hint = null) {
  const lower = cleanText(text);

  if (hint && categoryKeywords[hint]) {
    return hint;
  }

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => lower.includes(keyword.toLowerCase()))) {
      return category;
    }
  }

  return "information";
}

export function severityFromText(text = "") {
  const lower = cleanText(text);
  if (/(attack|breach|closure|disruption|missile|outage|restriction|strike)/u.test(lower)) return "high";
  if (/(advisory|delay|guidance|talks|warning)/u.test(lower)) return "medium";
  return "low";
}

export function fingerprintText(text = "") {
  const normalized = tokenize(text).slice(0, 16).join(" ");

  return crypto.createHash("sha1").update(normalized || "untitled").digest("hex").slice(0, 12);
}

function detectNoiseFlags({ normalizedTitle, normalizedSummary, comparisonText, titleTokens, category, region, country }) {
  const loweredTitle = toSearchText(normalizedTitle);
  const loweredText = toSearchText(comparisonText || `${normalizedTitle} ${normalizedSummary || ""}`);
  const strongEventLike = hasPatternMatch(loweredText, STRONG_EVENT_PATTERNS);
  const commercialVendorLike =
    !strongEventLike &&
    (
      countTermMatches(loweredText, COMMERCIAL_VENDOR_TERMS) >= 2 ||
      (
        countTermMatches(loweredTitle, COMMERCIAL_VENDOR_TERMS) >= 1 &&
        hasPatternMatch(loweredText, GENERIC_SERVICE_UPDATE_PATTERNS)
      )
    );
  const promoWrapper = hasPatternMatch(loweredTitle, PROMO_WRAPPER_PATTERNS);
  const genericServiceUpdate =
    !strongEventLike &&
    hasPatternMatch(loweredText, GENERIC_SERVICE_UPDATE_PATTERNS);
  const infrastructureTexture =
    category === "infrastructure" ||
    countTermMatches(loweredText, INFRASTRUCTURE_TEXTURE_TERMS) >= 1;
  const nonEventInfrastructure =
    !strongEventLike &&
    infrastructureTexture &&
    (
      hasPatternMatch(loweredText, NON_EVENT_INFRASTRUCTURE_PATTERNS) ||
      (
        commercialVendorLike &&
        countTermMatches(loweredText, INFRASTRUCTURE_TEXTURE_TERMS) >= 1
      )
    );
  const articleHubLike =
    hasPatternMatch(loweredTitle, ARTICLE_HUB_PATTERNS) ||
    hasPatternMatch(loweredText, ARTICLE_HUB_PATTERNS);
  const genericRoundup =
    !loweredTitle ||
    GENERIC_ROUNDUP_PATTERNS.some((pattern) => pattern.test(loweredTitle));
  const seoLike = SEO_PATTERNS.some((pattern) => pattern.test(loweredTitle));
  const lowInformationTitle =
    titleTokens.length < 3 ||
    new Set(titleTokens).size < 3;
  const celebrityCollision =
    ENTERTAINMENT_TERMS.some((term) => loweredTitle.includes(term)) &&
    (category === "security" || category === "infrastructure" || category === "cyber");
  const missingLocation = !region || region === "Unknown" || !country;

  return {
    articleHubLike,
    genericRoundup,
    commercialVendorLike,
    seoLike,
    promoWrapper,
    genericServiceUpdate,
    nonEventInfrastructure,
    lowInformationTitle,
    celebrityCollision,
    missingLocation
  };
}

function calculateNoiseScore(flags) {
  let score = 0;
  if (flags.articleHubLike) score += 0.28;
  if (flags.commercialVendorLike) score += 0.2;
  if (flags.genericRoundup) score += 0.45;
  if (flags.genericServiceUpdate) score += 0.18;
  if (flags.nonEventInfrastructure) score += 0.22;
  if (flags.promoWrapper) score += 0.3;
  if (flags.seoLike) score += 0.3;
  if (flags.lowInformationTitle) score += 0.2;
  if (flags.celebrityCollision) score += 0.35;
  if (flags.missingLocation) score += 0.1;

  if (flags.nonEventInfrastructure && flags.genericServiceUpdate) score += 0.08;
  if (flags.commercialVendorLike && flags.lowInformationTitle) score += 0.05;

  return Number(clamp(score).toFixed(2));
}

function detectRelevanceFlags({ comparisonText, category }) {
  const loweredText = toSearchText(comparisonText);
  const strategicInfrastructureLike =
    (category === "infrastructure" || countTermMatches(loweredText, INFRASTRUCTURE_TEXTURE_TERMS) >= 1) &&
    hasPatternMatch(loweredText, STRATEGIC_INFRASTRUCTURE_PATTERNS);
  const stateActorLike = hasPatternMatch(loweredText, STATE_ACTOR_PATTERNS);
  const crossBorderLike = hasPatternMatch(loweredText, CROSS_BORDER_PATTERNS);
  const nationalImpactLike = hasPatternMatch(loweredText, NATIONAL_IMPACT_PATTERNS);
  const routineTrafficCollisionLike =
    hasPatternMatch(loweredText, TRAFFIC_COLLISION_PATTERNS) &&
    !strategicInfrastructureLike &&
    !stateActorLike &&
    !crossBorderLike &&
    !nationalImpactLike;
  const municipalUtilityLike =
    hasPatternMatch(loweredText, MUNICIPAL_UTILITY_PATTERNS) &&
    !strategicInfrastructureLike &&
    !nationalImpactLike;
  const localCrimeWithoutBroaderContext =
    hasPatternMatch(loweredText, LOCAL_CRIME_PATTERNS) &&
    !stateActorLike &&
    !crossBorderLike &&
    !nationalImpactLike &&
    !strategicInfrastructureLike;
  const localIncidentLike =
    (
      hasPatternMatch(loweredText, LOCAL_INCIDENT_PATTERNS) ||
      routineTrafficCollisionLike ||
      municipalUtilityLike ||
      localCrimeWithoutBroaderContext
    ) &&
    !stateActorLike &&
    !crossBorderLike &&
    !nationalImpactLike &&
    !strategicInfrastructureLike;
  const lowFieldAuthority =
    (localIncidentLike || routineTrafficCollisionLike || municipalUtilityLike || localCrimeWithoutBroaderContext) &&
    !strategicInfrastructureLike &&
    !stateActorLike &&
    !crossBorderLike &&
    !nationalImpactLike;

  return {
    localIncidentLike,
    municipalUtilityLike,
    routineTrafficCollisionLike,
    localCrimeWithoutBroaderContext,
    lowFieldAuthority,
    strategicInfrastructureLike,
    stateActorLike,
    crossBorderLike,
    nationalImpactLike
  };
}

function calculateFieldRelevance(flags) {
  let score = 0.5;
  if (flags.localIncidentLike) score -= 0.14;
  if (flags.routineTrafficCollisionLike) score -= 0.16;
  if (flags.municipalUtilityLike) score -= 0.12;
  if (flags.localCrimeWithoutBroaderContext) score -= 0.12;
  if (flags.lowFieldAuthority) score -= 0.08;
  if (flags.strategicInfrastructureLike) score += 0.16;
  if (flags.stateActorLike) score += 0.16;
  if (flags.crossBorderLike) score += 0.14;
  if (flags.nationalImpactLike) score += 0.14;
  return Number(clamp(score).toFixed(2));
}

function detectEscalationFlags({ comparisonText, category, relevanceFlags }) {
  const loweredText = toSearchText(comparisonText);
  const stateActorLike =
    Boolean(relevanceFlags?.stateActorLike) ||
    hasPatternMatch(loweredText, STATE_ACTOR_PATTERNS);
  const militaryActorLike = hasPatternMatch(loweredText, MILITARY_ACTOR_PATTERNS);
  const defenseSecurityInstitutionLike = hasPatternMatch(
    loweredText,
    DEFENSE_SECURITY_INSTITUTION_PATTERNS
  );
  const crossBorderLike =
    Boolean(relevanceFlags?.crossBorderLike) ||
    hasPatternMatch(loweredText, CROSS_BORDER_PATTERNS);
  const retaliationLanguageLike = hasPatternMatch(loweredText, RETALIATION_LANGUAGE_PATTERNS);
  const ceasefireBreakdownLike = hasPatternMatch(loweredText, CEASEFIRE_BREAKDOWN_PATTERNS);
  const sanctionPolicyPressureLike = hasPatternMatch(
    loweredText,
    SANCTION_POLICY_PRESSURE_PATTERNS
  );
  const mobilizationLike = hasPatternMatch(loweredText, MOBILIZATION_PATTERNS);
  const diplomacyStatePressure =
    category === "diplomacy" &&
    crossBorderLike &&
    stateActorLike;
  const strategicInfrastructureTargetLike =
    Boolean(relevanceFlags?.strategicInfrastructureLike) &&
    (
      militaryActorLike ||
      defenseSecurityInstitutionLike ||
      crossBorderLike ||
      retaliationLanguageLike ||
      ceasefireBreakdownLike ||
      sanctionPolicyPressureLike ||
      /(attack|blockade|closure|missile|sabotage|strike|target)/u.test(loweredText)
    );
  const diplomaticCrisisLike =
    hasPatternMatch(loweredText, DIPLOMATIC_CRISIS_PATTERNS) ||
    diplomacyStatePressure;

  return {
    stateActorLike,
    militaryActorLike,
    defenseSecurityInstitutionLike,
    crossBorderLike,
    retaliationLanguageLike,
    ceasefireBreakdownLike,
    sanctionPolicyPressureLike,
    mobilizationLike,
    strategicInfrastructureTargetLike,
    diplomaticCrisisLike
  };
}

function calculateEscalationSignal({ escalationFlags, eventLikeness, fieldRelevance, noiseScore }) {
  let escalation = 0;
  if (escalationFlags.stateActorLike) escalation += 0.12;
  if (escalationFlags.militaryActorLike) escalation += 0.16;
  if (escalationFlags.defenseSecurityInstitutionLike) escalation += 0.1;
  if (escalationFlags.crossBorderLike) escalation += 0.14;
  if (escalationFlags.retaliationLanguageLike) escalation += 0.14;
  if (escalationFlags.ceasefireBreakdownLike) escalation += 0.14;
  if (escalationFlags.sanctionPolicyPressureLike) escalation += 0.1;
  if (escalationFlags.mobilizationLike) escalation += 0.12;
  if (escalationFlags.strategicInfrastructureTargetLike) escalation += 0.14;
  if (escalationFlags.diplomaticCrisisLike) escalation += 0.1;

  const qualityBlend = 0.55 + 0.25 * clamp(eventLikeness || 0) + 0.2 * clamp(fieldRelevance || 0);
  const noiseDamp = 1 - clamp(noiseScore || 0) * 0.35;
  return Number(clamp(escalation * qualityBlend * noiseDamp).toFixed(2));
}

function calculateEventLikeness({ comparisonText, titleTokens, category, region, country, noiseScore }) {
  const lowered = cleanText(comparisonText);
  const categoryWords = categoryKeywords[category] || [];
  const hasCategoryWord = categoryWords.some((keyword) => lowered.includes(keyword.toLowerCase()));
  const hasActionWord = ACTION_TERMS.some((term) => lowered.includes(term));
  const hasLocation = Boolean(region && region !== "Unknown") || Boolean(country);
  const tokenRichness = Math.min(0.28, Math.max(0, titleTokens.length - 2) * 0.04);

  let score = 0.18 + tokenRichness;
  if (hasCategoryWord) score += 0.18;
  if (hasActionWord) score += 0.18;
  if (hasLocation) score += 0.16;
  if (lowered.length >= 40) score += 0.08;
  score -= noiseScore * 0.45;

  return Number(clamp(score).toFixed(2));
}

function buildNormalizedSeed(raw) {
  const payload = safeJsonParse(raw.raw_payload);
  const sourceName = deriveSourceName(raw, payload);
  const sourceFamily = deriveSourceFamily(raw, payload);
  const title = cleanDisplayText(raw.title || raw.summary || "Untitled update");
  const summary = cleanSummaryText(raw.summary || "", sourceName, sourceFamily);
  const sourceLanguage = deriveSourceLanguage(payload);
  const originalComparisonText = buildOriginalComparisonText(title, summary);
  const fullText = `${title} ${summary}`.trim();
  const incidentIdentity = buildIncidentIdentity({
    comparisonText: originalComparisonText,
    payload,
    rawRegion: raw.region,
    rawCountry: raw.country
  });
  const category = classifyCategory(fullText, raw.category_hint);
  const region = incidentIdentity.region || "Unknown";
  const country = incidentIdentity.country || null;
  const titleTokens = tokenize(title);
  const noiseFlags = detectNoiseFlags({
    normalizedTitle: title,
    normalizedSummary: summary,
    comparisonText: originalComparisonText,
    titleTokens,
    category,
    region,
    country
  });
  const noiseScore = calculateNoiseScore(noiseFlags);
  const relevanceFlags = detectRelevanceFlags({
    comparisonText: originalComparisonText,
    category
  });
  const fieldRelevance = calculateFieldRelevance(relevanceFlags);

  return {
    rawId: raw.id,
    domain: raw.domain || "signals",
    payload,
    rawRegion: raw.region || null,
    rawCountry: raw.country || null,
    initialIncidentIdentity: incidentIdentity,
    sourceName,
    sourceFamily,
    sourceCountry: incidentIdentity.sourceCountry || deriveSourceCountry({ rawCountry: raw.country, payload }) || null,
    sourceType: raw.source_type,
    connectorName: raw.source_name,
    eventTime: raw.published_at || raw.observed_at,
    eventLocation: incidentIdentity.eventLocation || null,
    eventLocationType: incidentIdentity.eventLocationType || "unknown",
    eventLocationConfidence: Number(incidentIdentity.eventLocationConfidence || 0),
    eventLocationSource: incidentIdentity.eventLocationSource || incidentIdentity.locationSource || "unknown",
    eventCountry: incidentIdentity.country || null,
    eventOriginCountry: incidentIdentity.eventOriginCountry || null,
    eventOriginLocation: incidentIdentity.eventOriginLocation || null,
    region,
    country,
    category,
    observedUpdate: title || summary || "Untitled update",
    summary,
    correction: raw.is_correction ? "Corrected" : "None",
    sourceConfidence: Number(raw.source_confidence || 0.55),
    normalizedTitle: title,
    normalizedSummary: summary,
    titleTokens,
    noiseFlags,
    noiseScore,
    relevanceFlags,
    fieldRelevance,
    sourceLanguage,
    originalComparisonText,
    locationSource: incidentIdentity.locationSource,
    incidentActorTokens: incidentIdentity.incidentActorTokens,
    incidentTargetTokens: incidentIdentity.incidentTargetTokens,
    incidentLocationTokens: incidentIdentity.incidentLocationTokens,
    incidentActionTokens: incidentIdentity.incidentActionTokens,
    incidentKeyTokens: incidentIdentity.incidentKeyTokens
  };
}

function finalizeNormalizedItem(seed, options = {}) {
  const translatedComparisonText = normalizeWhitespace(options.translatedComparisonText || "");
  const comparisonSegments = translatedComparisonText
    ? dedupeComparisonSegments([translatedComparisonText, seed.originalComparisonText])
    : dedupeComparisonSegments([seed.originalComparisonText]);
  const comparisonText = comparisonSegments.join(" ").trim() || seed.normalizedTitle;
  const comparisonIncidentIdentity = buildIncidentIdentity({
    comparisonText,
    payload: seed.payload,
    rawRegion: seed.rawRegion,
    rawCountry: seed.rawCountry
  });
  const incidentIdentity = choosePreferredIncidentIdentity(
    seed.initialIncidentIdentity,
    comparisonIncidentIdentity
  );
  const region = incidentIdentity.region || seed.region || "Unknown";
  const country = incidentIdentity.country || null;
  const eventLocation = incidentIdentity.eventLocation || null;
  const eventCountry = incidentIdentity.country || null;
  const severity = severityFromText(`${comparisonText} ${seed.normalizedTitle} ${seed.normalizedSummary}`.trim());
  const eventLikeness = calculateEventLikeness({
    comparisonText,
    titleTokens: seed.titleTokens,
    category: seed.category,
    region,
    country,
    noiseScore: seed.noiseScore
  });
  const escalationFlags = detectEscalationFlags({
    comparisonText,
    category: seed.category,
    relevanceFlags: seed.relevanceFlags
  });
  const escalationSignal = calculateEscalationSignal({
    escalationFlags,
    eventLikeness,
    fieldRelevance: seed.fieldRelevance,
    noiseScore: seed.noiseScore
  });
  const toneProfile = buildToneProfile({
    comparisonText: translatedComparisonText || seed.originalComparisonText || comparisonText,
    category: seed.category
  });

  return {
    rawId: seed.rawId,
    domain: seed.domain || "signals",
    sourceName: seed.sourceName,
    sourceFamily: seed.sourceFamily,
    sourceType: seed.sourceType,
    connectorName: seed.connectorName,
    eventTime: seed.eventTime,
    sourceCountry: seed.sourceCountry,
    eventLocation,
    eventLocationType: incidentIdentity.eventLocationType || seed.eventLocationType || "unknown",
    eventLocationConfidence: Number(
      incidentIdentity.eventLocationConfidence ?? seed.eventLocationConfidence ?? 0
    ),
    eventLocationSource:
      incidentIdentity.eventLocationSource ||
      seed.eventLocationSource ||
      seed.locationSource ||
      "unknown",
    eventCountry,
    eventOriginCountry: incidentIdentity.eventOriginCountry || seed.eventOriginCountry || null,
    eventOriginLocation: incidentIdentity.eventOriginLocation || seed.eventOriginLocation || null,
    region,
    country,
    category: seed.category,
    observedUpdate: seed.observedUpdate,
    summary: seed.summary,
    correction: seed.correction,
    sourceConfidence: seed.sourceConfidence,
    severity,
    normalizedTitle: seed.normalizedTitle,
    normalizedSummary: seed.normalizedSummary,
    originalComparisonText: seed.originalComparisonText,
    translatedComparisonText: translatedComparisonText || null,
    comparisonText,
    translationApplied: Boolean(translatedComparisonText),
    translationSourceLanguage: seed.sourceLanguage || null,
    titleTokens: seed.titleTokens,
    locationSource:
      incidentIdentity.locationSource ||
      seed.locationSource ||
      "unknown",
    sourceGeography: {
      sourceCountry: seed.sourceCountry || null
    },
    eventGeography: {
      eventLocationLabel: eventLocation,
      eventLocationType: incidentIdentity.eventLocationType || seed.eventLocationType || "unknown",
      eventLocationSource:
        incidentIdentity.eventLocationSource ||
        seed.eventLocationSource ||
        seed.locationSource ||
        "unknown",
      eventLocationConfidence: Number(
        incidentIdentity.eventLocationConfidence ?? seed.eventLocationConfidence ?? 0
      ),
      eventCountry,
      eventOriginCountry: incidentIdentity.eventOriginCountry || seed.eventOriginCountry || null,
      eventOriginLocation: incidentIdentity.eventOriginLocation || seed.eventOriginLocation || null
    },
    noiseFlags: seed.noiseFlags,
    noiseScore: seed.noiseScore,
    relevanceFlags: seed.relevanceFlags,
    fieldRelevance: seed.fieldRelevance,
    escalationFlags,
    escalationSignal,
    toneProfile,
    tone_profile: toneProfile,
    eventLikeness,
    incidentActorTokens: incidentIdentity.incidentActorTokens,
    incidentTargetTokens: incidentIdentity.incidentTargetTokens,
    incidentLocationTokens: incidentIdentity.incidentLocationTokens,
    incidentActionTokens: incidentIdentity.incidentActionTokens,
    incidentKeyTokens: incidentIdentity.incidentKeyTokens,
    fingerprint: `${region.toLowerCase()}::${seed.category}::${fingerprintText(comparisonText)}`
  };
}

export function normalizeRawItem(raw) {
  const seed = buildNormalizedSeed(raw);
  return finalizeNormalizedItem(seed);
}

export async function normalizeRawItemWithTranslation(raw) {
  const seed = buildNormalizedSeed(raw);
  const shouldAttemptTranslation =
    Boolean(seed.originalComparisonText) &&
    !looksTranslatedToEnglish(seed.sourceLanguage) &&
    (
      Boolean(seed.sourceLanguage) ||
      containsNonLatinScript(seed.originalComparisonText)
    );

  if (!shouldAttemptTranslation) {
    return finalizeNormalizedItem(seed);
  }

  const translation = await translateTextToEnglish(seed.originalComparisonText);
  const translatedComparisonText = translation?.translated
    ? cleanDisplayText(translation.translatedText || "")
    : "";

  return finalizeNormalizedItem(seed, { translatedComparisonText });
}

export async function normalizeRawItems(rawItems = []) {
  return Promise.all(rawItems.map((raw) => normalizeRawItemWithTranslation(raw)));
}
