/**
 * Nhatty House AI — Virtual Receptionist Engine
 * 
 * CORE PRINCIPLES:
 * 1. Professional, warm, concise receptionist persona (1–3 natural sentences).
 * 2. Question-First Answering: answers the direct question immediately without unsolicited text dumps.
 * 3. Deep Business Knowledge: understands Nhatty's services, barbers, schedules, location, brand differentiators, and AI identity.
 * 4. Dynamic Service & Category Intelligence: correctly distinguishes between full service lists, specific category lists (haircut, beard), comparisons (cheapest), single service price queries, and booking actions.
 * 5. Minimal, Tasteful Action Buttons: only 0–1 useful action buttons attached when genuinely relevant.
 * 6. Token-Sequence Word Matching: prevents substring collision bugs (e.g. "how many barbers" vs "any barber").
 * 7. Intent Priority: informational inquiries take priority over booking-assignment intent.
 * 8. Conversational Memory: multi-turn context tracking (categories, services, barbers, time, active appointment).
 * 9. Single Source of Truth: dynamically reads real data from servicesData.js, barbersData.js, shopData.js, bookingStore.js.
 * 10. Strict Security: protects staff credentials and private data.
 * 11. Zero Hallucination: never invents fake prices, discounts, holiday hours, or policies.
 */

import { MOCK_SERVICES } from '../data/servicesData.js';
import { MOCK_BARBERS } from '../data/barbersData.js';
import { MOCK_SHOP_INFO } from '../data/shopData.js';
import {
  SERVICE_DURATION_MINUTES,
  BARBER_SCHEDULES,
  getBarberTimeSlots,
  getActiveBooking,
  getAllAppointments,
  minutesToDisplay,
  SHOP_OPEN_MINUTES,
  SHOP_CLOSE_MINUTES,
} from '../data/bookingStore.js';
import {
  setSystemNow,
  resetSystemNow,
  getSystemNow,
  getCurrentDateTime,
  getCurrentDate,
  getCurrentTime,
  getDateRelationship,
  formatAppointmentDescription,
  parseTimeToMinutes
} from './dateTimeUtils.js';

export {
  setSystemNow,
  resetSystemNow,
  getSystemNow,
  getCurrentDateTime,
  getCurrentDate,
  getCurrentTime,
  getDateRelationship,
  formatAppointmentDescription
};

// ── In-Memory Overrides for Automated Testing & Live Context ──────────
let inMemoryCustomerBooking = undefined;
let inMemoryCustomerHistory = null;

export function setInMemoryCustomerBooking(booking) {
  inMemoryCustomerBooking = booking;
}

export function setInMemoryCustomerHistory(history) {
  inMemoryCustomerHistory = history;
}

export function resetCustomerAiContext() {
  inMemoryCustomerBooking = undefined;
  inMemoryCustomerHistory = null;
  resetSystemNow();
}

export function getAuthoritativeActiveBooking() {
  if (inMemoryCustomerBooking !== undefined) return inMemoryCustomerBooking;
  try {
    return getActiveBooking();
  } catch (e) {
    return null;
  }
}

export function buildCustomerContext() {
  const active = getAuthoritativeActiveBooking();
  
  let allRecords = [];
  if (inMemoryCustomerHistory !== null) {
    allRecords = [...inMemoryCustomerHistory];
  } else {
    try {
      const allAppts = getAllAppointments();
      const activePhone = active?.customerPhone;
      const activeName = active?.customerName?.toLowerCase();
      const activeRef = active?.ref || active?.bookingReference;

      allRecords = allAppts.filter(a => {
        const aPhone = a.customerPhone;
        const aName = a.customerName?.toLowerCase();
        const aRef = a.ref || a.bookingReference;

        if (activeRef && aRef === activeRef) return true;
        if (activePhone && aPhone && aPhone === activePhone) return true;
        if (activeName && aName && aName === activeName) return true;
        return false;
      });
    } catch (e) {
      allRecords = [];
    }
  }

  // If active is present and not yet in allRecords, add it
  if (active && !allRecords.some(r => (r.ref && r.ref === (active.ref || active.bookingReference)) || (r.id && r.id === active.id))) {
    allRecords.unshift(active);
  }

  const isCancelledStatus = (s) => {
    if (!s) return false;
    return s === 'Customer Cancelled' || s === 'Cancelled' || s === 'Cancelled — Refund Completed' || s.includes('Cancelled');
  };

  // Active appointment: non-cancelled active record
  const activeAppointment = (active && !isCancelledStatus(active.status || active.bookingStatus)) ? active : null;

  // Cancelled records
  const cancelledAppointments = allRecords.filter(r => isCancelledStatus(r.status || r.bookingStatus));

  // Past / completed records:
  const pastAppointments = allRecords.filter(r => {
    if (isCancelledStatus(r.status || r.bookingStatus)) return false;
    if (r.status === 'Completed' || r.bookingStatus === 'Completed') return true;
    if (activeAppointment && ((r.ref && r.ref === (activeAppointment.ref || activeAppointment.bookingReference)) || (r.id && r.id === activeAppointment.id))) {
      return false;
    }
    return true;
  });

  // Previous appointment: most recent past/completed record, or previous cancelled record
  let previousAppointment = null;
  if (pastAppointments.length > 0) {
    previousAppointment = pastAppointments[0];
  } else if (cancelledAppointments.length > 0) {
    previousAppointment = cancelledAppointments[0];
  }

  // Total lifetime bookings count
  const totalBookingsCount = allRecords.length;

  return {
    activeBooking: active,
    activeAppointment,
    cancelledAppointments,
    pastAppointments,
    previousAppointment,
    allRecords,
    totalBookingsCount
  };
}

// ── 1. COMPREHENSIVE TYPO, SLANG & ETHIOPIAN ENGLISH DICTIONARY ──────

const NORMALIZATION_MAP = {
  // Common Abbreviations & Pronouns
  'u': 'you',
  'ur': 'your',
  'urs': 'yours',
  'r': 'are',
  'plz': 'please',
  'pls': 'please',
  'thx': 'thanks',
  'ty': 'thanks',
  'wanna': 'want to',
  'gonna': 'going to',
  'gotta': 'got to',
  'mch': 'much',
  'hw': 'how',
  'abt': 'about',
  'wit': 'with',
  'n': 'and',
  'bc': 'because',
  'cuz': 'because',
  'cos': 'because',
  'bro': 'friend',
  'brotha': 'friend',
  'boss': 'friend',
  'habibi': 'friend',
  'meny': 'many',
  'mny': 'many',
  'wat': 'what',
  'wats': 'what',
  'wht': 'what',
  'wich': 'which',
  'whch': 'which',
  'wen': 'when',
  'wn': 'when',
  'there': 'their',
  'ther': 'their',
  '9pm': '9 pm',
  '09pm': '9 pm',
  '8pm': '8 pm',
  '10pm': '10 pm',

  // Choose / Pick / Select Typos & Forms
  'chosse': 'choose',
  'choosed': 'choose',
  'chos': 'choose',
  'choss': 'choose',
  'chosee': 'choose',
  'choise': 'choose',
  'chose': 'choose',
  'chosing': 'choose',
  'choosen': 'choose',
  'pick': 'choose',
  'picked': 'choose',
  'select': 'choose',
  'selected': 'choose',
  'bc': 'because',
  'cuz': 'because',
  'cos': 'because',
  'bro': 'friend',
  'brotha': 'friend',
  'boss': 'friend',
  'habibi': 'friend',
  'meny': 'many',
  'mny': 'many',
  'wat': 'what',
  'there': 'their',
  'ther': 'their',
  '9pm': '9 pm',
  '09pm': '9 pm',
  '8pm': '8 pm',
  '10pm': '10 pm',

  // Time & Dates
  'tomoro': 'tomorrow',
  'tomorow': 'tomorrow',
  'tomrw': 'tomorrow',
  'tmrw': 'tomorrow',
  'tmr': 'tomorrow',
  '2morrow': 'tomorrow',
  'tomor': 'tomorrow',
  'tday': 'today',
  'todat': 'today',
  'todey': 'today',
  'yest': 'yesterday',
  'mrng': 'morning',
  'aftrnoon': 'afternoon',
  'evng': 'evening',
  'nite': 'night',

  // Barber Typos
  'barberr': 'barber',
  'barberrr': 'barber',
  'barberrs': 'barbers',
  'barbr': 'barber',
  'barbrs': 'barbers',
  'barberss': 'barbers',
  'babr': 'barber',
  'babrs': 'barbers',
  'barbar': 'barber',
  'barbars': 'barbers',
  'barb': 'barber',
  'berber': 'barber',
  'berbers': 'barbers',
  'stylist': 'barber',
  'stylists': 'barbers',
  'hairdresser': 'barber',

  // Haircut Typos
  'hairct': 'haircut',
  'hairctt': 'haircut',
  'haircuttt': 'haircut',
  'haircuts': 'haircut',
  'hrcut': 'haircut',
  'harcut': 'haircut',
  'haircur': 'haircut',
  'haircutt': 'haircut',
  'cuttt': 'cut',
  'cutt': 'cut',

  // Appointment & Booking Typos
  'appoitment': 'appointment',
  'appoitmnt': 'appointment',
  'appoinment': 'appointment',
  'apointment': 'appointment',
  'apointmnt': 'appointment',
  'appointmnt': 'appointment',
  'appoint': 'appointment',
  'appts': 'appointment',
  'appt': 'appointment',
  'apmt': 'appointment',
  'bookin': 'booking',
  'bookg': 'booking',
  'bok': 'book',
  'bookk': 'book',
  'boking': 'booking',
  'bokking': 'booking',
  'resrvation': 'reservation',
  'reserv': 'reservation',
  'resrv': 'reservation',
  'reseravtion': 'reservation',
  'schdule': 'schedule',
  'schedul': 'schedule',
  'skedule': 'schedule',

  // Service Typos
  'servce': 'service',
  'servcs': 'services',
  'servic': 'service',
  'servces': 'services',
  'serivce': 'service',
  'serivces': 'services',
  'servise': 'service',
  'servises': 'services',
  'srvice': 'service',
  'srvs': 'services',
  'srv': 'service',
  'facal': 'facial',
  'fashial': 'facial',
  'treament': 'treatment',
  'tretment': 'treatment',
  'towel': 'towel',
  'towell': 'towel',
  'shav': 'shave',
  'shavee': 'shave',
  'beerd': 'beard',
  'berd': 'beard',
  'bred': 'beard',
  'beards': 'beard',
  'cheep': 'cheap',
  'cheepest': 'cheapest',
  'chepest': 'cheapest',

  // Experience & Business Typos
  'exprience': 'experience',
  'experiance': 'experience',
  'experiense': 'experience',
  'exp': 'experience',
  'diffrent': 'different',
  'diferent': 'different',
  'diffrnt': 'different',
  'spcial': 'special',
  'speical': 'special',

  // Location Typos
  'locaton': 'location',
  'locatn': 'location',
  'loctn': 'location',
  'wher': 'where',
  'whre': 'where',
  'were': 'where',
  'adrs': 'address',
  'adress': 'address',
  'addres': 'address',
  'desi': 'dessie',
  'desie': 'dessie',
  'dese': 'dessie',
  'dessi': 'dessie',
  'luci': 'lucy',
  'hotl': 'hotel',

  // Shop Hours & Time Typos
  'openning': 'open',
  'oppening': 'open',
  'opennig': 'open',
  'opning': 'open',
  'oppen': 'open',
  'opn': 'open',
  'clossing': 'close',
  'clsing': 'close',
  'closng': 'close',
  'cloasing': 'close',
  'closs': 'close',
  'houres': 'hours',
  'hourz': 'hours',
  'hourse': 'hours',
  'hrs': 'hours',
  'hr': 'hours',
  'timings': 'time',
  'timing': 'time',
  'tyme': 'time',
  'tymes': 'time',

  // Payment & Refund Typos
  'paymnt': 'payment',
  'paymt': 'payment',
  'pymnt': 'payment',
  'teleber': 'telebirr',
  'telebr': 'telebirr',
  'telbirr': 'telebirr',
  'telebir': 'telebirr',
  'telbir': 'telebirr',
  'birr': 'telebirr',
  'cbee': 'cbe',
  'reciept': 'receipt',
  'receit': 'receipt',
  'recept': 'receipt',
  'recpt': 'receipt',
  'verif': 'verify',
  'verfy': 'verify',
  'verifed': 'verified',
  'refnd': 'refund',
  'refundd': 'refund',
  'refun': 'refund',
  'cancl': 'cancel',
  'cancle': 'cancel',
  'cancld': 'cancelled',
  'canceld': 'cancelled',
  'cncl': 'cancel',
  'cancell': 'cancel',

  // Casual Greetings & Amharic Transliterations
  'salam': 'selam',
  'hellow': 'hello',
  'helo': 'hello',
  'hllo': 'hello',
  'hye': 'hey',
  'tena': 'hello',
  'yistilgn': 'hello',
  'tenayistilgn': 'hello',
  'makina': 'parking',
  'maki': 'parking',
  'prking': 'parking',
  'parkin': 'parking',
  'qetero': 'booking',
  'ketero': 'booking',
  'yazelgn': 'book',
  'waga': 'price',
  'sint': 'how much',
  'yet': 'where',
  'bota': 'location',
  'walkin': 'walk in',
  'walkins': 'walk in',
  'reschedul': 'reschedule',
  'reschdule': 'reschedule',
  'modfy': 'modify',
  'chng': 'change',
  'hygen': 'hygiene',
  'sanitiz': 'sanitize',
  'steril': 'sterilize',
  'sterlized': 'sterilized',
  'weddin': 'wedding',
  'grom': 'groom',
  'pic': 'photo',
  'pix': 'photo',
  'picture': 'photo',
  'pictures': 'photo',
  'photos': 'photo',
  'prnt': 'print',
  'printout': 'print',
  'printed': 'print',
  'wheelchair': 'wheelchair',
  'accessible': 'accessible',
  'access': 'accessible',
  'upgrad': 'upgrade',
  'addon': 'upgrade',
  'somebody': 'someone',
};

// ── 2. PREPROCESSING & TOKEN-SEQUENCE MATCHING ─────────────────────────

function collapseRepeatedChars(str) {
  return str.replace(/(.)\1{2,}/g, '$1$1');
}

function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function normalizeInput(rawText) {
  if (!rawText) return { clean: '', tokens: [], normalizedStr: '', raw: '' };

  const low = rawText.toLowerCase().trim();
  const stripped = low
    .replace(/['’]/g, '')
    .replace(/[:?]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ');
  const words = stripped.split(/\s+/).filter(Boolean);

  const normalizedTokens = words.map(w => {
    const collapsed = collapseRepeatedChars(w);
    return NORMALIZATION_MAP[collapsed] || NORMALIZATION_MAP[w] || collapsed;
  });

  const normalizedStr = normalizedTokens.join(' ');
  return {
    raw: rawText,
    clean: stripped,
    tokens: normalizedTokens,
    normalizedStr
  };
}

function hasFuzzyWord(tokens, targetWord, maxDist = 1) {
  for (const t of tokens) {
    if (t === targetWord) return true;
    if (targetWord.length >= 4 && Math.abs(t.length - targetWord.length) <= 1) {
      if (levenshtein(t, targetWord) <= maxDist) return true;
    }
  }
  return false;
}

/**
 * Token-Sequence Phrase Matcher (Prevents substring collision bugs like 'how many barbers' vs 'any barber')
 */
function matchPhraseOrWord(parsed, keywords) {
  const { tokens } = parsed;

  for (const k of keywords) {
    if (k.includes(' ')) {
      const phraseWords = k.split(/\s+/).filter(Boolean).map(w => {
        const cleanWord = w.replace(/[:?]/g, '');
        const collapsed = collapseRepeatedChars(cleanWord);
        return NORMALIZATION_MAP[collapsed] || NORMALIZATION_MAP[cleanWord] || collapsed;
      });

      for (let i = 0; i <= tokens.length - phraseWords.length; i++) {
        let match = true;
        for (let j = 0; j < phraseWords.length; j++) {
          const expected = phraseWords[j];
          const actual = tokens[i + j];
          // Short words (<= 3 chars like 'any', 'how') require exact equality to prevent false positives
          if (expected.length <= 3) {
            if (actual !== expected) {
              match = false;
              break;
            }
          } else {
            if (actual !== expected && (expected.length < 4 || levenshtein(actual, expected) > 1)) {
              match = false;
              break;
            }
          }
        }
        if (match) return true;
      }
    } else {
      const cleanK = k.replace(/[:?]/g, '');
      const collapsed = collapseRepeatedChars(cleanK);
      const normalizedK = NORMALIZATION_MAP[collapsed] || NORMALIZATION_MAP[cleanK] || collapsed;
      if (tokens.includes(normalizedK) || hasFuzzyWord(tokens, normalizedK)) return true;
    }
  }
  return false;
}

// ── 3. SERVICE & BARBER ENTITY RECOGNITION ─────────────────────────────

function extractServiceEntity(parsed) {
  // VIP Royal Grooming
  if (matchPhraseOrWord(parsed, ['vip', 'royal', 'royal grooming', 'full grooming', 'complete package', 'vip royal', 'luxury'])) {
    return MOCK_SERVICES.find(s => s.id === 'srv-4') || MOCK_SERVICES[3];
  }

  // Hair Cut + Face Treatment
  if (
    matchPhraseOrWord(parsed, [
      'face treatment', 'facial', 'face', 'combo', 'cut face', 'haircut face',
      'cut with face', 'haircut with face', 'cut and face', 'haircut and face',
      'cut plus face', 'haircut plus face', 'with face', 'and face'
    ]) ||
    (matchPhraseOrWord(parsed, ['face', 'facial']) && matchPhraseOrWord(parsed, ['haircut', 'cut', 'hair']))
  ) {
    return MOCK_SERVICES.find(s => s.id === 'srv-2') || MOCK_SERVICES[1];
  }

  // Beard Sculpting & Trim
  if (matchPhraseOrWord(parsed, ['beard', 'beards', 'beard trim', 'trim beard', 'beard sculpt', 'beard sculpting', 'shaping beard', 'beard oil', 'with beard'])) {
    return MOCK_SERVICES.find(s => s.id === 'srv-3') || MOCK_SERVICES[2];
  }

  // Kids Cut
  if (matchPhraseOrWord(parsed, ['kid', 'kids', 'teen', 'teens', 'child', 'children', 'boy', 'youth', 'kids cut'])) {
    return MOCK_SERVICES.find(s => s.id === 'srv-5') || MOCK_SERVICES[4];
  }

  // Hot Towel Head Shave
  if (matchPhraseOrWord(parsed, ['hot towel', 'head shave', 'dome shave', 'bald shave', 'shave head', 'head razor'])) {
    return MOCK_SERVICES.find(s => s.id === 'srv-6') || MOCK_SERVICES[5];
  }

  // Hair Cut Only
  if (matchPhraseOrWord(parsed, ['haircut', 'hair cut', 'cut only', 'hair cut only', 'just cut', 'standard cut', 'hair', 'a cut'])) {
    return MOCK_SERVICES.find(s => s.id === 'srv-1') || MOCK_SERVICES[0];
  }

  return null;
}

function extractBarberEntity(parsed) {
  const { tokens, normalizedStr } = parsed;

  for (const b of MOCK_BARBERS) {
    const bName = b.name.toLowerCase();
    const fName = b.fullName.toLowerCase();
    if (tokens.includes(bName) || normalizedStr.includes(bName) || normalizedStr.includes(fName)) {
      return b;
    }
    for (const t of tokens) {
      if (bName.length >= 4 && levenshtein(t, bName) <= 1) {
        return b;
      }
    }
  }
  return null;
}

// ── 4. CONVERSATIONAL CONTEXT TRACKER ──────────────────────────────────

function analyzeContext(history = []) {
  if (!history || history.length === 0) {
    return {
      lastTopic: null,
      lastService: null,
      lastBarber: null,
      lastIntent: null,
      turnCount: 0
    };
  }

  let lastTopic = null;
  let lastService = null;
  let lastBarber = null;

  for (let i = history.length - 1; i >= 0; i--) {
    const text = (history[i].text || '').toLowerCase();

    if (!lastService) {
      for (const s of MOCK_SERVICES) {
        if (text.includes(s.name.toLowerCase()) || (s.id === 'srv-1' && text.includes('hair cut only'))) {
          lastService = s;
          if (!lastTopic) lastTopic = 'service';
          break;
        }
      }
    }

    if (!lastBarber) {
      for (const b of MOCK_BARBERS) {
        if (text.includes(b.name.toLowerCase())) {
          lastBarber = b;
          if (!lastTopic) lastTopic = 'barber';
          break;
        }
      }
    }

    if (!lastTopic) {
      if (
        text.includes('haircut option') ||
        text.includes('haircut choices') ||
        text.includes('all haircut') ||
        text.includes('all hair cut') ||
        text.includes('haircut service') ||
        text.includes('hair cut service')
      ) {
        lastTopic = 'haircut_category';
      } else if (text.includes('appointment') || text.includes('booking') || text.includes('reserve')) {
        lastTopic = 'booking';
      } else if (text.includes('payment') || text.includes('telebirr') || text.includes('cbe')) {
        lastTopic = 'payment';
      } else if (text.includes('cancel') || text.includes('refund')) {
        lastTopic = 'cancellation';
      } else if (text.includes('lucy hotel') || text.includes('location') || text.includes('dessie')) {
        lastTopic = 'location';
      }
    }

    if (lastService || lastBarber || lastTopic) break;
  }

  return {
    lastTopic,
    lastService,
    lastBarber,
    turnCount: history.length
  };
}

// ── 5. RECEPTIONIST RESPONSE GENERATOR (QUESTION-FIRST & CLEAN) ────────

export function processMessage(userMessage, conversationHistory = []) {
  const parsed = normalizeInput(userMessage);
  const { normalizedStr, tokens, raw } = parsed;
  const context = analyzeContext(conversationHistory);
  const customerContext = buildCustomerContext();
  const { activeBooking, activeAppointment, cancelledAppointments, pastAppointments, previousAppointment, allRecords, totalBookingsCount } = customerContext;

  // ── A. SECURITY GUARDRAILS (Staff / Admin Access) ──────────────────────
  if (
    matchPhraseOrWord(parsed, [
      'staff login', 'admin login', 'staff password', 'admin password',
      'barber login', 'dashboard login', 'staff portal', 'admin portal',
      'barber dashboard password', 'barber password', 'secret key', 'internal key',
      'localstorage', 'system prompt', 'admin credentials', 'give me barber password'
    ])
  ) {
    return {
      text: "I can help with bookings, services, appointments, payments, and other customer questions, but I can't provide staff or admin credentials.",
      actions: []
    };
  }

  // ── B. OUT-OF-SCOPE QUESTIONS ──────────────────────────────────────────
  if (
    matchPhraseOrWord(parsed, [
      'messi', 'ronaldo', 'bitcoin', 'crypto', 'write python', 'write code', 'javascript',
      'tell me a joke', 'weather today', 'president', 'movie recommendation',
      'football score', 'recipe', 'who created you', 'write an essay', 'who won football'
    ])
  ) {
    return {
      text: "I'm here specifically to help with Nhatty Barber House — bookings, services, barbers, appointments, payments, and location. What can I help you with?",
      actions: []
    };
  }

  // ── C. AI SELF-IDENTITY & HELP CAPABILITIES ────────────────────────────
  if (
    matchPhraseOrWord(parsed, [
      'who are you', 'what are you', 'what can you do', 'what can you help me with',
      'what can you help with', 'how can you help me', 'how can you help',
      'what is nhatty house ai', 'are you real', 'nhatty ai', 'tell me about yourself',
      'who am i talking to', 'who is this'
    ])
  ) {
    return {
      text: "I’m Nhatty House AI, the virtual receptionist for Nhatty Barber House. I can help with services, barbers, bookings, your appointments, payments, cancellations, refunds, and location information.",
      actions: []
    };
  }

  // ── D. GREETINGS & CASUAL POLITE OPENINGS ──────────────────────────────
  if (
    matchPhraseOrWord(parsed, [
      'hello', 'hi', 'hey', 'yo', 'sup', 'selam', 'salam', 'good morning',
      'good afternoon', 'good evening', 'friend', 'tena yistilgn', 'tenayistilgn', 'tena'
    ]) &&
    tokens.length <= 3 &&
    !matchPhraseOrWord(parsed, ['service', 'services', 'book', 'barber', 'price', 'cost', 'cut', 'appointment', 'where', 'location'])
  ) {
    return {
      text: "Hello! Welcome to Nhatty Barber House at Lucy Hotel. How can I help you today?",
      actions: []
    };
  }

  // ── E. COURTESIES & GOODBYES ───────────────────────────────────────────
  if (matchPhraseOrWord(parsed, ['thank', 'thanks', 'appreciate', 'cool', 'perfect', 'awesome', 'great', 'ok', 'okay', 'alright', 'got it']) && tokens.length <= 3) {
    return {
      text: "You're very welcome! We look forward to seeing you at Lucy Hotel Ground Floor.",
      actions: []
    };
  }

  if (matchPhraseOrWord(parsed, ['bye', 'goodbye', 'see you', 'later', 'ciao', 'take care']) && tokens.length <= 3) {
    return {
      text: "Have a great day, and see you soon at Nhatty Barber House! ✂️",
      actions: []
    };
  }

  // ── F. EXPLICIT GENERAL SERVICE INQUIRIES (HIGH PRIORITY) ──────────────
  const isPersonalQuery = (
    tokens.includes('my') ||
    tokens.includes('before') ||
    tokens.includes('previous') ||
    matchPhraseOrWord(parsed, [
      'did i', 'i chose', 'i choose', 'i chosse', 'i choosed', 'i picked',
      'i select', 'i selected', 'i cancel', 'i cancelled', 'last time',
      'last appointment', 'last haircut', 'last booking'
    ])
  );


  // ── F0. SPECIFIC DATE & DAY VERIFICATION INTENT (PRIORITY: "is my appointment today/tomorrow/yesterday?") ──
  const isDateVerificationQuery = (
    matchPhraseOrWord(parsed, [
      'is my appointment today', 'is my appointment today?', 'is my booking today', 'is my booking today?',
      'is appointment today', 'is booking today', 'appointment today?',
      'is my appointment tomorrow', 'is my appointment tomorrow?', 'is my booking tomorrow', 'is my booking tomorrow?',
      'is appointment tomorrow', 'is booking tomorrow', 'appointment tomorrow?',
      'was my appointment yesterday', 'was my appointment yesterday?', 'was my booking yesterday', 'was my booking yesterday?',
      'was appointment yesterday', 'what was my appointment yesterday', 'appointment yesterday?',
      'what day is my appointment', 'what day is my booking', 'what date is my appointment', 'what date is my booking',
      'which day is my appointment', 'which day is my booking'
    ]) ||
    ((tokens.includes('today') || tokens.includes('tomorrow') || tokens.includes('yesterday')) &&
     (tokens.includes('my') || tokens.includes('appointment') || tokens.includes('booking')) &&
     (tokens.includes('is') || tokens.includes('was') || tokens.includes('what')))
  );

  if (isDateVerificationQuery) {
    const targetDateAppt = activeAppointment || previousAppointment || (cancelledAppointments.length > 0 ? cancelledAppointments[0] : null);

    if (!targetDateAppt) {
      return {
        text: "You don't currently have an appointment scheduled. We are open daily from 8:00 AM to 8:00 PM.",
        actions: [{ label: '📅 Book an Appointment', type: 'navigate', path: '/booking' }]
      };
    }

    const _relDv = getDateRelationship(targetDateAppt);
    const _sDv = targetDateAppt.serviceName || 'your service';
    const _bDv = targetDateAppt.barberName || 'your barber';

    // Asked about TODAY
    if (tokens.includes('today')) {
      if (_relDv.isToday) {
        if (_relDv.isInProgress) {
          return {
            text: `Yes — your appointment for **${_sDv}** with **${_bDv}** is **today** and is **currently in progress** (${_relDv.timeDisplay}) 💈.`,
            actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
          };
        }
        if (_relDv.timeRelation === 'BEFORE') {
          return {
            text: `Yes — your appointment is **today, ${_relDv.monthName} ${_relDv.dayNum}, ${_relDv.yearNum}** at **${_relDv.startTime}** (${_relDv.timeDisplay}) with **${_bDv}** for **${_sDv}**.`,
            actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
          };
        }
        return {
          text: `Yes — your appointment was scheduled for **today** from **${_relDv.timeDisplay}** with **${_bDv}** for **${_sDv}**.`,
          actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
        };
      }
      return {
        text: `No — your appointment ${_relDv.verb} **${_relDv.formattedRelativeDate}** at **${_relDv.startTime}** (${_relDv.timeDisplay}) with **${_bDv}**.`,
        actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
      };
    }

    // Asked about TOMORROW
    if (tokens.includes('tomorrow')) {
      if (_relDv.isTomorrow) {
        return {
          text: `Yes — your appointment is **tomorrow, ${_relDv.monthName} ${_relDv.dayNum}, ${_relDv.yearNum}** at **${_relDv.startTime}** (${_relDv.timeDisplay}) with **${_bDv}** for **${_sDv}**.`,
          actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
        };
      }
      return {
        text: `No — your appointment ${_relDv.verb} **${_relDv.formattedRelativeDate}** at **${_relDv.startTime}** (${_relDv.timeDisplay}) with **${_bDv}**.`,
        actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
      };
    }

    // Asked about YESTERDAY
    if (tokens.includes('yesterday')) {
      if (_relDv.isYesterday) {
        return {
          text: `Yes — your appointment was **yesterday, ${_relDv.monthName} ${_relDv.dayNum}, ${_relDv.yearNum}**, from **${_relDv.timeDisplay}** with **${_bDv}** for **${_sDv}**.`,
          actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
        };
      }
      return {
        text: `No — your appointment ${_relDv.verb} **${_relDv.formattedRelativeDate}** at **${_relDv.startTime}** (${_relDv.timeDisplay}) with **${_bDv}**.`,
        actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
      };
    }

    // General day/date question ("what day is my appointment?")
    if (_relDv.isToday) {
      return {
        text: `Your appointment is **today, ${_relDv.dayName}, ${_relDv.monthName} ${_relDv.dayNum}, ${_relDv.yearNum}** at **${_relDv.startTime}** (${_relDv.timeDisplay}) with **${_bDv}**.`,
        actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
      };
    }
    if (_relDv.isTomorrow) {
      return {
        text: `Your appointment is **tomorrow, ${_relDv.dayName}, ${_relDv.monthName} ${_relDv.dayNum}, ${_relDv.yearNum}** at **${_relDv.startTime}** (${_relDv.timeDisplay}) with **${_bDv}**.`,
        actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
      };
    }
    if (_relDv.isYesterday) {
      return {
        text: `Your appointment was **yesterday, ${_relDv.dayName}, ${_relDv.monthName} ${_relDv.dayNum}, ${_relDv.yearNum}** from **${_relDv.timeDisplay}** with **${_bDv}**.`,
        actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
      };
    }
    return {
      text: `Your appointment ${_relDv.verb} on **${_relDv.dayName}, ${_relDv.monthName} ${_relDv.dayNum}, ${_relDv.yearNum}** at **${_relDv.startTime}** (${_relDv.timeDisplay}) with **${_bDv}**.`,
      actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
    };
  }

  // ── F1. EARLY ACTIVE APPOINTMENT OVERVIEW ────────────────────────────────
  // Exclude history/previous/last keywords from overview query so they fall through to the history handlers
  const _isHistoryKeyword = (
    tokens.includes('history') || tokens.includes('previous') || tokens.includes('before') ||
    tokens.includes('last') || normalizedStr.includes('booking history') ||
    normalizedStr.includes('show my booking history') || normalizedStr.includes('view my history') ||
    normalizedStr.includes('my history') || normalizedStr.includes('past') ||
    tokens.includes('how') // "how many times..."
  );

  const isAppointmentOverviewQuery = !_isHistoryKeyword && !isDateVerificationQuery && (
    matchPhraseOrWord(parsed, [
      'my appointment', 'my appointment?', 'my booking', 'my reservation', 'my ticket',
      'check my appointment', 'show my appointment', 'whats my appointment',
      'what is my appointment', 'what is my booking', 'my booking where',
      'show appointment', 'show booking', 'view appointment', 'view booking',
      'appointment details', 'booking details', 'my pass', 'appointment pass'
    ]) ||
    (tokens.length <= 2 && matchPhraseOrWord(parsed, ['appointment', 'booking', 'reservation']) &&
      (tokens.includes('my') || tokens.includes('check') || tokens.includes('status') || tokens.includes('show') || tokens.includes('view')))
  );

  if (isAppointmentOverviewQuery) {
    if (!activeAppointment && cancelledAppointments.length > 0) {
      const lastCancelled = cancelledAppointments[0];
      const _relCanc = getDateRelationship(lastCancelled);
      const _rf2 = lastCancelled.ref || lastCancelled.bookingReference || 'your booking';
      const _sN2 = lastCancelled.serviceName || 'your service';
      const _bN2 = lastCancelled.barberName || 'your barber';
      const _rSt2 = lastCancelled.refundStatus || 'Pending';
      return {
        text: `Your most recent booking (**${_rf2}**) for **${_sN2}** with **${_bN2}** was scheduled for ${_relCanc.formattedDateWithPrefix} (${_relCanc.timeDisplay}), but was **Cancelled** (Refund: **${_rSt2}**). For assistance, contact 0975 357 881.`,
        actions: [{ label: '📞 Contact Us', type: 'call', phone: '0975 357 881' }]
      };
    }
    if (!activeAppointment && pastAppointments.length > 0) {
      const pastAppt = pastAppointments[0];
      const _relPast = getDateRelationship(pastAppt);
      const _rfP = pastAppt.ref || pastAppt.bookingReference || '';
      const _rfStr = _rfP ? `(**${_rfP}**) ` : '';
      return {
        text: `Your previous appointment ${_rfStr}was ${_relPast.formattedDateWithPrefix}, from **${_relPast.timeDisplay}** with **${pastAppt.barberName}** for **${pastAppt.serviceName}**, and was **Completed** ✅.`,
        actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
      };
    }
    if (!activeAppointment) {
      return {
        text: "You don't currently have an active appointment. I can help you browse our services or start a new booking.",
        actions: [{ label: '📅 Book an Appointment', type: 'navigate', path: '/booking' }]
      };
    }
    return {
      text: formatAppointmentDescription(activeAppointment),
      actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
    };
  }

  // ── F2. APPOINTMENT STATUS & COMPLETION INTENT ───────────────────────────
  const isAppointmentStatusQuery = (
    matchPhraseOrWord(parsed, [
      'what is my appointment status', 'what is my status', 'whats my status',
      'what my status', 'status of my appointment', 'my appointment status',
      'is my appointment confirmed', 'is my appointment completed', 'is my appointment cancelled',
      'is my booking confirmed', 'is my booking completed', 'is my booking cancelled',
      'am i in the chair', 'am i in chair', 'is my service started', 'is my service in progress',
      'is my haircut started', 'is my haircut done', 'what happened to my appointment',
      'whats happening with my appointment', 'is my appointment active',
      'is my appointment still on', 'what is the status', 'my appointment status?',
      'is my appointment cancelled?', 'did they cancel my appointment',
      'was my appointment cancelled', 'is booking cancelled',
      'is it completed', 'is it completed?', 'is it done', 'is it done?',
      'is my appointment done', 'is my haircut completed'
    ]) ||
    (tokens.includes('status') && tokens.includes('my') && (tokens.includes('appointment') || tokens.includes('booking') || tokens.includes('payment') || tokens.length <= 3)) ||
    (tokens.includes('cancelled') && tokens.includes('my') && tokens.includes('appointment'))
  );

  if (isAppointmentStatusQuery && !tokens.includes('payment')) {
    const targetStatusAppt = activeAppointment || (cancelledAppointments.length > 0 ? cancelledAppointments[0] : (pastAppointments.length > 0 ? pastAppointments[0] : null));

    if (!targetStatusAppt) {
      return {
        text: "You don't currently have an active appointment. I can help you browse our services or start a new booking.",
        actions: [{ label: '📅 Book an Appointment', type: 'navigate', path: '/booking' }]
      };
    }

    const _relSt = getDateRelationship(targetStatusAppt);
    const _sN = targetStatusAppt.serviceName || 'your service';
    const _bN = targetStatusAppt.barberName || 'your barber';

    if (_relSt.isCancelled) {
      const _rSt = targetStatusAppt.refundStatus || 'Pending';
      return {
        text: `Your appointment was **Cancelled**. Refund status: **${_rSt}**. For assistance, contact us at 0975 357 881.`,
        actions: [{ label: '📞 Contact Us', type: 'call', phone: '0975 357 881' }]
      };
    }

    if (_relSt.isCompleted) {
      if (_relSt.isToday) {
        return {
          text: `Your appointment for **${_sN}** with **${_bN}** was **completed today** (${_relSt.timeDisplay}) ✅. Thank you for visiting Nhatty Barber House!`,
          actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
        };
      }
      if (_relSt.isYesterday) {
        return {
          text: `Your appointment for **${_sN}** with **${_bN}** was completed **yesterday, ${_relSt.monthName} ${_relSt.dayNum}, ${_relSt.yearNum}** from **${_relSt.timeDisplay}** ✅.`,
          actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
        };
      }
      return {
        text: `Your appointment for **${_sN}** with **${_bN}** was completed ${_relSt.formattedDateWithPrefix} (${_relSt.timeDisplay}) ✅.`,
        actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
      };
    }

    if (_relSt.isInProgress) {
      return {
        text: `You are currently **in the chair** — **${_sN}** with **${_bN}** is in progress right now (${_relSt.timeDisplay})! 💈`,
        actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
      };
    }

    if (_relSt.isToday && _relSt.timeRelation === 'AFTER') {
      return {
        text: `Your appointment for **${_sN}** with **${_bN}** was scheduled for **today** from **${_relSt.timeDisplay}** and is currently awaiting completion (${_relSt.paymentStatus}).`,
        actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
      };
    }

    if (_relSt.paymentStatus === 'Verified') {
      return {
        text: `Your appointment for **${_sN}** with **${_bN}** ${_relSt.formattedDateWithPrefix} at **${_relSt.startTime}** (${_relSt.timeDisplay}) is **Confirmed** ✓ — payment verified, you're all set!`,
        actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
      };
    }

    return {
      text: `Your appointment for **${_sN}** with **${_bN}** ${_relSt.formattedDateWithPrefix} at **${_relSt.startTime}** (${_relSt.timeDisplay}) is **${_relSt.status}** — payment is **${_relSt.paymentStatus}** (awaiting verification).`,
      actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
    };
  }

  // ── F3. FOLLOW-UP CONTEXT DISPATCHER ────────────────────────────────────
  // Short follow-up messages when active or previous appointment exists
  const _targetFollowUpAppt = activeAppointment || previousAppointment;
  const _isShortFollowUp = _targetFollowUpAppt && tokens.length <= 4 && (
    normalizedStr === 'what service' || normalizedStr === 'which service' ||
    normalizedStr === 'service' || normalizedStr === 'my service' ||
    normalizedStr === 'what haircut' || normalizedStr === 'which one' ||
    normalizedStr === 'how much' || normalizedStr === 'price' || normalizedStr === 'cost' ||
    normalizedStr === 'when' || normalizedStr === 'when?' || normalizedStr === 'what time' || normalizedStr === 'time' ||
    normalizedStr === 'date' || normalizedStr === 'what date' || normalizedStr === 'what day' ||
    normalizedStr === 'who' || normalizedStr === 'who?' || normalizedStr === 'barber' || normalizedStr === 'what barber' || normalizedStr === 'which barber' ||
    normalizedStr === 'paid' || normalizedStr === 'paid?' || normalizedStr === 'payment' || normalizedStr === 'payment?' || normalizedStr === 'verified' || normalizedStr === 'verified?' ||
    normalizedStr === 'status' || normalizedStr === 'status?' || normalizedStr === 'ref' || normalizedStr === 'reference' ||
    normalizedStr === 'booking number' || normalizedStr === 'ticket' || normalizedStr === 'who was the barber' ||
    normalizedStr === 'is it completed' || normalizedStr === 'is it completed?' || normalizedStr === 'completed' || normalizedStr === 'completed?' ||
    (context.lastTopic === 'appointment' && !matchPhraseOrWord(parsed, ['services', 'all services', 'book now', 'location', 'open', 'close', 'hours', 'barbers']))
  );

  if (_isShortFollowUp) {
    const _ap = _targetFollowUpAppt;
    const _relFu = getDateRelationship(_ap);
    const _bNm = _ap.barberName || 'your barber';
    const _sNm = _ap.serviceName || 'Grooming Service';
    const _pr = _ap.price || _ap.amountPaid || 0;
    const _pSt = _ap.paymentStatus || 'Verification Pending';
    const _rf = _ap.ref || _ap.bookingReference || 'N/A';

    // Service follow-up
    if (normalizedStr === 'what service' || normalizedStr === 'which service' || normalizedStr === 'service' || normalizedStr === 'my service' || normalizedStr === 'what haircut' || normalizedStr === 'which one' ||
        (context.lastTopic === 'appointment' && (tokens.includes('service') || tokens.includes('haircut')) && !tokens.includes('you') && !tokens.includes('your'))) {
      return { text: `You chose **${_sNm}** for your appointment.`, actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }] };
    }

    // Price follow-up
    if (normalizedStr === 'how much' || normalizedStr === 'price' || normalizedStr === 'cost' ||
        (context.lastTopic === 'appointment' && (tokens.includes('much') || tokens.includes('price') || tokens.includes('cost')) && (tokens.includes('it') || tokens.length <= 2))) {
      return { text: `Your service is **${_pr} ETB** (${_sNm}).`, actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }] };
    }

    // Time / Date follow-up ("when", "what time", "date")
    if (normalizedStr === 'when' || normalizedStr === 'when?' || normalizedStr === 'what time' || normalizedStr === 'time' || normalizedStr === 'date' || normalizedStr === 'what date' || normalizedStr === 'what day' ||
        (context.lastTopic === 'appointment' && (tokens.includes('when') || tokens.includes('date') || tokens.includes('time')) && !tokens.includes('do') && !tokens.includes('you') && !tokens.includes('open') && !tokens.includes('close'))) {
      if (_relFu.isInProgress) {
        return { text: `Your appointment is **currently in progress** (${_relFu.timeDisplay}) with **${_bNm}**.`, actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }] };
      }
      if (_relFu.isToday) {
        if (_relFu.timeRelation === 'BEFORE') {
          return { text: `Your appointment is **today, ${_relFu.monthName} ${_relFu.dayNum}, ${_relFu.yearNum}** at **${_relFu.startTime}** (${_relFu.timeDisplay}) with **${_bNm}**.`, actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }] };
        }
        return { text: `Your appointment was scheduled for **today** from **${_relFu.timeDisplay}** with **${_bNm}**.`, actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }] };
      }
      if (_relFu.isTomorrow) {
        return { text: `Your appointment is **tomorrow, ${_relFu.monthName} ${_relFu.dayNum}, ${_relFu.yearNum}** at **${_relFu.startTime}** (${_relFu.timeDisplay}) with **${_bNm}**.`, actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }] };
      }
      if (_relFu.isYesterday) {
        return { text: `Your appointment was **yesterday, ${_relFu.monthName} ${_relFu.dayNum}, ${_relFu.yearNum}** from **${_relFu.timeDisplay}** with **${_bNm}**.`, actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }] };
      }
      if (_relFu.diffDays > 1) {
        return { text: `Your appointment is on **${_relFu.dayName}, ${_relFu.monthName} ${_relFu.dayNum}, ${_relFu.yearNum}** at **${_relFu.startTime}** (${_relFu.timeDisplay}) with **${_bNm}**.`, actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }] };
      }
      return { text: `Your appointment was on **${_relFu.dayName}, ${_relFu.monthName} ${_relFu.dayNum}, ${_relFu.yearNum}** from **${_relFu.timeDisplay}** with **${_bNm}**.`, actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }] };
    }

    // Barber follow-up
    if (normalizedStr === 'barber' || normalizedStr === 'what barber' || normalizedStr === 'which barber' || normalizedStr === 'who' || normalizedStr === 'who?' || normalizedStr === 'who was the barber' ||
        (context.lastTopic === 'appointment' && tokens.includes('barber') && !tokens.includes('you') && !tokens.includes('your'))) {
      if (_relFu.isPast) {
        return { text: `Your barber was **${_bNm}** for your appointment (${_relFu.formattedRelativeDate}).`, actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }] };
      }
      return { text: `Your barber is **${_bNm}** for your appointment on **${_relFu.formattedRelativeDate}** at **${_relFu.timeDisplay}**.`, actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }] };
    }

    // Payment follow-up
    if (normalizedStr === 'paid' || normalizedStr === 'paid?' || normalizedStr === 'payment' || normalizedStr === 'payment?' || normalizedStr === 'verified' || normalizedStr === 'verified?' ||
        (context.lastTopic === 'appointment' && (tokens.includes('paid') || tokens.includes('payment') || tokens.includes('verified')) && !tokens.includes('method') && !tokens.includes('how'))) {
      if (_pSt === 'Verified') {
        return { text: `Yes — your payment has been **verified** ✓ (${_pr} ETB).`, actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }] };
      }
      return { text: `Your payment is currently **Verification Pending** (${_pr} ETB). Our front desk team will verify your receipt shortly.`, actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }] };
    }

    // Completion / Status follow-up
    if (normalizedStr === 'is it completed' || normalizedStr === 'is it completed?' || normalizedStr === 'completed' || normalizedStr === 'completed?' || normalizedStr === 'is it done' || normalizedStr === 'status' || normalizedStr === 'status?') {
      if (_relFu.isCompleted) {
        return { text: `Yes — your appointment for **${_sNm}** with **${_bNm}** was **completed** ✅.`, actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }] };
      }
      if (_relFu.isInProgress) {
        return { text: `No — your appointment is **currently in progress** with **${_bNm}** (${_relFu.timeDisplay}) 💈.`, actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }] };
      }
      if (_relFu.isCancelled) {
        return { text: `Your appointment was **Cancelled** (Refund: **${_ap.refundStatus || 'Pending'}**).`, actions: [{ label: '📞 Contact Us', type: 'call', phone: '0975 357 881' }] };
      }
      if (_relFu.isToday && _relFu.timeRelation === 'AFTER') {
        return { text: `Your appointment was scheduled for **today** from **${_relFu.timeDisplay}** and is currently awaiting completion.`, actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }] };
      }
      return { text: `No — your appointment is scheduled for **${_relFu.formattedRelativeDate}** at **${_relFu.startTime}** and is currently **Confirmed** (awaiting your visit).`, actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }] };
    }

    // Booking reference follow-up
    if (normalizedStr === 'ref' || normalizedStr === 'reference' || normalizedStr === 'booking number' || normalizedStr === 'ticket') {
      return { text: `Your booking reference is **${_rf}**.`, actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }] };
    }
  }

    const isGeneralServiceInquiry = !isPersonalQuery && (
    matchPhraseOrWord(parsed, [
      'tell me the nhatty barber services', 'tell me the nhatty services',
      'ok tell me the nhatty barber services', 'ok tell me the nhatty services',
      'tell me nhatty barber services', 'nhatty barber services', 'nhatty services',
      'tell me the services', 'tell me your services', 'tell me ur services',
      'tell me services', 'tell me servce', 'show me all the service',
      'show me all the services', 'show me all service', 'show me all services',
      'show all services', 'show all service', 'show me services', 'show services',
      'what services do you have', 'what services do u have', 'what services does nhatty have',
      'what services does nhatty barber have', 'what service u got', 'what service you have',
      'what services you have', 'u have what services', 'what can i get', 'what can i get there',
      'what can i book', 'what do you offer', 'what do u offer', 'what u offer', 'what you offer',
      'list services', 'list all services', 'services list', 'service list', 'all service',
      'all services', 'all services?', 'give me all service', 'give me all services',
      'show me everything you offer', 'how much are the services', 'how mch are the services',
      'menu', 'services menu', 'service menu', 'all the service', 'all the services',
      'our services', 'all the service in nhatty barber', 'pricing', 'prices', 'prices?',
      'sint new', 'sint new?', 'sint naw', 'waga', 'waga sint new', 'waga sint',
      'what servce you have', 'what servce u have', 'nhatty servces', 'all servce',
      'what haircut you have', 'what haircut do you offer'
    ]) || (
      tokens.length <= 2 && matchPhraseOrWord(parsed, ['service', 'services', 'servce', 'servces', 'menu', 'pricing', 'prices'])
    )
  );

  if (isGeneralServiceInquiry) {
    const serviceBullets = MOCK_SERVICES.map(s => `• **${s.name}** — ${s.price} ETB`).join('\n');
    return {
      text: `Here are all the services at Nhatty Barber House:\n\n${serviceBullets}\n\nAll services are 60 minutes. Would you like to choose one or start your booking?`,
      actions: [
        { label: '📅 Start Booking', type: 'navigate', path: '/booking' }
      ]
    };
  }

  // 1. Haircut Category Listing
  const isHaircutCategoryList = !isPersonalQuery && (
    matchPhraseOrWord(parsed, [
      'all hair cut services', 'all haircut services', 'all hair cut service', 'all haircut service',
      'show me all haircut services', 'show me all hair cut services', 'show all haircut services',
      'show all hair cut services', 'what haircut services do you have', 'what hair cut services do you have',
      'what haircut services do u have', 'what hair cut services do u have', 'what haircut services u have',
      'what hair cut services u have', 'what hair cuts can i get', 'what haircuts can i get',
      'what hair cut can i get', 'what haircut can i get', 'list all haircut services',
      'list all hair cut services', 'list haircut services', 'list hair cut services',
      'all haircuts', 'all hair cuts', 'all haircut', 'all hair cut', 'haircut options',
      'hair cut options', 'what are the haircut options', 'what are the hair cut options',
      'haircut choices', 'hair cut choices', 'haircut types', 'hair cut types',
      'show me haircut options', 'show me hair cut options', 'all hairct services',
      'all hairct service', 'what hairct can i get', 'show all hairct', 'all hairct option',
      'all hairct options', 'hair cuts all', 'haircuts all', 'hair cut all services',
      'haircut all services', 'wat hair cut services u have', 'wat haircut services u have',
      'what haircut services you have', 'what hair cut services you have', 'haircut list',
      'hair cut list', 'different haircuts', 'types of haircuts', 'haircut varieties',
      'all cuts', 'cut options', 'hair options', 'show all haircuts', 'haircut services'
    ])
  );

  if (isHaircutCategoryList) {
    const haircutServices = MOCK_SERVICES.filter(s =>
      s.category === 'haircut' ||
      s.id === 'srv-1' || s.id === 'srv-2' || s.id === 'srv-5' || s.id === 'srv-4' ||
      s.name.toLowerCase().includes('cut') ||
      s.name.toLowerCase().includes('hair')
    );
    const bullets = haircutServices.map(s => `• **${s.name}** — ${s.price} ETB`).join('\n');
    return {
      text: `Here are our haircut options:\n\n${bullets}\n\nAll services are 60 minutes.`,
      actions: [
        { label: '📅 Choose a Service', type: 'navigate', path: '/booking' }
      ]
    };
  }

  // 2. Beard Category Listing
  const isBeardCategoryList = !isPersonalQuery && (
    matchPhraseOrWord(parsed, [
      'all beard services', 'all beard service', 'show me all beard services', 'show all beard services',
      'what beard services do you have', 'what beard services do u have', 'beard options',
      'what are the beard options', 'beard choices', 'beard types', 'list beard services',
      'all beards', 'all beard'
    ])
  );

  if (isBeardCategoryList) {
    const beardServices = MOCK_SERVICES.filter(s =>
      s.category === 'beard' ||
      s.id === 'srv-3' || s.id === 'srv-4' ||
      s.name.toLowerCase().includes('beard') ||
      s.description.toLowerCase().includes('beard')
    );
    const bullets = beardServices.map(s => `• **${s.name}** — ${s.price} ETB`).join('\n');
    return {
      text: `Here are our beard grooming options:\n\n${bullets}\n\nAll services are 60 minutes.`,
      actions: [
        { label: '📅 Choose a Service', type: 'navigate', path: '/booking' }
      ]
    };
  }

  // 3. Cheapest Service / Comparison / Most expensive / Best
  if (matchPhraseOrWord(parsed, [
    'which service is cheapest', 'which is cheapest', 'cheapest service', 'cheapest',
    'lowest price', 'lowest price service', 'most affordable service', 'most affordable',
    'cheapest haircut', 'cheapest cut', 'what is the cheapest service',
    'what is cheapest', 'lowest cost service', 'budget service', 'cheap service'
  ])) {
    if (context.lastTopic === 'haircut_category' || tokens.includes('haircut') || tokens.includes('cut')) {
      const haircutServices = MOCK_SERVICES.filter(s =>
        s.category === 'haircut' || s.id === 'srv-1' || s.id === 'srv-2' || s.id === 'srv-5' || s.id === 'srv-4'
      ).sort((a, b) => a.price - b.price);
      const cheapest = haircutServices[0];
      return {
        text: `Among our haircut options, the most affordable is **${cheapest.name}** at **${cheapest.price} ETB** (for adult standard cuts, **Hair Cut Only** is 400 ETB).`,
        actions: [
          { label: `📅 Book ${cheapest.name}`, type: 'navigate', path: `/booking?service=${cheapest.id}` }
        ]
      };
    }
    const sorted = [...MOCK_SERVICES].sort((a, b) => a.price - b.price);
    const cheapest = sorted[0];
    return {
      text: `Our most affordable service is **${cheapest.name}** at **${cheapest.price} ETB** (${cheapest.description}).`,
      actions: [
        { label: `📅 Book ${cheapest.name}`, type: 'navigate', path: `/booking?service=${cheapest.id}` }
      ]
    };
  }


  // 3b. Most Expensive / Premium Service
  if (matchPhraseOrWord(parsed, [
    'most expensive service', 'which is most expensive', 'premium service', 'most expensive',
    'top service', 'best service', 'which service is best', 'which is best', 'best grooming',
    'what is the best service', 'highest price', 'highest cost service', 'expensive service',
    'luxury service', 'top package'
  ])) {
    const sorted = [...MOCK_SERVICES].sort((a, b) => b.price - a.price);
    const prem = sorted[0];
    return {
      text: `Our most premium service is **${prem.name}** at **${prem.price} ETB** — ${prem.description || prem.tagline}.`,
      actions: [{ label: `📅 Book ${prem.name}`, type: 'navigate', path: `/booking?service=${prem.id}` }]
    };
  }

  // 4. Inclusions (Hot towel head shave, face treatment, kids cut age range)
  if (
    matchPhraseOrWord(parsed, [
      'what is in head shave', 'what is included in head shave', 'what is hot towel head shave',
      'what includes head shave', 'head shave include', 'head shave inclusions'
    ]) || (tokens.includes('head') && tokens.includes('shave') && (tokens.includes('what') || tokens.includes('include') || tokens.includes('includes')))
  ) {
    return {
      text: "Our **Hot Towel Head Shave** (350 ETB) is a 60-minute traditional straight razor dome shave featuring pre-shave oil conditioning, eucalyptus hot towels, scalp massage, and cooling post-shave balm for an ultra-smooth finish.",
      actions: [
        { label: '📅 Book Head Shave (350 ETB)', type: 'navigate', path: '/booking?service=srv-6' }
      ]
    };
  }

  if (
    matchPhraseOrWord(parsed, [
      'what is in face treatment', 'what is included in face treatment', 'what is facial',
      'face treatment include', 'facial include', 'what is in facial', 'facial treatment include'
    ]) || (tokens.includes('face') && tokens.includes('treatment') && (tokens.includes('what') || tokens.includes('include') || tokens.includes('includes')))
  ) {
    return {
      text: "Our **Hair Cut + Face Treatment** (500 ETB) includes a signature precision haircut paired with a deep pore cleanse, exfoliating black mask, and soothing eucalyptus hot towel steam.",
      actions: [
        { label: '📅 Book Hair Cut + Face (500 ETB)', type: 'navigate', path: '/booking?service=srv-2' }
      ]
    };
  }

  if (
    matchPhraseOrWord(parsed, [
      'what age for kids cut', 'age limit for kids cut', 'kids cut age', 'kids cut age range',
      'how old for kids cut', 'age for children cut', 'can parents sit with child',
      'can parent stay', 'parents allowed'
    ]) || (tokens.includes('kids') && (tokens.includes('age') || tokens.includes('old') || tokens.includes('limit') || tokens.includes('parents') || tokens.includes('parent')))
  ) {
    return {
      text: "Our **Kids & Teens Fresh Cut** (350 ETB) is specially designed for youth and teenagers up to 17 years old with patient, gentle, and trendy styling. Parents are always welcome right beside the barber chair or in our VIP lounge.",
      actions: [
        { label: '📅 Book Kids Cut (350 ETB)', type: 'navigate', path: '/booking?service=srv-5' }
      ]
    };
  }

  // ── G. EXPLICIT GENERAL BARBER INQUIRIES ───────────────────────────────
  if (
    matchPhraseOrWord(parsed, [
      'how many barbers', 'how many barber', 'number of barbers', 'how many barber do you have',
      'how many barbers does nhatty have', 'how many barbers do nhatty barber have',
      'u have how many barbers', 'how many people cut hair there', 'how many people cut hair',
      'how many barbers are available', 'how many barber u got', 'u got how mch barber',
      'u got how many barber', 'barber how many', 'count of barbers', 'how many barberr',
      'how meny barbr'
    ]) ||
    (tokens.includes('how') && (tokens.includes('many') || tokens.includes('much')) && (tokens.includes('barber') || tokens.includes('barbers')))
  ) {
    return {
      text: `We have ${MOCK_BARBERS.length} professional barbers at Nhatty Barber House. You can choose a specific barber or let us assign an available barber for you.`,
      actions: []
    };
  }

  if (matchPhraseOrWord(parsed, ['can i choose a barber', 'can i pick a barber', 'can i select a barber', 'choose a barber', 'can i choose barber'])) {
    return {
      text: "Yes, you can choose any of our 8 certified master barbers, or select Any Available Barber to automatically get the earliest open slot.",
      actions: []
    };
  }

  if (
    matchPhraseOrWord(parsed, [
      'who are the barbers', 'who are your barbers', 'who are ur barbers',
      'who are barbers', 'what barbers', 'your barbers', 'who works',
      'barber list', 'list barbers', 'our barbers', 'who cuts', 'all barbers',
      'who cut hair', 'who cuts hair', 'who can i book', 'what barbers u have',
      'what barbers do you have', 'tell me about your barbers', 'tell me about the barbers'
    ]) ||
    (tokens.length === 1 && tokens[0] === 'who')
  ) {
    const names = MOCK_BARBERS.map(b => b.name).join(', ');
    return {
      text: `Our team of ${MOCK_BARBERS.length} Wahl-certified master barbers includes **${names}**. All have 5+ years of experience. You can choose any of them when booking or pick Any Available Barber for the earliest opening.`,
      actions: [
        { label: '📅 Book an Appointment', type: 'navigate', path: '/booking' }
      ]
    };
  }

  if (
    tokens.length <= 2 &&
    !tokens.includes('my') &&
    !tokens.includes('i') &&
    !tokens.includes('who') &&
    !tokens.includes('which') &&
    !tokens.includes('open') &&
    !tokens.includes('opening') &&
    !tokens.includes('close') &&
    !tokens.includes('closing') &&
    !tokens.includes('hours') &&
    !tokens.includes('hour') &&
    !tokens.includes('time') &&
    !tokens.includes('when') &&
    matchPhraseOrWord(parsed, ['barber', 'barbers'])
  ) {
    return {
      text: `We have ${MOCK_BARBERS.length} professional barbers at Nhatty Barber House. You can choose your preferred barber or let us find an available one for you.`,
      actions: []
    };
  }

  if (
    matchPhraseOrWord(parsed, [
      'name and their work time of barber', 'name and their work time of barbers',
      'name and there work time of barber', 'name and there work time of barbers',
      'names and their work times of barbers', 'names and there work times of barbers',
      'name and work time of barber', 'names and work times of barber',
      'name and work time', 'names and work times', 'barber schedules', 'barber schedule',
      'barber shifts', 'barber shift', 'barber work time', 'barber work times',
      'barber work hours', 'barber hours', 'when do barbers work', 'when barbers work',
      'work time of barber', 'work times of barbers', 'work time of barbers',
      'barbers work time', 'barbers work times', 'barber timing', 'barber timings',
      'schedule of barbers', 'shift of barbers', 'barber shift times'
    ]) || (
      (tokens.includes('barber') || tokens.includes('barbers')) &&
      (tokens.includes('schedule') || tokens.includes('schedules') || tokens.includes('shift') || tokens.includes('shifts') || (tokens.includes('work') && (tokens.includes('time') || tokens.includes('times') || tokens.includes('hours'))))
    )
  ) {
    return {
      text: "Here are our 8 master barbers and their daily staggered work schedules (Monday – Sunday, 8:00 AM – 8:00 PM):\n\n• **Abebe & Melaku** — 8:00 AM start\n• **Kebede & Dawit** — 8:15 AM start\n• **Bekele & Yohannes** — 8:30 AM start\n• **Zenabu & Henok** — 8:45 AM start\n\nAll appointments are 60-minute sessions. You can choose your preferred barber or select Any Available Barber for the earliest opening.",
      actions: [
        { label: '📅 Book an Appointment', type: 'navigate', path: '/booking' }
      ]
    };
  }

  if (matchPhraseOrWord(parsed, [
    'which one starts earliest', 'which barber start first', 'who starts first',
    'earliest barber', 'who start earliest', 'who starts earliest', 'who start first',
    'who starts earliest?', 'starts earliest'
  ])) {
    return {
      text: "Abebe and Melaku start earliest at 8:00 AM. Kebede and Dawit start at 8:15 AM, Bekele and Yohannes at 8:30 AM, and Zenabu and Henok at 8:45 AM.",
      actions: []
    };
  }

  if (matchPhraseOrWord(parsed, [
    'any barber', 'any barber is fine', 'i dont care which barber', 'choose a barber for me',
    'pick whoever is available', 'book me with anyone', 'i want the earliest available barber',
    'whoever is available', 'assign a barber for me', 'any available barber', 'anyone is fine',
    'any one is fine', 'next available barber', 'earliest available barber', 'any available'
  ])) {
    return {
      text: `Selecting 'Any Available Barber' combines open slots across all ${MOCK_BARBERS.length} master barbers and automatically assigns the earliest available barber for your chosen time.`,
      actions: [
        { label: '📅 Book with Any Barber', type: 'navigate', path: '/booking?barber=any' }
      ]
    };
  }

  // ── H. SHOP INFORMATION: LOCATION, BUSINESS HOURS & AMENITIES ───────────

  // 1. Single Source of Truth for Shop Hours (dynamically from shopData.js)
  const shopHoursTime = MOCK_SHOP_INFO.hours?.time || '8:00 AM - 8:00 PM';
  const [openTimeRaw, closeTimeRaw] = shopHoursTime.split('-').map(t => t.trim());
  const shopOpenTime = openTimeRaw || '8:00 AM';
  const shopCloseTime = closeTimeRaw || '8:00 PM';
  const isDailySchedule = (MOCK_SHOP_INFO.hours?.schedule === 'Mon - Sun') || Boolean(MOCK_SHOP_INFO.hours?.schedule?.toLowerCase().includes('daily'));
  const scheduleDescriptor = isDailySchedule ? 'daily ' : '';

  // 2. Location, Address & Directions Inquiries
  if (
    matchPhraseOrWord(parsed, [
      'location', 'where are u', 'where u at', 'wher nhatty', 'where location',
      'where is', 'address', 'landmark', 'how to get', 'find you', 'dessie',
      'lucy hotel', 'located', 'where nhatty barber found', 'where are you', 'where u guys',
      'where u guys?', 'bro where nhatty', 'where you at', 'yet new', 'yet new?', 'yet naw',
      'bota', 'bota yet new', 'where do i go', 'how can i get there', 'where is nhatty',
      'where can i find you', 'where are you located', 'where is the shop', 'shop location',
      'how to get there', 'where to find you', 'find nhatty', 'directions'
    ]) ||
    (tokens.length <= 2 && tokens[0] === 'where')
  ) {
    return {
      text: "We’re at Lucy Hotel, Ground Floor, Dessie Branch.",
      actions: [
        { label: '🗺️ Get Directions', type: 'link', url: 'https://maps.google.com/?q=Lucy+Hotel+Dessie+Ethiopia' }
      ]
    };
  }

  // 3. Shop Hours / Business Hours (Dedicated Intent)
  // Ensure personal appointment time questions (e.g., "what time is my appointment?", "my booking time") route to appointment
  const isPersonalAppointmentTimeQuery = (
    (tokens.includes('my') || tokens.includes('ticket') || tokens.includes('ref')) &&
    (tokens.includes('appointment') || tokens.includes('booking') || tokens.includes('cut') || tokens.includes('haircut') || tokens.includes('session'))
  );

  if (!isPersonalAppointmentTimeQuery) {
    const hasOpenWord = tokens.includes('open') || tokens.includes('opening') || tokens.includes('opened');
    const hasCloseWord = tokens.includes('close') || tokens.includes('closing') || tokens.includes('closed');
    const hasHoursWord = tokens.includes('hours') || tokens.includes('hour') || tokens.includes('business') || tokens.includes('schedule') || tokens.includes('timing') || tokens.includes('timings');

    const isShopHoursQuery = (
      (hasOpenWord && hasCloseWord) ||
      (hasOpenWord && (tokens.includes('hours') || tokens.includes('time') || tokens.includes('when') || tokens.includes('what') || tokens.includes('schedule') || tokens.includes('nhatty') || tokens.includes('barber') || tokens.includes('shop') || tokens.includes('you') || tokens.includes('u') || tokens.includes('today') || tokens.includes('bro') || tokens.includes('guys'))) ||
      (hasCloseWord && (tokens.includes('hours') || tokens.includes('time') || tokens.includes('when') || tokens.includes('what') || tokens.includes('schedule') || tokens.includes('nhatty') || tokens.includes('barber') || tokens.includes('shop') || tokens.includes('you') || tokens.includes('u') || tokens.includes('today') || tokens.includes('bro') || tokens.includes('guys'))) ||
      (hasHoursWord && (tokens.includes('what') || tokens.includes('shop') || tokens.includes('business') || tokens.includes('barber') || tokens.includes('nhatty') || tokens.includes('your') || tokens.includes('ur') || tokens.includes('work') || tokens.includes('working') || tokens.length <= 2)) ||
      matchPhraseOrWord(parsed, [
        'opening hours', 'closing hours', 'opening and closing hours', 'openning and closing hours',
        'openning and closing hours of this barber', 'opening and closing hours of this barber',
        'opening time of this barber', 'closing time of this barber', 'openning time of this barber',
        'what time do you open', 'what time do you close', 'when do you open', 'when do you close',
        'what are your hours', 'what are the hours', 'business hours', 'shop hours',
        'barber opening time', 'barber closing time', 'when is nhatty barber open', 'when is nhatty barber closed',
        'what time does nhatty open', 'what time does nhatty close', 'openning hours', 'oppening hours',
        'opening houres', 'closing houres', 'clossing hours', 'what time u open', 'wat time u close',
        'what time you open', 'what time you close', 'when u open', 'when u close',
        'when you open', 'when you close', 'nhatty open', 'nhatty close', 'barber open', 'barber close',
        'is nhatty open', 'is barber open', 'are you open', 'are u open', 'u guys open', 'open today'
      ]) ||
      (tokens.length <= 2 && (hasHoursWord || hasOpenWord || hasCloseWord || normalizedStr === 'what time' || normalizedStr === 'what time?' || normalizedStr === 'when' || normalizedStr === 'when?')) ||
      (context.lastTopic === 'hours' && (hasOpenWord || hasCloseWord || hasHoursWord || normalizedStr === 'what time' || normalizedStr === 'when' || normalizedStr === 'time'))
    );

    if (isShopHoursQuery) {
      // Specific opening time only
      const isSpecificOpeningOnly = (
        hasOpenWord && !hasCloseWord && !tokens.includes('hours') &&
        (tokens.includes('open') || normalizedStr.includes('open time') || normalizedStr.includes('opening time') || normalizedStr.includes('start')) &&
        (tokens.includes('what') || tokens.includes('when') || tokens.includes('time') || tokens.includes('does'))
      );

      // Specific closing time only
      const isSpecificClosingOnly = (
        hasCloseWord && !hasOpenWord && !tokens.includes('hours') &&
        (tokens.includes('close') || normalizedStr.includes('close time') || normalizedStr.includes('closing time') || tokens.includes('until')) &&
        (tokens.includes('what') || tokens.includes('when') || tokens.includes('time') || tokens.includes('does'))
      );

      if (isSpecificOpeningOnly) {
        return {
          text: `Nhatty Barber House opens at **${shopOpenTime}** (${scheduleDescriptor}operating until ${shopCloseTime}).`,
          actions: []
        };
      }

      if (isSpecificClosingOnly) {
        return {
          text: `Nhatty Barber House is open until **${shopCloseTime}** (${scheduleDescriptor}from ${shopOpenTime}).`,
          actions: []
        };
      }

      return {
        text: `Nhatty Barber House is open ${scheduleDescriptor}from **${shopOpenTime} to ${shopCloseTime}**.`,
        actions: []
      };
    }
  }

  // 4. Appointment Duration
  if (matchPhraseOrWord(parsed, ['how long', 'duration', 'how long is', 'how long does it take', 'how long haircut'])) {
    return {
      text: `Each appointment at Nhatty Barber House is scheduled for exactly ${SERVICE_DURATION_MINUTES} minutes for dedicated, zero-rush grooming.`,
      actions: []
    };
  }

  // ── I. CUSTOMER CANCELLATION & REFUND HISTORY / POLICY ──────────────────
  if (
    matchPhraseOrWord(parsed, [
      'what happened to my cancelled booking', 'what happened to my cancelled appointment',
      'which appointment did i cancel', 'which booking did i cancel', 'i cancelled my appointment',
      'i cancelled', 'is my refund done', 'is my refund done?', 'refund status', 'status of refund',
      'where is my refund', 'refund done'
    ]) || (tokens.includes('refund') && (tokens.includes('done') || tokens.includes('status') || tokens.includes('my') || tokens.includes('is')))
  ) {
    if (cancelledAppointments.length > 0) {
      const lastCancelled = cancelledAppointments[0];
      const _relC = getDateRelationship(lastCancelled);
      const refStr = lastCancelled.ref || lastCancelled.bookingReference || 'your booking';
      const refStatus = lastCancelled.refundStatus || 'Pending';
      return {
        text: `Your reservation (**${refStr}**) for **${lastCancelled.serviceName}** with **${lastCancelled.barberName}** was scheduled for **${_relC.formattedRelativeDate}**, but was cancelled. Your slot was released and your refund is marked **${refStatus}**. For refund processing, please contact 0975 357 881 or visit Lucy Hotel Ground Floor.`,
        actions: [
          { label: '📞 Call 0975 357 881', type: 'call', phone: MOCK_SHOP_INFO.contact.phone }
        ]
      };
    }
    return {
      text: "Yes. If you cancel, your slot is released and your refund is marked pending. For refund processing, please contact 0975 357 881 or visit us at Lucy Hotel Ground Floor, Dessie.",
      actions: [
        { label: '📞 Call 0975 357 881', type: 'call', phone: MOCK_SHOP_INFO.contact.phone }
      ]
    };
  }

  if (
    matchPhraseOrWord(parsed, [
      'why dont i get the full refund', 'why dont i get full refund', 'why not full refund',
      'why not 100 refund', 'why only 75', 'why only 75 percent', 'why 75 percent',
      'why is there a fee', 'why 25 percent fee', 'why the fee', 'why 25 fee',
      'cancellation fee reason', 'service change fee reason', 'why deduction',
      'why did you deduct', 'why deduct'
    ]) ||
    ((tokens.includes('why') || tokens.includes('reason')) && (tokens.includes('full') || tokens.includes('75') || tokens.includes('25') || tokens.includes('fee') || tokens.includes('deduct') || tokens.includes('deduction')) && (tokens.includes('refund') || tokens.includes('cancel') || tokens.includes('money')))
  ) {
    return {
      text: "Under Nhatty Barber House policy, cancellations and service downgrades receive a 75% refund. The remaining 25% is retained as a reservation service fee to cover reserved master barber chair time that was held exclusively for you.",
      actions: [
        { label: '🎫 View My Appointment', type: 'navigate', path: '/my-appointment' }
      ]
    };
  }

  if (
    matchPhraseOrWord(parsed, [
      'how much will i get refunded', 'how much refund will i get', 'how much do i get refunded',
      'how much refund', 'what is my refund', 'what will i get back', 'how much do i get back',
      'how much money back', 'how much will i get back', 'what is the refund amount'
    ]) ||
    ((tokens.includes('how') || tokens.includes('what')) && (tokens.includes('refund') || tokens.includes('back')) && (tokens.includes('much') || tokens.includes('get') || tokens.includes('i')))
  ) {
    if (activeAppointment) {
      const isVerified = activeAppointment.paymentStatus === 'Verified';
      const paid = activeAppointment.paidAmount !== undefined ? Number(activeAppointment.paidAmount) : (isVerified ? (activeAppointment.price || 0) : 0);
      if (paid > 0) {
        const refundAmt = Math.round(paid * 0.75);
        const fee = Math.round(paid * 0.25);
        return {
          text: `If you cancel your appointment, you will receive a **75% refund of ${refundAmt} ETB** (25% fee of ${fee} ETB is retained for reserved master barber chair time).`,
          actions: [
            { label: '🎫 View My Appointment', type: 'navigate', path: '/my-appointment' }
          ]
        };
      }
    }
    return {
      text: "Under Nhatty Barber House policy, verified bookings receive a **75% refund** upon cancellation (25% cancellation fee is retained for reserved master barber chair time).",
      actions: [
        { label: '🎫 View My Appointment', type: 'navigate', path: '/my-appointment' }
      ]
    };
  }

  if (
    matchPhraseOrWord(parsed, [
      'cancel', 'refund', 'money back', 'cancellation', 'cancelled', 'refunds',
      'how to cancel', 'can i get refund', 'what happens if i cancel',
      'what happens to my money', 'what happens with my money', 'my money', 'i want cancel',
      'what happen if i cancel', 'how do i get my money', 'can i cancel', 'how get my money'
    ]) ||
    (context.lastTopic === 'appointment' && (normalizedStr === 'can i cancel' || normalizedStr === 'cancel' || normalizedStr === 'refund' || normalizedStr === 'what about refund' || normalizedStr === 'what happens to my money'))
  ) {
    return {
      text: "Yes. If you cancel within policy, your slot is released and you receive a **75% refund** directly to your Telebirr or CBE account (with a 25% fee retained for reserved master barber time). For questions, call 0975 357 881.",
      actions: [
        { label: '📞 Call 0975 357 881', type: 'call', phone: MOCK_SHOP_INFO.contact.phone }
      ]
    };
  }

  // ── J. CUSTOMER BOOKING HISTORY & PREVIOUS APPOINTMENTS ─────────────────
  // 1. History overview: "show my booking history", "my booking history", "booking history"
  if (matchPhraseOrWord(parsed, ['show my booking history', 'show booking history', 'my booking history', 'booking history', 'view my history', 'history of bookings'])) {
    if (allRecords.length === 0) {
      return {
        text: "You don't have any booking history recorded yet. You can choose a service and book an appointment with any of our 8 master barbers!",
        actions: [
          { label: '📅 Book an Appointment', type: 'navigate', path: '/booking' }
        ]
      };
    }
    const historyBullets = allRecords.map(r => {
      const _relH = getDateRelationship(r);
      return `• **${r.serviceName}** with ${r.barberName} on ${_relH.formattedRelativeDate} (${r.status || 'Confirmed'})`;
    }).join('\n');
    return {
      text: `Here is your booking history at Nhatty Barber House:\n\n${historyBullets}`,
      actions: [
        { label: '🎫 View Current Appointment', type: 'navigate', path: '/my-appointment' }
      ]
    };
  }

  // 2. Count of bookings: "how many times have i booked?", "how many bookings do i have?"
  if (matchPhraseOrWord(parsed, [
    'how many times have i booked', 'how many times did i book', 'how many times i booked',
    'how many bookings do i have', 'how many bookings i have', 'my total bookings',
    'how many times have i come', 'how many times have i visited', 'how many times i visited',
    'how many visits', 'visit count', 'how many times have i been', 'how many times i been',
    'how many appointments have i had', 'how many times have i used nhatty'
  ])) {
    if (totalBookingsCount === 0) {
      return {
        text: "You haven't made any bookings with Nhatty Barber House yet. Would you like to make your first appointment?",
        actions: [{ label: '📅 Book an Appointment', type: 'navigate', path: '/booking' }]
      };
    }
    return {
      text: `You have booked **${totalBookingsCount}** time(s) with Nhatty Barber House.`,
      actions: [{ label: '🎫 View My Appointment', type: 'navigate', path: '/my-appointment' }]
    };
  }

  // 3. Did I ever book with [Barber]?
  if (matchPhraseOrWord(parsed, ['did i ever book with', 'have i ever booked with', 'did i book with', 'have i booked with', 'did i ever use'])) {
    const queriedBarber = extractBarberEntity(parsed);
    if (queriedBarber) {
      const match = allRecords.find(r => r.barberId === queriedBarber.id || r.barberName?.toLowerCase().includes(queriedBarber.name.toLowerCase()));
      if (match) {
        return {
          text: `Yes, you previously booked **${match.serviceName}** with **${queriedBarber.name}**.`,
          actions: []
        };
      }
      return {
        text: `No, you haven't booked with **${queriedBarber.name}** yet. You can book an appointment with him anytime!`,
        actions: [
          { label: `📅 Book with ${queriedBarber.name}`, type: 'navigate', path: `/booking?barber=${queriedBarber.id}` }
        ]
      };
    }
  }

  // 4. What services have I used before?
  if (matchPhraseOrWord(parsed, ['what services have i used before', 'what services did i use before', 'what services have i used', 'services i used before', 'services i booked before', 'what haircuts have i had'])) {
    if (allRecords.length > 0) {
      const usedServices = [...new Set(allRecords.map(r => r.serviceName))];
      return {
        text: `You have previously used: **${usedServices.join(', ')}**.`,
        actions: []
      };
    }
    return {
      text: "You haven't used any services yet. We offer 6 master grooming services starting from 300 ETB.",
      actions: [
        { label: '💈 View Services', type: 'navigate', path: '/booking' }
      ]
    };
  }

  // 5. What did I pay last time? / How much was my last appointment?
  if (matchPhraseOrWord(parsed, [
    'what did i pay last time', 'how much was my last appointment', 'how much was my previous appointment',
    'how much did i pay last time', 'what did i pay for last appointment', 'my previous payment',
    'how much was last haircut'
  ])) {
    if (previousAppointment) {
      const _relP = getDateRelationship(previousAppointment);
      return {
        text: `Your previous appointment (${_relP.formattedRelativeDate}) was **${previousAppointment.price || previousAppointment.amountPaid} ETB** (${previousAppointment.serviceName}).`,
        actions: []
      };
    }
    return {
      text: "You don't have any previous payment history recorded yet.",
      actions: []
    };
  }

  // 6. What was my previous haircut / what was my last haircut?
  if (matchPhraseOrWord(parsed, [
    'what was my previous haircut', 'what was my last haircut', 'my previous haircut',
    'my last haircut', 'what haircut did i get last time', 'what haircut did i get before',
    'what haircut was last time', 'previous haircut'
  ])) {
    if (previousAppointment) {
      return {
        text: `Your last haircut was **${previousAppointment.serviceName}** with **${previousAppointment.barberName}**.`,
        actions: []
      };
    }
    return {
      text: "You don't have any previous haircut history recorded yet.",
      actions: [
        { label: '📅 Choose a Service', type: 'navigate', path: '/booking' }
      ]
    };
  }

  // 7. What barber did I use last time / who was my barber last time?
  if (matchPhraseOrWord(parsed, [
    'what barber did i use last time', 'who was my barber last time', 'who was my previous barber',
    'which barber did i use last time', 'my last barber', 'my previous barber',
    'who cut my hair last time', 'what barber did i book before'
  ])) {
    if (previousAppointment) {
      return {
        text: `You used **${previousAppointment.barberName}** for your previous appointment.`,
        actions: []
      };
    }
    return {
      text: "You don't have any previous barber bookings recorded yet.",
      actions: [
        { label: '📅 Our Barbers', type: 'navigate', path: '/booking' }
      ]
    };
  }

  // 8. General previous / last appointment + visit count
  if (matchPhraseOrWord(parsed, [
    'what did i book before', 'what did i book last time', 'what did i book last month',
    'what service did i get last time', 'what service did i get before', 'what was my last appointment',
    'my last appointment', 'my previous appointment', 'what did i have last time',
    'what was my last booking', 'previous booking', 'last booking', 'what did i get before',
    'service did i get before', 'last service', 'previous service', 'what service last time',
    'my previous haircut', 'last haircut', 'what haircut last time', 'what barber last time',
    'who cut my hair last time', 'my last service', 'show my history',
    'how many times have i visited', 'how many times i visited', 'how many times i came',
    'how many visits', 'how many times have i come', 'visit count', 'how many times i been here',
    'my booking history', 'booking history', 'show my booking history', 'view my history', 'history'
  ]) || ((tokens.includes('before') || tokens.includes('last') || tokens.includes('previous')) && (tokens.includes('book') || tokens.includes('service') || tokens.includes('appointment') || tokens.includes('haircut') || tokens.includes('get') || tokens.includes('had') || tokens.includes('got')) && (tokens.includes('i') || tokens.includes('my')))) {
    if (previousAppointment) {
      const _relP = getDateRelationship(previousAppointment);
      return {
        text: `Your previous appointment was for **${previousAppointment.serviceName}** with **${previousAppointment.barberName}** on **${_relP.formattedRelativeDate}** (${previousAppointment.price || previousAppointment.amountPaid} ETB).`,
        actions: []
      };
    }
    return {
      text: "You don't have any previous booking history recorded yet. I can help you choose a service to make your first booking!",
      actions: [
        { label: '📅 Choose a Service', type: 'navigate', path: '/booking' }
      ]
    };
  }

  // ── K. CURRENT ACTIVE APPOINTMENT INQUIRIES ─────────────────────────────

  const isChangeOrBalance = tokens.includes('change') || tokens.includes('changed') || tokens.includes('original') || tokens.includes('owe') || tokens.includes('owing') || tokens.includes('balance') || tokens.includes('additional') || tokens.includes('credit');

  // 1. What service did I choose / what did I book?
  const isMyCurrentServiceQuery = !isChangeOrBalance && ((
    matchPhraseOrWord(parsed, [
      'what service did i choose', 'what service i choose', 'what service i chose',
      'what service i chosse', 'what service i choosed', 'wat servce i chose',
      'what servce i choosed', 'what service did i book', 'what did i book',
      'what did i choose', 'what did i pick', 'what did i select',
      'what haircut did i choose', 'what haircut i choose', 'what service i book',
      'which service did i choose', 'which service i choose', 'which servce i choose',
      'which servce i bok', 'wat did i book', 'what i book', 'what i choose',
      'which one did i choose', 'which one i choose', 'my service', 'my service?',
      'my servce', 'my servce?', 'what is my service', 'whats my service',
      'what haircut i select', 'what service did i select',
      'what service i chosse', 'wat servce i choose', 'what servise i choose',
      'what serivce i chose', 'wat service i chose', 'what service i choosed',
      'servce i chose', 'service i chose', 'service i choose', 'haircut i chose'
    ]) ||
    (tokens.includes('service') && (tokens.includes('i') || tokens.includes('my')) && (tokens.includes('choose') || tokens.includes('book') || tokens.includes('get') || tokens.includes('have'))) ||
    (tokens.length <= 2 && tokens.includes('my') && (tokens.includes('service') || tokens.includes('haircut'))) ||
    (context.lastTopic === 'appointment' && (normalizedStr === 'what service' || normalizedStr === 'which service' || normalizedStr === 'service' || normalizedStr === 'my service' || normalizedStr === 'which one' || normalizedStr === 'what haircut'))
  ));

  if (isMyCurrentServiceQuery) {
    if (activeAppointment) {
      return {
        text: `You chose **${activeAppointment.serviceName}** for your appointment.`,
        actions: [
          { label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }
        ]
      };
    }
    return {
      text: "You don't currently have an appointment. I can help you choose a service and book one.",
      actions: [
        { label: '📅 Choose a Service', type: 'navigate', path: '/booking' }
      ]
    };
  }

  // 2. Which barber did I choose / who is my barber?
  const isMyCurrentBarberQuery = (
    matchPhraseOrWord(parsed, [
      'which barber did i choose', 'which barber i choose', 'which barber i chose',
      'which barber i chosse', 'which barber i choosed', 'who is my barber',
      'who is my barber?', 'who my barber', 'who my barber?', 'who is cutting my hair',
      'who cuts my hair', 'who cut my hair', 'who will cut my hair',
      'which barber am i booked with', 'my barber', 'my barber?', 'and the barber',
      'and the barber?', 'and my barber', 'what about my barber', 'who did i choose',
      'who did i pick'
    ]) ||
    (tokens.includes('barber') && (tokens.includes('my') || tokens.includes('i')) && (tokens.includes('choose') || tokens.includes('book') || tokens.includes('who') || tokens.includes('which'))) ||
    (context.lastTopic === 'appointment' && (normalizedStr === 'and the barber' || normalizedStr === 'and barber' || normalizedStr === 'who' || normalizedStr === 'who is he' || normalizedStr === 'barber' || normalizedStr === 'what about barber'))
  );

  if (isMyCurrentBarberQuery) {
    const targetBarberAppt = activeAppointment || previousAppointment;
    if (targetBarberAppt) {
      const _relB = getDateRelationship(targetBarberAppt);
      if (_relB.isPast) {
        return {
          text: `Your barber was **${targetBarberAppt.barberName}** for your appointment (${_relB.formattedRelativeDate}).`,
          actions: [
            { label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }
          ]
        };
      }
      return {
        text: `Your barber is **${targetBarberAppt.barberName}** for your appointment on **${_relB.formattedRelativeDate}** at **${_relB.timeDisplay}**.`,
        actions: [
          { label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }
        ]
      };
    }
    return {
      text: "You don't currently have an appointment booked with a barber. You can choose any of our 8 master barbers when you book.",
      actions: [
        { label: '📅 Book an Appointment', type: 'navigate', path: '/booking' }
      ]
    };
  }

  // 3. What time is my appointment / when is my appointment?
  const isMyCurrentTimeQuery = (
    matchPhraseOrWord(parsed, [
      'what time is my appointment', 'what time is my booking', 'what time my appointment',
      'what time my booking', 'what time my bok', 'what time is my haircut',
      'when is my appointment', 'when is my booking', 'when is my haircut',
      'when my appointment', 'what time am i booked', 'my appointment time',
      'what date is my appointment', 'when am i booked', 'when do i come',
      'when is my session'
    ]) ||
    (context.lastTopic === 'appointment' && (normalizedStr === 'what time' || normalizedStr === 'when' || normalizedStr === 'tomorrow' || normalizedStr === 'today' || normalizedStr === 'time'))
  );

  if (isMyCurrentTimeQuery) {
    const targetTimeAppt = activeAppointment || previousAppointment;
    if (targetTimeAppt) {
      const _relT = getDateRelationship(targetTimeAppt);
      if (_relT.isInProgress) {
        return {
          text: `Your appointment for **${targetTimeAppt.serviceName}** with **${targetTimeAppt.barberName}** is **currently in progress** (${_relT.timeDisplay}) 💈.`,
          actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
        };
      }
      if (_relT.isToday) {
        if (_relT.timeRelation === 'BEFORE') {
          return {
            text: `Your appointment is scheduled for **today, ${_relT.monthName} ${_relT.dayNum}, ${_relT.yearNum}** at **${_relT.startTime}** (${_relT.timeDisplay}) with **${targetTimeAppt.barberName}**.`,
            actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
          };
        }
        return {
          text: `Your appointment was scheduled for **today, ${_relT.monthName} ${_relT.dayNum}, ${_relT.yearNum}** from **${_relT.timeDisplay}** with **${targetTimeAppt.barberName}** and is currently awaiting completion.`,
          actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
        };
      }
      if (_relT.isTomorrow) {
        return {
          text: `Your appointment is scheduled for **tomorrow, ${_relT.monthName} ${_relT.dayNum}, ${_relT.yearNum}** at **${_relT.startTime}** (${_relT.timeDisplay}) with **${targetTimeAppt.barberName}**.`,
          actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
        };
      }
      if (_relT.isYesterday) {
        return {
          text: `Your appointment was scheduled for **yesterday, ${_relT.monthName} ${_relT.dayNum}, ${_relT.yearNum}**, from **${_relT.timeDisplay}** with **${targetTimeAppt.barberName}**.`,
          actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
        };
      }
      if (_relT.diffDays > 1) {
        return {
          text: `Your appointment is scheduled for **${_relT.dayName}, ${_relT.monthName} ${_relT.dayNum}, ${_relT.yearNum}** at **${_relT.startTime}** (${_relT.timeDisplay}) with **${targetTimeAppt.barberName}**.`,
          actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
        };
      }
      return {
        text: `Your appointment was on **${_relT.dayName}, ${_relT.monthName} ${_relT.dayNum}, ${_relT.yearNum}** from **${_relT.timeDisplay}** with **${targetTimeAppt.barberName}**.`,
        actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
      };
    }
    return {
      text: "You don't currently have an appointment scheduled. We are open daily from 8:00 AM to 8:00 PM.",
      actions: [
        { label: '📅 Book an Appointment', type: 'navigate', path: '/booking' }
      ]
    };
  }

  // 4. How much did I pay / how much have I paid / how much is my booking?
  const isMyCurrentPriceQuery = (
    matchPhraseOrWord(parsed, [
      'how much did i pay', 'how much have i paid', 'how much i have paid', 'how much i paid',
      'how much paid', 'what have i paid', 'how much have i paid so far',
      'how much is my booking', 'how much is my appointment',
      'how much i pay', 'what did i pay', 'how much do i pay', 'how much for my booking',
      'how much for my appointment', 'how much was my service', 'how much is my service',
      'how much did that cost', 'how much was that', 'how much is it'
    ]) ||
    (
      (tokens.includes('how') && (tokens.includes('much') || tokens.includes('mch'))) ||
      normalizedStr === 'how much' || normalizedStr === 'price' || normalizedStr === 'cost' || normalizedStr === 'waga' || normalizedStr === 'sint'
    ) && (
      tokens.includes('my') || tokens.includes('i') ||
      context.lastTopic === 'appointment' || context.lastTopic === 'service' || context.lastTopic === 'booking' ||
      Boolean(activeAppointment)
    ) && !matchPhraseOrWord(parsed, ['services', 'all services', 'all service', 'cheapest', 'haircut options', 'beard options', 'how many', 'barber', 'barbers'])
  );

  // 4. How much did I pay / How much is my appointment / Balance due / Service changes
  const isMyBalanceOrChangeQuery = (
    matchPhraseOrWord(parsed, [
      'how much do i owe', 'how much do i still owe', 'do i owe anything', 'what do i owe',
      'how much is remaining', 'remaining payment', 'additional payment', 'do i have to pay more',
      'did i change my service', 'did i change service', 'what was my original service', 'original service',
      'new service', 'what is my new service', 'current price', 'what is my current price',
      'what is my new price', 'what is the new price', 'my new price', 'new price', 'new appointment price'
    ]) ||
    ((tokens.includes('owe') || tokens.includes('owing') || tokens.includes('balance') || tokens.includes('change') || tokens.includes('original') || (tokens.includes('new') && (tokens.includes('price') || tokens.includes('service')))) && (tokens.includes('my') || tokens.includes('i') || Boolean(activeAppointment)))
  );

  if (isMyBalanceOrChangeQuery && activeAppointment) {
    const sName = activeAppointment.serviceName || 'Grooming Service';
    const price = activeAppointment.price || 0;
    const isVerified = activeAppointment.paymentStatus === 'Verified';
    const paidAmount = activeAppointment.paidAmount !== undefined ? Number(activeAppointment.paidAmount) : (isVerified ? price : 0);
    const remainingAmount = activeAppointment.remainingAmount !== undefined ? Number(activeAppointment.remainingAmount) : (isVerified ? 0 : price);

    if (normalizedStr.includes('original')) {
      const origName = activeAppointment.originalServiceName || sName;
      const origPrice = activeAppointment.originalPrice !== undefined ? activeAppointment.originalPrice : price;
      const text = (origName !== sName)
        ? `Your original service was **${origName}** (${origPrice} ETB). You updated it to **${sName}** (${price} ETB).`
        : `Your original service is **${sName}** (${price} ETB).`;
      return {
        text,
        actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
      };
    }

    if (normalizedStr.includes('change')) {
      const hasChanged = Boolean(activeAppointment.originalServiceName && activeAppointment.originalServiceName !== sName) || (activeAppointment.adjustmentType && activeAppointment.adjustmentType !== 'none');
      if (hasChanged) {
        let details = '';
        if (activeAppointment.adjustmentType === 'additional_payment') {
          details = ` An additional payment of **${remainingAmount} ETB** is required.`;
        } else if (activeAppointment.adjustmentType === 'refund_or_credit') {
          details = ` You have a credit/refund of **${activeAppointment.adjustmentAmount} ETB** due.`;
        }
        return {
          text: `Yes — your service was changed from **${activeAppointment.originalServiceName || 'original'}** (${activeAppointment.originalPrice} ETB) to **${sName}** (${price} ETB).${details}`,
          actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
        };
      } else {
        return {
          text: `You haven't changed your service. You are scheduled for **${sName}** (${price} ETB).`,
          actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
        };
      }
    }

    if (normalizedStr.includes('new') || normalizedStr.includes('current price')) {
      const origName = activeAppointment.originalServiceName || sName;
      const origPrice = activeAppointment.originalPrice !== undefined ? activeAppointment.originalPrice : price;
      let changeNote = '';
      if (origName !== sName) {
        changeNote = ` (changed from **${origName}** at ${origPrice} ETB)`;
      }
      let balanceNote = '';
      if (activeAppointment.adjustmentType === 'additional_payment' && remainingAmount > 0) {
        balanceNote = ` You previously paid **${paidAmount} ETB**, and an additional payment of **${remainingAmount} ETB** is required.`;
      } else if (activeAppointment.adjustmentType === 'refund_or_credit' && activeAppointment.adjustmentAmount > 0) {
        balanceNote = ` You previously paid **${paidAmount} ETB**, and have a credit/refund of **${activeAppointment.adjustmentAmount} ETB** due.`;
      }
      return {
        text: `Your new service is **${sName}** at **${price} ETB**${changeNote}.${balanceNote}`,
        actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
      };
    }

    if (normalizedStr.includes('owe') || normalizedStr.includes('balance') || normalizedStr.includes('additional') || normalizedStr.includes('pay more') || normalizedStr.includes('remaining')) {
      if (activeAppointment.adjustmentType === 'additional_payment' && remainingAmount > 0) {
        return {
          text: `You have an additional payment of **${remainingAmount} ETB** due for **${sName}** (New total: ${price} ETB, already paid: ${paidAmount} ETB).`,
          actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
        };
      } else if (activeAppointment.adjustmentType === 'refund_or_credit') {
        return {
          text: `You don't owe anything! You have a **credit/refund of ${activeAppointment.adjustmentAmount} ETB** due from your service change to **${sName}** (${price} ETB).`,
          actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
        };
      } else if (isVerified) {
        return {
          text: `You don't owe anything! Your payment of **${price} ETB** for **${sName}** is fully verified.`,
          actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
        };
      } else {
        return {
          text: `Your total for **${sName}** is **${price} ETB** (Payment status: ${activeAppointment.paymentStatus}).`,
          actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
        };
      }
    }
  }

  if (isMyCurrentPriceQuery) {
    if (activeAppointment) {
      const price = activeAppointment.price || activeAppointment.amountPaid || 400;
      const isVerified = activeAppointment.paymentStatus === 'Verified';
      const paid = activeAppointment.paidAmount !== undefined ? Number(activeAppointment.paidAmount) : (isVerified ? price : 0);
      const remaining = activeAppointment.remainingAmount !== undefined ? Number(activeAppointment.remainingAmount) : (isVerified ? 0 : price);

      if (activeAppointment.adjustmentType === 'additional_payment' && remaining > 0) {
        return {
          text: `Your current service is **${activeAppointment.serviceName}** (${price} ETB). You have paid **${paid} ETB** so far; an additional payment of **${remaining} ETB** is required.`,
          actions: [
            { label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }
          ]
        };
      } else if (activeAppointment.adjustmentType === 'refund_or_credit') {
        return {
          text: `Your current service is **${activeAppointment.serviceName}** (${price} ETB). You paid **${paid} ETB**, so you have a **credit/refund of ${activeAppointment.adjustmentAmount} ETB** due.`,
          actions: [
            { label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }
          ]
        };
      }
      return {
        text: `Your service is **${price} ETB** (${activeAppointment.serviceName}). You have paid **${paid} ETB** (Payment status: ${activeAppointment.paymentStatus}).`,
        actions: [
          { label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }
        ]
      };
    }
  }

  // 5. Is my payment verified / is it verified?
  const isMyPaymentVerificationQuery = (
    matchPhraseOrWord(parsed, [
      'is my payment verified', 'is my payment verified?', 'did they verify my payment',
      'did you verify my payment', 'did u verify my payment', 'is payment verified',
      'is it verified', 'is it verified?', 'verified', 'verified?', 'is it paid',
      'is it paid?', 'is my booking confirmed', 'did i pay', 'did i pay?',
      'payment pending', 'payment verified', 'why is my payment pending', 'my payment status',
      'my paymnt verified', 'did payment go through', 'was my payment verified',
      'was it paid', 'has my payment been verified', 'payment status', 'payment status?',
      'was payment verified', 'was payment successful', 'was my paymnt verified',
      'did i payed', 'is payment done', 'payment done', 'receipt status'
    ]) ||
    (context.lastTopic === 'appointment' && (normalizedStr === 'is it verified' || normalizedStr === 'verified' || normalizedStr === 'is it paid' || normalizedStr === 'paid' || normalizedStr === 'payment'))
  );

  if (isMyPaymentVerificationQuery) {
    if (activeAppointment) {
      if (activeAppointment.paymentStatus === 'Verified') {
        return {
          text: "Yes — your payment has been verified.",
          actions: [
            { label: '🎫 View Appointment Pass', type: 'navigate', path: '/my-appointment' }
          ]
        };
      }
      return {
        text: "Your payment is currently **Verification Pending**. Our front desk team will review and verify your receipt shortly.",
        actions: [
          { label: '🎫 View Appointment Pass', type: 'navigate', path: '/my-appointment' }
        ]
      };
    }
  }

  // 6. What is my booking number / ticket?
  const isMyTicketQuery = (
    matchPhraseOrWord(parsed, [
      'what is my booking number', 'whats my booking number', 'what is my ticket',
      'whats my ticket', 'what is my reference', 'whats my reference', 'what is my ref',
      'whats my ref', 'my ticket', 'my ref', 'my reference number', 'my booking number'
    ]) ||
    (tokens.includes('ticket') && tokens.includes('my')) ||
    (tokens.includes('ref') && tokens.includes('my'))
  );

  if (isMyTicketQuery) {
    if (activeAppointment) {
      const ref = activeAppointment.ref || activeAppointment.bookingReference || 'NHB-XXXXX';
      return {
        text: `Your booking reference number is **${ref}**.`,
        actions: [
          { label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }
        ]
      };
    }
    return {
      text: "You don't currently have an active booking ticket. You can book an appointment to receive your digital pass.",
      actions: [
        { label: '📅 Book an Appointment', type: 'navigate', path: '/booking' }
      ]
    };
  }

  // 7. General "my appointment" edge-case fallback (main handler is F1 above)
  if (
    matchPhraseOrWord(parsed, [
      'my appointment', 'my appointment?', 'my booking', 'my reservation', 'my ticket',
      'check my appointment', 'show my appointment', 'whats my appointment',
      'what is my appointment', 'what is my booking', 'my booking where'
    ]) ||
    (tokens.length <= 2 && matchPhraseOrWord(parsed, ['appointment', 'ticket', 'booking']) && (tokens.includes('my') || tokens.includes('check') || tokens.includes('status')))
  ) {
    const targetAppt = activeAppointment || previousAppointment;
    if (!targetAppt) {
      return {
        text: "You don't currently have an appointment. I can help you choose a service and book one.",
        actions: [
          { label: '📅 Book an Appointment', type: 'navigate', path: '/booking' }
        ]
      };
    }
    return {
      text: formatAppointmentDescription(targetAppt),
      actions: [
        { label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }
      ]
    };
  }

  // ── L. SPECIFIC SINGLE SERVICE INQUIRY ("how much is haircut?", "price for beard", "vip?", "face treatment?") ──
  const specificService = extractServiceEntity(parsed);
  if (specificService) {
    return {
      text: `**${specificService.name}** is **${specificService.price} ETB** (${specificService.tagline || '60-minute session'}).`,
      actions: [
        { label: `📅 Book ${specificService.name}`, type: 'navigate', path: `/booking?service=${specificService.id}` }
      ]
    };
  }

  // ── M. BRAND VALUE, HYGIENE, REFERENCE PHOTOS & WALK-INS ───────────────
  if (
    matchPhraseOrWord(parsed, [
      'what makes nhatty different', 'what makes nhatty special', 'what makes you different',
      'what makes u different', 'wat makes u different', 'wat makes you different',
      'why should i come to nhatty', 'why should i come', 'why nhatty barber',
      'why nhatty', 'why choose nhatty', 'why come here', 'special'
    ])
  ) {
    return {
      text: "Nhatty Barber House offers a premium, appointment-based grooming experience with 8 Wahl-certified master barbers (5+ years of experience), dedicated 60-minute sessions, transparent pricing, and a VIP atmosphere at Lucy Hotel with zero waiting time.",
      actions: [
        { label: '📅 Start Booking', type: 'navigate', path: '/booking' }
      ]
    };
  }

  if (
    matchPhraseOrWord(parsed, [
      'sterilized', 'sterilize', 'sterilization', 'hygiene', 'hygienic', 'sanitized',
      'sanitize', 'sanitization', 'clean tools', 'are clippers clean', 'are clippers sterilized',
      'single use blades', 'new blades', 'disposable blades', 'razor blades clean',
      'barbicide', 'uv sterilization', 'is it clean', 'safe and clean', 'clean'
    ]) &&
    (tokens.includes('sterilize') || tokens.includes('sterilized') || tokens.includes('hygiene') || tokens.includes('sanitize') || tokens.includes('sanitized') || tokens.includes('blades') || tokens.includes('clean') || tokens.includes('tools'))
  ) {
    return {
      text: "We follow strict hygiene standards at Nhatty Barber House. All clippers and shears are sanitized with hospital-grade barbicide and UV sterilization, fresh single-use straight razor blades are used for every client, and hot towels are freshly prepared.",
      actions: []
    };
  }

  if (
    matchPhraseOrWord(parsed, [
      'reference photo', 'reference picture', 'show a photo', 'show a picture',
      'bring a photo', 'bring a picture', 'can i show a photo', 'can i show photo',
      'can i bring photo', 'show photo to barber', 'show picture to barber',
      'haircut from photo', 'style from photo', 'hair photo'
    ]) || (tokens.includes('photo') && (tokens.includes('show') || tokens.includes('bring') || tokens.includes('reference') || tokens.includes('barber') || tokens.includes('style') || tokens.includes('cut')))
  ) {
    return {
      text: "Yes, absolutely! All 8 of our Wahl-certified master barbers have 5+ years of experience and can tailor any modern fade, classic taper, textured cut, or beard line directly from your reference photo.",
      actions: [
        { label: '📅 Book an Appointment', type: 'navigate', path: '/booking' }
      ]
    };
  }

  if (
    matchPhraseOrWord(parsed, [
      'walk in', 'walk ins', 'walkin', 'walkins', 'can i walk in', 'can i just walk in',
      'do you accept walk ins', 'do you take walk ins', 'do u take walk in', 'do u accept walk in',
      'can i come without appointment', 'can i come without booking', 'without booking',
      'without appointment', 'do i have to book', 'do i need appointment', 'do i need to book',
      'is booking required', 'is appointment required', 'can i just show up'
    ])
  ) {
    return {
      text: "Nhatty Barber House operates on an appointment-first model to guarantee zero waiting time. We recommend booking online in advance, or checking with our front desk at Lucy Hotel if a walk-in opening is available.",
      actions: [
        { label: '📅 Book an Appointment', type: 'navigate', path: '/booking' }
      ]
    };
  }

  // ── N. PAYMENT METHODS & CASH ──────────────────────────────────────────
  if (matchPhraseOrWord(parsed, ['telebirr', 'cbe', 'payment method', 'how to pay', 'payment', 'bank transfer', 'pay', 'receipt', 'paymnt'])) {
    return {
      text: "We accept CBE Bank Transfer and Telebirr Mobile Pay. Simply make the transfer and upload a screenshot of your confirmation receipt during booking.",
      actions: []
    };
  }

  // ── O. GENERAL BOOKING FLOW & HOW TO BOOK ──────────────────────────────
  if (
    matchPhraseOrWord(parsed, [
      'book', 'booking', 'reserve', 'reservation', 'how to book', 'book me',
      'i want to book', 'i wanna book', 'can i book', 'i want cut', 'can i get haircut',
      'make appointment', 'how do i book', 'bok now', 'bok', 'how book',
      'qetero', 'qetero yazelgn', 'ketero', 'yazelgn', 'how to make appointment'
    ])
  ) {
    return {
      text: "Choose your service, select a barber, pick a date and time, then enter your details and confirm your booking.",
      actions: [
        { label: '📅 Start Booking', type: 'navigate', path: '/booking' }
      ]
    };
  }

  // ── P. CONTACT INFORMATION ─────────────────────────────────────────────
  if (matchPhraseOrWord(parsed, ['phone', 'contact', 'call', 'number', 'reach', 'telephone', 'how do i contact you'])) {
    return {
      text: `You can reach Nhatty Barber House at **0975 357 881** or visit us on the Ground Floor of Lucy Hotel in Dessie.`,
      actions: [
        { label: '📞 Call 0975 357 881', type: 'call', phone: MOCK_SHOP_INFO.contact.phone }
      ]
    };
  }

  // ── Q. SMART RECEPTIONIST FALLBACK ─────────────────────────────────────
  // Instead of asking the customer to clarify, try to provide a helpful contextual response
  if (activeAppointment) {
    return {
      text: `${formatAppointmentDescription(activeAppointment)} I can also help you with services, barbers, location, or payment questions.`,
      actions: [{ label: '🎫 View Pass', type: 'navigate', path: '/my-appointment' }]
    };
  }

  // General smart fallback for first-time / no-appointment customers
  const serviceBulletsFb = MOCK_SERVICES.map(s => `• **${s.name}** — ${s.price} ETB`).join('\n');
  return {
    text: `Welcome to Nhatty Barber House! Here's what I can help you with:\n\n${serviceBulletsFb}\n\nI can also help with barbers, location, opening hours, payments, or your existing booking.`,
    actions: [{ label: '📅 Start Booking', type: 'navigate', path: '/booking' }]
  };
}
