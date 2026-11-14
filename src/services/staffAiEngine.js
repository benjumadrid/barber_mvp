import {
  getSystemNow,
  getAddisAbabaDateTime,
  getCurrentDateTime,
  getCurrentDate,
  getCurrentTime,
  formatDateKey,
  formatDisplayDate,
  isToday,
  isTomorrow,
  isYesterday,
  getDatePeriodRange,
  isAppointmentInPeriod,
  getDateRelationship,
  formatAppointmentRelativeDate,
  formatAppointmentDescription
} from './dateTimeUtils.js';
/**
 * Nhatty Barber House — STAFF OPERATIONS AI ENGINE 7.0 (Nhatty House Staff AI)
 * 
 * ARCHITECTURE & STRICT INTENT HIERARCHY:
 * 1. Security & Credential Guard (blocks passwords, tokens, auth credentials)
 * 2. Date-Based Schedule & Appointment Query Intent (Today, Tomorrow, Yesterday, Last 2 Days, Queue, Schedule, Bookings)
 * 3. Date + Financial / Payment / Revenue Language Intelligence (Income, Revenue, Earnings, Sales, Payments, Money Made, Daily/Weekly/Monthly/Last 2 Days)
 * 4. Daily Briefing Intent
 * 5. Barber Performance & Ranking Intent
 * 6. Service Analytics & Volume Intent
 * 7. Cancellation & Refund Intent
 * 8. Repeat & High-Value Clients Intent
 * 9. Booking Reference Lookup Intent (NHB-XXXXX)
 * 10. Phone Number Lookup Intent (09...)
 * 11. Multi-Turn Context Follow-Up (Active customer, active appointment, active time period, active metric)
 * 12. Explicit Customer Name Lookup (Strictly filters out generic stopwords, supports active vs historical)
 * 13. Professional Operations Fallback
 */

import { MOCK_BARBERS } from '../data/barbersData.js';
import { MOCK_SHOP_INFO } from '../data/shopData.js';
import { getAllAppointments, getAppointmentsByDate } from '../data/bookingStore.js';

export const MOCK_SERVICES = [
  { id: 'srv-1', name: 'Hair Cut Only', price: 400, duration: '30 min', category: 'haircut' },
  { id: 'srv-2', name: 'Hair Cut + Face Treatment', price: 500, duration: '45 min', category: 'combo' },
  { id: 'srv-3', name: 'Beard Sculpting & Trim', price: 300, duration: '25 min', category: 'beard' },
  { id: 'srv-4', name: 'Nhatty VIP Royal Grooming', price: 800, duration: '60 min', category: 'vip' },
  { id: 'srv-5', name: 'Kids Haircut (Under 12)', price: 350, duration: '25 min', category: 'kids' },
  { id: 'srv-6', name: 'Hot Towel Royal Shave', price: 350, duration: '30 min', category: 'shave' }
];

// ── 1. IN-MEMORY CONVERSATIONAL CONTEXT ─────────────────────────────────
let currentStaffContext = {
  activeCustomer: null,
  activeAppointment: null,
  activeBarber: null,
  activeTimePeriod: 'today',
  activeMetric: null,
  history: []
};

export function resetStaffAiContext() {
  currentStaffContext = {
    activeCustomer: null,
    activeAppointment: null,
    activeBarber: null,
    activeTimePeriod: 'today',
    activeMetric: null,
    history: []
  };
}

export function getStaffAiContext() {
  return { ...currentStaffContext };
}

// ── 2. DATE UTILITIES & PERIOD CALCULATIONS (Imported from dateTimeUtils) ─

// Helper to extract structured timeframe from query
export function extractTimeframe(q, defaultPeriod = 'today') {
  if (
    q.includes('last 2 day') || 
    q.includes('last 2 days') || 
    q.includes('past 2 days') || 
    q.includes('past 2 day') || 
    q.includes('previous 2 days') || 
    q.includes('last two days') || 
    q.includes('past two days') || 
    q.includes('2 days') || 
    q.includes('two days') || 
    q.includes('last few days') || 
    q.includes('past few days')
  ) {
    return { period: 'last_2_days', label: 'the last 2 days' };
  }
  if (q.includes('yesterday') || q.includes('yesrday') || q.includes('yetsrday') || q.includes('yest') || q.includes('yday')) {
    return { period: 'yesterday', label: 'yesterday' };
  }
  if (q.includes('tomorrow') || q.includes('next day') || q.includes('tmrw')) {
    return { period: 'tomorrow', label: 'tomorrow' };
  }
  if (q.includes('last month')) {
    return { period: 'last_month', label: 'last month' };
  }
  if (q.includes('this month') || q.includes('current month') || q.includes('month')) {
    return { period: 'this_month', label: 'this month' };
  }
  if (q.includes('last week') || q.includes('previous week')) {
    return { period: 'last_week', label: 'last week' };
  }
  if (q.includes('this week') || q.includes('current week') || q.includes('week')) {
    return { period: 'this_week', label: 'this week' };
  }
  if (q.includes('today') || q.includes('current day')) {
    return { period: 'today', label: 'today' };
  }

  // Fallback to active context if available
  if (currentStaffContext.activeTimePeriod) {
    const p = currentStaffContext.activeTimePeriod;
    const labelMap = {
      'today': 'today',
      'yesterday': 'yesterday',
      'tomorrow': 'tomorrow',
      'last_2_days': 'the last 2 days',
      'this_week': 'this week',
      'last_week': 'last week',
      'this_month': 'this month',
      'last_month': 'last month'
    };
    return { period: p, label: labelMap[p] || p.replace('_', ' ') };
  }

  return { period: defaultPeriod, label: defaultPeriod };
}

// ── 3. DATA ACCESS LAYER (CANONICAL LIVE SOURCE OF TRUTH) ───────────────
let inMemoryAppointmentsStore = null;

export function setInMemoryStaffAppointments(appts) {
  inMemoryAppointmentsStore = appts;
}

export function getAuthoritativeAppointments(explicitList = null) {
  const mergedMap = new Map();

  const addItems = (list) => {
    if (!list || !Array.isArray(list)) return;
    list.forEach(item => {
      if (!item) return;
      const key = item.ref || item.id || (item.barberId && item.dateStr && item.timeId ? `${item.barberId}:${item.dateStr}:${item.timeId}` : null);
      if (key) {
        if (!mergedMap.has(key)) {
          mergedMap.set(key, item);
        } else {
          // Merge newer fields if available
          mergedMap.set(key, { ...mergedMap.get(key), ...item });
        }
      } else {
        mergedMap.set(`temp_${Math.random()}`, item);
      }
    });
  };

  // 1. Explicit list passed to AI engine
  if (explicitList && Array.isArray(explicitList) && explicitList.length > 0) {
    addItems(explicitList);
  }

  // 2. In-memory store updated by BarberDashboardPage
  if (inMemoryAppointmentsStore && Array.isArray(inMemoryAppointmentsStore) && inMemoryAppointmentsStore.length > 0) {
    addItems(inMemoryAppointmentsStore);
  }

  // 3. Direct bookingStore getter
  try {
    const storeList = getAllAppointments();
    if (storeList && Array.isArray(storeList)) {
      addItems(storeList);
    }
  } catch (e) {
    // ignore
  }

  return Array.from(mergedMap.values());
}

// ── 4. ADVANCED NORMALIZATION & TYPO TOLERANCE ENGINE ──────────────────
const EXACT_NORMALIZATION_MAP = {
  // Appointment variations
  'appoitment': 'appointment',
  'appoitments': 'appointments',
  'appoitmnt': 'appointment',
  'appoitmnts': 'appointments',
  'apointment': 'appointment',
  'apointments': 'appointments',
  'appointmnt': 'appointment',
  'appointmnts': 'appointments',
  'appoinment': 'appointment',
  'appoinments': 'appointments',
  'appointement': 'appointment',
  'appointements': 'appointments',
  'apointmnt': 'appointment',
  'apointmnts': 'appointments',
  'appointmet': 'appointment',
  'appointmets': 'appointments',
  'appts': 'appointments',
  'appt': 'appointment',
  'apts': 'appointments',
  'apt': 'appointment',
  'appoit': 'appointment',
  'appoits': 'appointments',

  // Booking variations
  'bok': 'booking',
  'boking': 'booking',
  'bokking': 'booking',
  'bokings': 'bookings',
  'bokkings': 'bookings',
  'bookin': 'booking',
  'bookg': 'booking',
  'bookk': 'booking',
  'bookkk': 'booking',
  'bokkingg': 'booking',

  // Schedule variations
  'schedul': 'schedule',
  'scheduls': 'schedules',
  'skedule': 'schedule',
  'skedules': 'schedules',
  'schedual': 'schedule',
  'scheduals': 'schedules',
  'scheduel': 'schedule',
  'scheduels': 'schedules',
  'scheduale': 'schedule',
  'scheduales': 'schedules',
  'schedue': 'schedule',
  'schedues': 'schedules',

  // Date variations
  'tday': 'today',
  'todat': 'today',
  'toda': 'today',
  'todays': 'today',
  'todayy': 'today',
  'todayz': 'today',
  'tody': 'today',
  'todai': 'today',
  'tomoro': 'tomorrow',
  'tomorow': 'tomorrow',
  'tmrw': 'tomorrow',
  'tmr': 'tomorrow',
  'tommorow': 'tomorrow',
  'tomrw': 'tomorrow',
  'yest': 'yesterday',
  'yestday': 'yesterday',
  'yesterdy': 'yesterday',
  'yesrday': 'yesterday',
  'yetsrday': 'yesterday',
  'yesturday': 'yesterday',
  'yester': 'yesterday',
  'yday': 'yesterday',
  'yesterdays': 'yesterday',

  // Financial variations
  'incom': 'income',
  'incomes': 'income',
  'earn': 'earnings',
  'earning': 'earnings',
  'earnings': 'earnings',
  'sal': 'sales',
  'sales': 'sales',
  'sale': 'sales',
  'revnue': 'revenue',
  'revenuee': 'revenue',
  'rev': 'revenue',
  'paymnt': 'payment',
  'paymnts': 'payments',
  'paymet': 'payment',
  'paymets': 'payments',
  'paid': 'paid',

  // Chair & Service in-progress variations
  'chare': 'chair',
  'char': 'chair',
  'chairr': 'chair',
  'chayers': 'chair',
  'chaires': 'chair',
  'inchair': 'in chair',
  'in-chair': 'in chair',
  'geting': 'getting',
  'gettin': 'getting',
  'getn': 'getting',
  'serv': 'serving',
  'servin': 'serving',
  'served': 'serving',
  'servce': 'service',
  'srvice': 'service',
  'servic': 'service',
  'servise': 'service',
  'hairct': 'haircut',
  'haircu': 'haircut',
  'hircut': 'haircut',

  // Completion variations
  'complted': 'completed',
  'completd': 'completed',
  'complet': 'completed',
  'complited': 'completed',
  'compleeted': 'completed',
  'finishd': 'finished',
  'finshed': 'finished',
  'finsh': 'finished',

  // Cancellation & Refund variations
  'canceld': 'cancelled',
  'cancld': 'cancelled',
  'canclled': 'cancelled',
  'cancled': 'cancelled',
  'cancl': 'cancel',
  'cancle': 'cancel',
  'cancelling': 'cancelled',
  'cancellations': 'cancelled',
  'refundd': 'refund',
  'refnd': 'refund',
  'refun': 'refund',
  'refunded': 'refund',
  'refunds': 'refund',

  // Barber variations
  'barbr': 'barber',
  'barbrs': 'barbers',
  'barberr': 'barber',
  'barberrs': 'barbers',
  'babr': 'barber',
  'babrs': 'barbers',
  'barbar': 'barber',
  'barbars': 'barbers',

  // Customer name typos
  'benjamn': 'benjamin',
  'benjmin': 'benjamin',
  'benjamen': 'benjamin',
  'mulugta': 'mulugeta',
  'mulugetta': 'mulugeta',
  'muluget': 'mulugeta',
  'custmer': 'customer',
  'custmers': 'customers',
  'custmr': 'customer',
  'custmrs': 'customers',
  'customr': 'customer',
  'customrs': 'customers',

  // Status variations
  'verifed': 'verified',
  'verfied': 'verified',
  'verfy': 'verified',
  'verify': 'verified',
  'comming': 'coming',
  'comin': 'coming',
  'brifing': 'briefing',
  'breifing': 'briefing',
  'mch': 'much',
  'hw': 'how',
  'u': 'you',
  'ur': 'your',
  'r': 'are',
  'pls': 'please',
  'plz': 'please'
};

const GENERIC_INTENT_STOPWORDS = new Set([
  'today', 'todays', 'tomorrow', 'tomorrows', 'yesterday', 'yesterdays', 'yesrday', 'yetsrday', 'yest', 'yday',
  'last', 'past', 'previous', 'two', 'days', 'day', 'week', 'month', 'few',
  'appointment', 'appointments', 'appoitment', 'appoitments', 'appoitmnt', 'appoitmnts',
  'apointment', 'apointments', 'appointmnt', 'appointmnts', 'appoinment', 'appoinments',
  'booking', 'bookings', 'book', 'booked', 'bok', 'boking', 'bokings',
  'schedule', 'schedules', 'schedual', 'scheduel', 'queue', 'list',
  'revenue', 'sales', 'earnings', 'income', 'money', 'payment', 'payments', 'paid', 'pay', 'pays', 'paying', 'price', 'pricing',
  'barber', 'barbers', 'chair', 'chairs',
  'service', 'services', 'cut', 'cuts', 'haircut', 'haircuts',
  'receipt', 'receipts', 'verified', 'verifying', 'verification', 'pending', 'unverified',
  'completed', 'complete', 'finished', 'finish',
  'cancelled', 'canceld', 'cancld', 'cancelling', 'cancel',
  'refund', 'refunds', 'refunded',
  'currently', 'now', 'here', 'being', 'getting', 'serving', 'served', 'waiting',
  'details', 'everything', 'all', 'tell', 'dossier', 'summary', 'record', 'records', 'info', 'information',
  'customer', 'customers', 'client', 'clients', 'guest', 'guests',
  'who', 'what', 'when', 'how', 'many', 'much', 'is', 'are', 'was', 'were', 'do', 'does', 'did', 'we', 'have', 'has', 'had', 'been', 'be',
  'show', 'me', 'give', 'get', 'tell', 'find', 'search', 'check', 'view',
  'this', 'daily', 'briefing', 'report', 'status',
  'he', 'she', 'his', 'her', 'their', 'they', 'them', 'it', 'that', 'with', 'about', 'and', 'for', 'of',
  'owe', 'owes', 'owing', 'still', 'due', 'balance', 'additional', 'difference', 'diff', 'required', 'credit', 'credits', 'change', 'changed', 'changing', 'original', 'new', 'current',
  'return', 'returns', 'returned', 'hand', 'handed', 'over', 'cash', 'money', 'birr', 'etb',
  'help', 'hi', 'hello', 'hey', 'good', 'morning', 'afternoon', 'evening', 'there'
]);

function levenshteinDistance(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function normalizeTokenFuzzy(rawToken) {
  if (!rawToken) return '';
  const token = rawToken.toLowerCase().trim();

  // 1. Direct dictionary match
  if (EXACT_NORMALIZATION_MAP[token]) {
    return EXACT_NORMALIZATION_MAP[token];
  }

  // 2. Remove consecutive duplicate characters (e.g., appointmenttt -> appointment)
  const deduped = token.replace(/([a-z])\1{2,}/g, '$1$1');
  if (EXACT_NORMALIZATION_MAP[deduped]) {
    return EXACT_NORMALIZATION_MAP[deduped];
  }

  // 3. Dynamic root lemma matching
  if (/^ap{1,2}o?i?n?t?m/i.test(token) || /^ap{1,2}t/i.test(token) || /^ap{1,2}oi/i.test(token) || /^ap{1,2}oint/i.test(token)) {
    return token.endsWith('s') ? 'appointments' : 'appointment';
  }
  if (token.length >= 6 && levenshteinDistance(token, 'appointment') <= 3) {
    return 'appointment';
  }
  if (token.length >= 7 && levenshteinDistance(token, 'appointments') <= 3) {
    return 'appointments';
  }

  // Schedule roots
  if (/^s[ck]h?e?d/i.test(token)) {
    return token.endsWith('s') ? 'schedules' : 'schedule';
  }
  if (token.length >= 5 && levenshteinDistance(token, 'schedule') <= 2) {
    return 'schedule';
  }

  // Booking roots
  if (/^bo?k{1,3}/i.test(token)) {
    return token.endsWith('s') ? 'bookings' : 'booking';
  }
  if (token.length >= 4 && levenshteinDistance(token, 'booking') <= 2) {
    return 'booking';
  }

  // Date roots
  if (/^tod[ayie]/i.test(token)) return 'today';
  if (/^t[omrw]{3,}/i.test(token)) return 'tomorrow';
  if (/^y[estrd]{3,}/i.test(token)) return 'yesterday';

  // Barber roots
  if (/^ba[rb]{2,}/i.test(token)) return token.endsWith('s') ? 'barbers' : 'barber';

  // Customer roots
  if (/^cust[omr]{1,}/i.test(token)) return token.endsWith('s') ? 'customers' : 'customer';

  // Revenue / Income / Payment roots
  if (/^incom/i.test(token)) return 'income';
  if (/^rev[enue]{2,}/i.test(token)) return 'revenue';
  if (/^earn/i.test(token)) return 'earnings';
  if (/^pay[mnt]{1,}/i.test(token)) return token.endsWith('s') ? 'payments' : 'payment';

  return token;
}

export function normalizeQuery(rawQuery) {
  if (!rawQuery) return '';
  let str = String(rawQuery).toLowerCase().replace(/[^a-z0-9]/g, ' ');
  const tokens = str.split(/\s+/).filter(Boolean);
  const normalizedTokens = tokens.map(normalizeTokenFuzzy);
  return normalizedTokens.join(' ');
}

// ── 5. CUSTOMER PROFILING & FUZZY MATCHING ─────────────────────────────
function isFuzzyNameMatch(queryToken, targetName) {
  if (!queryToken || !targetName) return false;
  const q = queryToken.toLowerCase();
  const t = targetName.toLowerCase();

  if (t === q || t.includes(q)) return true;

  const tWords = t.split(/\s+/);
  for (const word of tWords) {
    if (word === q || word.startsWith(q) || q.startsWith(word)) return true;
    if (q.length >= 4 && word.length >= 4) {
      if (q.slice(0, 4) === word.slice(0, 4)) return true;
      if (levenshteinDistance(q, word) <= 2) return true;
    }
  }
  return false;
}

export function getAllCustomerProfiles(appointmentsList = null) {
  const appointments = appointmentsList || getAuthoritativeAppointments();
  const customerMap = new Map();

  appointments.forEach(appt => {
    const name = (appt.customerName || appt.name || '').trim();
    const phone = (appt.customerPhone || appt.phone || '').trim();
    const ref = (appt.ref || appt.bookingReference || '').trim();

    if (!name && !phone && !ref) return;

    const groupKey = (name && phone)
      ? `${normalizeQuery(name)}_${phone.replace(/\D/g, '')}`
      : (name ? normalizeQuery(name) : (phone ? phone.replace(/\D/g, '') : ref));
    if (!groupKey) return;

    if (!customerMap.has(groupKey)) {
      customerMap.set(groupKey, {
        customerName: name,
        customerPhone: phone,
        appointments: []
      });
    }

    const entry = customerMap.get(groupKey);
    if (!entry.customerName && name) entry.customerName = name;
    if (!entry.customerPhone && phone) entry.customerPhone = phone;
    entry.appointments.push(appt);
  });

  return Array.from(customerMap.values()).map(c => {
    const sorted = [...c.appointments].sort((a, b) => {
      const dateA = a.dateStr || '1970-01-01';
      const dateB = b.dateStr || '1970-01-01';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return (b.timeId || '00:00').localeCompare(a.timeId || '00:00');
    });

    const totalCount = sorted.length;
    const completedAppts = sorted.filter(a => a.status === 'Completed' || a.bookingStatus === 'Completed');
    const inChairAppts = sorted.filter(a => a.status === 'In-Chair' || a.bookingStatus === 'In-Chair');
    const cancelledAppts = sorted.filter(a => 
      a.status === 'Cancelled' || 
      a.status === 'Customer Cancelled' || 
      a.status === 'Cancelled — Refund Completed' ||
      a.bookingStatus === 'Cancelled' ||
      a.bookingStatus === 'Customer Cancelled' ||
      a.bookingStatus === 'Cancelled — Refund Completed'
    );
    const activeAppts = sorted.filter(a => 
      !a.status?.includes('Cancelled') && 
      !a.bookingStatus?.includes('Cancelled') && 
      a.status !== 'Completed' && 
      a.bookingStatus !== 'Completed'
    );

    const completedCount = completedAppts.length;
    const inChairCount = inChairAppts.length;
    const cancelledCount = cancelledAppts.length;
    const activeCount = activeAppts.length;

    const totalSpend = completedAppts.reduce((sum, a) => {
      const price = Number(a.price) || Number(a.amountPaid) || 0;
      return sum + price;
    }, 0);

    const barberCounts = {};
    sorted.forEach(a => {
      const bName = a.barberName || (MOCK_BARBERS.find(b => b.id === a.barberId)?.name);
      if (bName) barberCounts[bName] = (barberCounts[bName] || 0) + 1;
    });
    let favoriteBarber = 'N/A';
    let maxBarberCount = 0;
    Object.entries(barberCounts).forEach(([bName, count]) => {
      if (count > maxBarberCount) {
        maxBarberCount = count;
        favoriteBarber = bName;
      }
    });

    const serviceCounts = {};
    sorted.forEach(a => {
      const sName = a.serviceName || (MOCK_SERVICES.find(s => s.id === a.serviceId)?.name);
      if (sName) serviceCounts[sName] = (serviceCounts[sName] || 0) + 1;
    });
    let mostRequestedService = 'N/A';
    let maxServiceCount = 0;
    Object.entries(serviceCounts).forEach(([sName, count]) => {
      if (count > maxServiceCount) {
        maxServiceCount = count;
        mostRequestedService = sName;
      }
    });

    const latestAppointment = sorted[0] || null;
    const phoneDigits = (c.customerPhone || '').replace(/\D/g, '');
    const cleanNameKey = (c.customerName || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const customerId = `cust_${phoneDigits || cleanNameKey}_${latestAppointment?.ref || latestAppointment?.id || '0'}`;

    return {
      customerId,
      customerName: c.customerName || 'Distinguished Guest',
      customerPhone: c.customerPhone || 'Not recorded',
      totalCount,
      completedCount,
      inChairCount,
      cancelledCount,
      activeCount,
      totalSpend,
      favoriteBarber,
      mostRequestedService,
      latestAppointment,
      activeAppointments: activeAppts,
      allAppointments: sorted
    };
  });
}

export function scoreCustomerMatch(queryName, custName) {
  if (!queryName || !custName) return 0;
  const q = String(queryName).toLowerCase().trim();
  const c = String(custName).toLowerCase().trim();
  if (!q || !c) return 0;

  // 1. Exact full name match
  if (q === c) return 100;

  const qTokens = q.split(/\s+/).filter(Boolean);
  const cTokens = c.split(/\s+/).filter(Boolean);

  // 2. Exact token match (e.g. 'belete' === 'belete', or first name 'yonas' === 'yonas')
  for (const qt of qTokens) {
    if (cTokens.includes(qt)) {
      if (cTokens[0] === qt) return 90; // exact first name
      if (cTokens[cTokens.length - 1] === qt) return 88; // exact last name
      return 85; // exact token match
    }
  }

  // 3. Exact prefix match (query is at least 3 chars and customer token starts with it)
  for (const qt of qTokens) {
    if (qt.length >= 3) {
      for (const ct of cTokens) {
        if (ct.startsWith(qt)) return 70;
      }
    }
  }

  // 4. Tight single-character fuzzy typo match (distance === 1, token length >= 5)
  for (const qt of qTokens) {
    if (qt.length >= 5) {
      for (const ct of cTokens) {
        if (ct.length >= 5 && levenshteinDistance(qt, ct) === 1) {
          return 60;
        }
      }
    }
  }

  return 0;
}

export function resolveCustomerEntity(candidateName, allProfiles) {
  if (!candidateName || !allProfiles || allProfiles.length === 0) return [];
  
  const scored = [];
  for (const p of allProfiles) {
    const score = scoreCustomerMatch(candidateName, p.customerName);
    if (score > 0) {
      scored.push({ profile: p, score });
    }
  }

  if (scored.length === 0) return [];

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  const highestScore = scored[0].score;
  // If highest score is exact/token match (>= 80), only keep matches with >= 80
  if (highestScore >= 80) {
    return scored.filter(s => s.score >= 80).map(s => s.profile);
  }

  return scored.filter(s => s.score === highestScore).map(s => s.profile);
}

export function findCustomerProfiles(queryStr, appointmentsList = null) {
  if (!queryStr) return [];
  const rawStr = String(queryStr).trim();
  const rawDigits = rawStr.replace(/\D/g, '');

  const allProfiles = getAllCustomerProfiles(appointmentsList);

  // Exact phone match or 4+ digits
  if (rawDigits && rawDigits.length >= 4) {
    const phoneMatches = allProfiles.filter(p => {
      const normPhone = (p.customerPhone || '').replace(/\D/g, '');
      return normPhone.includes(rawDigits);
    });
    if (phoneMatches.length > 0) return phoneMatches;
  }

  // Booking reference match
  const compactQ = rawStr.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (compactQ.length >= 4) {
    const refMatches = allProfiles.filter(p => {
      const refs = p.allAppointments.map(a => (a.ref || a.bookingReference || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
      return refs.some(r => r.includes(compactQ) || compactQ.includes(r));
    });
    if (refMatches.length > 0) return refMatches;
  }

  // Extract candidate name by removing possessives and stopwords
  const cleanQ = normalizeQuery(rawStr.replace(/['’]s\b/gi, ' ').replace(/\bs\b/gi, ' '));
  const nonGenericTokens = cleanQ.split(/\s+/).filter(t => !GENERIC_INTENT_STOPWORDS.has(t) && t.length >= 2);
  const candidateName = nonGenericTokens.join(' ').trim();

  if (candidateName && candidateName.length >= 2) {
    return resolveCustomerEntity(candidateName, allProfiles);
  }

  return [];
}

export function parseCustomerIntent(rawQuery) {
  if (!rawQuery) return { intent: 'GENERAL', candidateName: '', timeframe: { period: 'all', label: 'all time' } };

  // 1. Normalize possessives ('s, ’s)
  let cleanStr = String(rawQuery).replace(/['’]s\b/gi, ' ').replace(/\bs\b/gi, ' ');

  // 2. Extract timeframe
  const timeframe = extractTimeframe(cleanStr);

  // 3. Normalize query tokens
  const cleanQ = normalizeQuery(cleanStr);
  const tokens = cleanQ.split(/\s+/).filter(Boolean);

  // 4. Intent detection
  let intent = 'CUSTOMER_APPOINTMENT';

  const isCashChange = cleanQ.includes('cash change') || 
    cleanQ.includes('return money') ||
    cleanQ.includes('return cash') ||
    (cleanQ.includes('change') && (cleanQ.includes('return') || cleanQ.includes('returned') || cleanQ.includes('give') || cleanQ.includes('gave') || cleanQ.includes('hand') || cleanQ.includes('money') || cleanQ.includes('cash') || cleanQ.includes('birr') || cleanQ.includes('etb') || cleanQ.includes('100') || cleanQ.includes('got') || cleanQ.includes('get') || cleanQ.includes('his change') || cleanQ.includes('her change') || cleanQ.includes('receive') || cleanQ.includes('pay')));

  if (isCashChange) {
    intent = 'CUSTOMER_CHANGE';
  } else if (cleanQ.includes('phone') || cleanQ.includes('contact') || cleanQ.includes('number') || cleanQ.includes('telephone') || cleanQ.includes('call')) {
    intent = 'CUSTOMER_PHONE';
  } else if (cleanQ.includes('owe') || cleanQ.includes('owes') || cleanQ.includes('owing') || cleanQ.includes('balance') || cleanQ.includes('additional payment') || cleanQ.includes('payment') || cleanQ.includes('paid') || cleanQ.includes('pay') || cleanQ.includes('paymnt') || cleanQ.includes('receipt') || cleanQ.includes('verified') || cleanQ.includes('unverified') || cleanQ.includes('telebirr') || cleanQ.includes('cbe') || cleanQ.includes('cost') || cleanQ.includes('price') || cleanQ.includes('how much')) {
    intent = 'CUSTOMER_PAYMENT';
  } else if (cleanQ.includes('service') || cleanQ.includes('haircut') || cleanQ.includes('cut') || cleanQ.includes('choose') || cleanQ.includes('chose') || cleanQ.includes('package') || cleanQ.includes('treatment') || cleanQ.includes('change') || cleanQ.includes('changed') || cleanQ.includes('original') || cleanQ.includes('new service') || cleanQ.includes('current service')) {
    intent = 'CUSTOMER_SERVICE';
  } else if (cleanQ.includes('barber') || cleanQ.includes('barbr') || cleanQ.includes('stylist') || cleanQ.includes('who cut') || cleanQ.includes('who was his barber') || cleanQ.includes('who was her barber')) {
    intent = 'CUSTOMER_BARBER';
  } else if (cleanQ.includes('history') || cleanQ.includes('previous') || cleanQ.includes('past') || cleanQ.includes('all visits') || cleanQ.includes('lifetime') || cleanQ.includes('how many times')) {
    intent = 'CUSTOMER_HISTORY';
  } else if (cleanQ.includes('chair') || cleanQ.includes('where is') || cleanQ.includes('where now') || cleanQ.includes('now') || cleanQ.includes('currently') || cleanQ.includes('in chair')) {
    intent = 'CUSTOMER_STATUS';
  } else if (cleanQ.includes('complete') || cleanQ.includes('completed') || cleanQ.includes('finish') || cleanQ.includes('finished') || cleanQ.includes('done')) {
    intent = 'CUSTOMER_COMPLETED';
  } else if (cleanQ.includes('cancel') || cleanQ.includes('cancelled') || cleanQ.includes('refund') || cleanQ.includes('refunded')) {
    intent = 'CUSTOMER_CANCELLED';
  } else if (cleanQ.includes('everything') || cleanQ.includes('dossier') || cleanQ.includes('full details') || cleanQ.includes('all details')) {
    intent = 'CUSTOMER_DOSSIER';
  } else if (cleanQ.includes('appointment') || cleanQ.includes('booking') || cleanQ.includes('schedule') || cleanQ.includes('when') || cleanQ.includes('what time') || cleanQ.includes('time') || cleanQ.includes('date')) {
    intent = 'CUSTOMER_APPOINTMENT';
  } else {
    intent = 'CUSTOMER_LOOKUP';
  }

  // 5. Extract Candidate Name by filtering out stopwords
  const nonGenericTokens = tokens.filter(t => !GENERIC_INTENT_STOPWORDS.has(t) && t.length >= 2);
  const candidateName = nonGenericTokens.join(' ').trim();

  return {
    intent,
    candidateName,
    timeframe,
    tokens,
    cleanQ
  };
}

// ── 5.5 COMPREHENSIVE PAYMENT VERIFICATION ENGINE ────────────────────────
export function getPaymentVerificationDetails(appt) {
  if (!appt) {
    return {
      price: 0,
      origPrice: 0,
      addPrice: 0,
      actualPaid: 0,
      remainingDue: 0,
      isUpgraded: false,
      isOrigVerified: false,
      isAddSubmitted: false,
      isAddVerified: false,
      isFullyVerified: false,
      isPartiallyVerified: false,
      isUnverified: true,
      hasReceipt: false,
      hasAddReceipt: false,
      statusBadge: 'Unverified',
      verificationAction: 'Verify Payment',
      paymentMethod: 'DIRECT'
    };
  }

  const price = Number(appt.price) || Number(appt.amountPaid) || 400;
  const origPrice = Number(appt.originalServicePrice || appt.originalPrice || price);
  const isUpgraded = !!((appt.serviceUpgraded || appt.isEdited || appt.adjustmentType === 'additional_payment') && (price > origPrice));
  const isDowngraded = !!(origPrice > price || appt.adjustmentType === 'downgrade_refund_at_shop' || (appt.overpaymentAmount > 0));
  const overpayChange = isDowngraded ? (Number(appt.overpaymentAmount) || Math.max(0, origPrice - price)) : 0;
  const addPrice = Number(appt.additionalAmountDue || appt.additionalSubmittedAmount || (isUpgraded ? Math.max(0, price - origPrice) : 0));

  const isOrigVerified = !!(appt.originalPaymentVerified === true || appt.originalPaymentStatus === 'Verified' || (appt.paymentStatus === 'Verified' && !isUpgraded));
  const isAddSubmitted = !!(appt.additionalReceiptSubmitted || appt.additionalReceiptPreview || appt.additionalPaymentStatus === 'Pending Verification' || (Number(appt.additionalSubmittedAmount) > 0));
  const isAddVerified = !!(appt.additionalPaymentVerified === true || appt.additionalPaymentStatus === 'Verified');

  const isFullyVerified = isUpgraded ? (isOrigVerified && isAddVerified) : (appt.paymentStatus === 'Verified');
  const isPartiallyVerified = isUpgraded && isOrigVerified && !isAddVerified;
  const isUnverified = !isFullyVerified && !isPartiallyVerified;

  const actualPaid = appt.paidAmount !== undefined
    ? Number(appt.paidAmount)
    : (isFullyVerified ? price : (isPartiallyVerified ? origPrice : 0));

  const remainingDue = appt.remainingAmount !== undefined
    ? Number(appt.remainingAmount)
    : (isDowngraded ? 0 : (isFullyVerified ? 0 : (isPartiallyVerified ? addPrice : (isUpgraded && isAddSubmitted ? addPrice : price))));

  const hasReceipt = !!(appt.receiptPreview || appt.originalReceiptPreview || appt.receiptFileName);
  const hasAddReceipt = !!(appt.additionalReceiptPreview || appt.additionalReceiptSubmitted);
  const paymentMethod = (appt.paymentMethod || 'Direct Transfer').toUpperCase();

  let statusBadge = 'Verification Pending';
  let verificationAction = 'Verify Payment';
  const isShopRefundHandedOver = Boolean(appt.shopRefundHandedOver);
  const shopRefundHandedOverAt = appt.shopRefundHandedOverAt || null;
  const shopRefundHandedOverBy = appt.shopRefundHandedOverBy || null;

  if (isFullyVerified) {
    statusBadge = isDowngraded 
      ? `Verified ✓ (Overpayment: ${overpayChange} ETB change ${isShopRefundHandedOver ? 'Returned ✓' : 'Due at shop'})`
      : 'Verified ✓';
    verificationAction = isDowngraded
      ? (isShopRefundHandedOver ? 'Already Verified & Change Returned ✓' : `Already Verified (Give ${overpayChange} ETB change)`)
      : 'Already Verified';
  } else if (isDowngraded) {
    statusBadge = `Verification Pending (${origPrice} ETB receipt submitted, ${price} ETB service — ${isShopRefundHandedOver ? `${overpayChange} ETB change returned ✓` : `Return ${overpayChange} ETB Cash Change`})`;
    verificationAction = isShopRefundHandedOver ? `Verify Payment (${origPrice} ETB)` : `Verify Payment & Return ${overpayChange} ETB Change`;
  } else if (isUpgraded) {
    if (!isOrigVerified && isAddSubmitted) {
      statusBadge = `Unverified (${actualPaid} ETB Paid, +${addPrice} ETB Additional Submitted, +${remainingDue} ETB Due)`;
      verificationAction = `Verify All (${price} ETB)`;
    } else if (isOrigVerified && isAddSubmitted) {
      statusBadge = `Original Verified (${origPrice} ETB), Additional Pending (+${addPrice} ETB)`;
      verificationAction = `Verify +${addPrice} ETB`;
    } else if (isOrigVerified && !isAddSubmitted) {
      statusBadge = `Original Verified (${origPrice} ETB), Additional +${addPrice} ETB Due`;
      verificationAction = `Collect Additional +${addPrice} ETB`;
    } else {
      statusBadge = `Verification Pending (Total ${price} ETB)`;
      verificationAction = `Verify Payment (${price} ETB)`;
    }
  }

  return {
    price,
    origPrice,
    addPrice,
    actualPaid,
    remainingDue,
    isUpgraded,
    isDowngraded,
    overpayChange,
    isShopRefundHandedOver,
    shopRefundHandedOverAt,
    shopRefundHandedOverBy,
    isOrigVerified,
    isAddSubmitted,
    isAddVerified,
    isFullyVerified,
    isPartiallyVerified,
    isUnverified,
    hasReceipt,
    hasAddReceipt,
    statusBadge,
    verificationAction,
    paymentMethod
  };
}

// ── 6. FINANCIAL & OPERATIONS METRICS CALCULATOR ────────────────────────
export function calculateStaffMetrics(period = 'today', appointmentsList = null, referenceDate = new Date()) {
  const appointments = appointmentsList || getAuthoritativeAppointments();
  const periods = getDatePeriodRange(period, referenceDate);

  const filtered = appointments.filter(a => {
    if (!a.dateStr) return false;
    const parts = a.dateStr.split('-').map(Number);
    if (parts.length !== 3) return false;
    const apptDate = new Date(parts[0], parts[1] - 1, parts[2]);
    apptDate.setHours(0, 0, 0, 0);

    if (period === 'today') {
      return a.dateStr === periods.todayKey;
    } else if (period === 'tomorrow') {
      return a.dateStr === periods.tomorrowKey;
    } else if (period === 'yesterday') {
      return a.dateStr === periods.yesterdayKey;
    } else if (period === 'last_2_days') {
      return (a.dateStr === periods.todayKey || a.dateStr === periods.yesterdayKey) || 
             (apptDate >= periods.last2DaysStart && apptDate <= periods.last2DaysEnd);
    } else if (period === 'this_week') {
      return apptDate >= periods.thisWeekStart && apptDate <= periods.thisWeekEnd;
    } else if (period === 'last_week') {
      return apptDate >= periods.lastWeekStart && apptDate <= periods.lastWeekEnd;
    } else if (period === 'this_month') {
      return apptDate >= periods.thisMonthStart && apptDate <= periods.thisMonthEnd;
    } else if (period === 'last_month') {
      return apptDate >= periods.lastMonthStart && apptDate <= periods.lastMonthEnd;
    }
    return true; // 'all'
  });

  const totalBookings = filtered.length;
  const completedAppointments = filtered.filter(a => a.status === 'Completed' || a.bookingStatus === 'Completed');
  const inChairAppointments = filtered.filter(a => a.status === 'In-Chair' || a.bookingStatus === 'In-Chair');
  const confirmedAppointments = filtered.filter(a => a.status === 'Confirmed' || a.bookingStatus === 'Confirmed');
  const verifiedPayments = filtered.filter(a => {
    const details = getPaymentVerificationDetails(a);
    return details.isFullyVerified;
  });

  const pendingPayments = filtered.filter(a => {
    const details = getPaymentVerificationDetails(a);
    return !details.isFullyVerified && 
           a.status !== 'Completed' && 
           a.bookingStatus !== 'Completed' && 
           !a.status?.includes('Cancelled') && 
           !a.bookingStatus?.includes('Cancelled');
  });

  const cancelledAppointments = filtered.filter(a => 
    a.status === 'Cancelled' || 
    a.status === 'Customer Cancelled' || 
    a.status === 'Cancelled — Refund Completed' ||
    a.bookingStatus === 'Cancelled' ||
    a.bookingStatus === 'Customer Cancelled' ||
    a.bookingStatus === 'Cancelled — Refund Completed'
  );

  const refundedAppointments = filtered.filter(a => 
    a.refundStatus === 'Completed' || 
    a.status === 'Cancelled — Refund Completed' || 
    a.bookingStatus === 'Cancelled — Refund Completed'
  );

  // Realized revenue: strictly counts verified collected payments (or completed services)
  const realizedRevenue = filtered
    .filter(a => ((a.status === 'Completed' || a.bookingStatus === 'Completed') || (Number(a.paidAmount) > 0) || a.paymentStatus === 'Verified') && 
                 !a.status?.includes('Cancelled') && !a.bookingStatus?.includes('Cancelled'))
    .reduce((sum, a) => {
      const details = getPaymentVerificationDetails(a);
      const isCompleted = a.status === 'Completed' || a.bookingStatus === 'Completed';
      return sum + (isCompleted ? details.price : details.actualPaid);
    }, 0);

  const bookedValue = filtered.reduce((sum, a) => sum + (Number(a.price) || Number(a.amountPaid) || 0), 0);
  
  // Pending revenue: unverified bookings plus remaining balance due from upgrades
  const pendingRevenue = filtered
    .filter(a => !a.status?.includes('Cancelled') && !a.bookingStatus?.includes('Cancelled'))
    .reduce((sum, a) => {
      const details = getPaymentVerificationDetails(a);
      return sum + details.remainingDue;
    }, 0);

  const refundedAmount = refundedAppointments.reduce((sum, a) => sum + (Number(a.price) || Number(a.amountPaid) || 0), 0);
  const cancelledAmount = cancelledAppointments.reduce((sum, a) => sum + (Number(a.price) || Number(a.amountPaid) || 0), 0);

  const barberMap = {};
  MOCK_BARBERS.forEach(b => {
    barberMap[b.id] = {
      id: b.id,
      name: b.name,
      completedCount: 0,
      verifiedCount: 0,
      totalCount: 0,
      cancelledCount: 0,
      realizedRevenue: 0,
      pendingRevenue: 0
    };
  });

  filtered.forEach(a => {
    const matchedB = MOCK_BARBERS.find(b => (a.barberName && b.name.toLowerCase() === a.barberName.toLowerCase()) || b.id === a.barberId);
    const bId = matchedB ? matchedB.id : (a.barberId || 'barber-1');
    const bName = matchedB ? matchedB.name : (a.barberName || 'Barber');

    if (!barberMap[bId]) {
      barberMap[bId] = {
        id: bId,
        name: bName,
        completedCount: 0,
        verifiedCount: 0,
        totalCount: 0,
        cancelledCount: 0,
        realizedRevenue: 0,
        pendingRevenue: 0
      };
    }
    barberMap[bId].totalCount++;
    const isCompleted = a.status === 'Completed' || a.bookingStatus === 'Completed';
    const isVerified = a.paymentStatus === 'Verified';
    const isCancelled = a.status?.includes('Cancelled') || a.bookingStatus?.includes('Cancelled');
    
    if (isCompleted) barberMap[bId].completedCount++;
    if (isVerified) barberMap[bId].verifiedCount++;
    if (isCancelled) barberMap[bId].cancelledCount++;

    if ((isCompleted || isVerified || (Number(a.paidAmount) > 0)) && !isCancelled) {
      const currentPrice = Number(a.price) || Number(a.amountPaid) || 0;
      let actualCollected = a.paidAmount !== undefined ? Number(a.paidAmount) : (isVerified || isCompleted ? currentPrice : 0);
      const realized = Math.min(actualCollected, currentPrice);
      barberMap[bId].realizedRevenue += (isCompleted ? currentPrice : realized);
    } 
    if (!isCancelled) {
      if (a.remainingAmount !== undefined && Number(a.remainingAmount) > 0) {
        barberMap[bId].pendingRevenue += Number(a.remainingAmount);
      } else if (a.paymentStatus === 'Verification Pending' || a.paymentStatus === 'Pending' || a.paymentStatus === 'Additional Payment Due') {
        barberMap[bId].pendingRevenue += (Number(a.price) || Number(a.amountPaid) || 0);
      }
    }
  });

  const barberRankings = Object.values(barberMap).sort((a, b) => b.completedCount - a.completedCount || b.realizedRevenue - a.realizedRevenue);
  const busiestBarber = barberRankings[0] || null;

  const serviceMap = {};
  MOCK_SERVICES.forEach(s => {
    serviceMap[s.id] = {
      id: s.id,
      name: s.name,
      price: s.price,
      count: 0,
      completedCount: 0,
      revenue: 0
    };
  });

  filtered.forEach(a => {
    const sId = a.serviceId || 'srv-1';
    if (!serviceMap[sId]) {
      serviceMap[sId] = {
        id: sId,
        name: a.serviceName || 'Service',
        price: a.price || 400,
        count: 0,
        completedCount: 0,
        revenue: 0
      };
    }
    serviceMap[sId].count++;
    const isCompleted = a.status === 'Completed' || a.bookingStatus === 'Completed';
    const isCancelled = a.status?.includes('Cancelled') || a.bookingStatus?.includes('Cancelled');

    if ((isCompleted || a.paymentStatus === 'Verified' || (Number(a.paidAmount) > 0)) && !isCancelled) {
      const currentPrice = Number(a.price) || Number(a.amountPaid) || 0;
      let actualCollected = a.paidAmount !== undefined ? Number(a.paidAmount) : (a.paymentStatus === 'Verified' || isCompleted ? currentPrice : 0);
      const realized = Math.min(actualCollected, currentPrice);
      serviceMap[sId].revenue += (isCompleted ? currentPrice : realized);
    }
  });

  const serviceRankings = Object.values(serviceMap).sort((a, b) => b.count - a.count);
  const mostPopularService = serviceRankings[0] || null;

  return {
    period,
    totalBookings,
    completedCount: completedAppointments.length,
    inChairCount: inChairAppointments.length,
    confirmedCount: confirmedAppointments.length,
    verifiedCount: verifiedPayments.length,
    pendingCount: pendingPayments.length,
    cancelledCount: cancelledAppointments.length,
    refundedCount: refundedAppointments.length,
    realizedRevenue,
    bookedValue,
    pendingRevenue,
    refundedAmount,
    cancelledAmount,
    averageTransactionValue: completedAppointments.length > 0 ? Math.round(realizedRevenue / completedAppointments.length) : (totalBookings > 0 ? Math.round(realizedRevenue / totalBookings) : 0),
    busiestBarber,
    barberRankings,
    mostPopularService,
    serviceRankings,
    appointments: filtered
  };
}

// ── 7. COMPLETE CUSTOMER DOSSIER BUILDER ─────────────────────────────────
export function formatCustomerFullDossier(cust, targetAppt = null) {
  const appt = targetAppt || cust.activeAppointments?.[0] || cust.latestAppointment || cust.allAppointments?.[0];
  const totalCount = cust.totalCount || cust.allAppointments?.length || 1;
  const completedCount = cust.completedCount || 0;
  const cancelledCount = cust.cancelledCount || 0;
  const activeCount = cust.activeCount || 0;
  const totalSpend = cust.totalSpend || 0;
  const favBarber = cust.favoriteBarber || 'N/A';
  const mostReqService = cust.mostRequestedService || 'N/A';

  const dateDisplay = formatAppointmentRelativeDate(appt?.dateStr) || appt?.dateStr || 'Not recorded';
  const timeDisplay = appt?.timeDisplay || appt?.startTime || 'Not recorded';
  const refCode = appt?.ref || appt?.bookingReference || 'N/A';
  const sName = appt?.serviceName || 'Service';
  const bName = appt?.barberName || (MOCK_BARBERS.find(b => b.id === appt?.barberId)?.name) || 'Barber';
  const price = appt?.price || appt?.amountPaid || 0;
  const paymentMethod = (appt?.paymentMethod || 'Direct Transfer').toUpperCase();
  const paymentStatus = appt?.paymentStatus || 'Verification Pending';
  const apptStatus = appt?.status || appt?.bookingStatus || 'Confirmed';
  const refundStatus = appt?.refundStatus || (appt?.status?.includes('Refund Completed') ? 'Completed' : (appt?.status?.includes('Cancelled') ? 'Pending' : 'None'));

  let header = `👤 **CUSTOMER RECORD: ${cust.customerName.toUpperCase()}**\n\n`;
  header += `• **Phone**: ${cust.customerPhone || 'Not recorded'}\n`;
  header += `• **Lifetime Visits**: ${totalCount} recorded (${completedCount} completed, ${activeCount} active, ${cancelledCount} cancelled)\n`;
  header += `• **Lifetime Spend**: ${totalSpend.toLocaleString()} ETB\n`;
  header += `• **Preferred Barber**: ${favBarber} · **Favorite Service**: ${mostReqService}\n\n`;

  header += `📋 **CURRENT / LATEST APPOINTMENT (${refCode})**\n`;
  header += `• **Date & Time**: ${dateDisplay} at ${timeDisplay}\n`;
  const origPrice = Number(appt?.originalServicePrice || appt?.originalPrice || price);
  const isDowngraded = Boolean(origPrice > price || appt?.adjustmentType === 'downgrade_refund_at_shop' || (appt?.overpaymentAmount > 0));
  const overpayChange = isDowngraded ? (Number(appt?.overpaymentAmount) || (origPrice - price)) : 0;

  if (appt?.serviceUpgraded && price > origPrice) {
    header += `• **Service**: ${sName} (${price} ETB) — *Upgraded from ${appt.originalServiceName || 'Original Service'} (${origPrice} ETB)*\n`;
  } else if (isDowngraded) {
    header += `• **Service**: ${sName} (${price} ETB) — *Changed from ${appt.originalServiceName || 'Original Service'} (${origPrice} ETB)*\n`;
  } else {
    header += `• **Service**: ${sName} (${price} ETB)\n`;
  }
  header += `• **Barber**: ${bName}\n`;
  
  if (appt?.serviceUpgraded && price > origPrice) {
    const origStatus = appt.originalPaymentVerified ? 'Verified' : 'Pending Verification';
    const addStatus = appt.additionalPaymentVerified ? 'Verified' : (appt.additionalReceiptSubmitted ? 'Additional Receipt Attached (Pending Verification)' : 'Unpaid / Pending Submission');
    const remainingDue = appt.additionalPaymentVerified ? 0 : (appt.additionalAmountDue || (price - origPrice));
    header += `• **Payment Breakdown**: Total ${price} ETB\n`;
    header += `  - Original Service: ${origPrice} ETB (${origStatus})\n`;
    header += `  - Additional Balance: ${appt.additionalAmountDue || (price - origPrice)} ETB (${addStatus})\n`;
    header += `  - Remaining Balance Due: **${remainingDue} ETB**\n`;
  } else if (isDowngraded && overpayChange > 0) {
    const isHandedOver = Boolean(appt?.shopRefundHandedOver);
    header += `• **Payment Breakdown**: ${sName} (${price} ETB · ${paymentStatus} via ${paymentMethod})\n`;
    header += `  - Receipt Submitted: ${origPrice} ETB\n`;
    header += `  - Cash Change (${overpayChange} ETB): ${isHandedOver ? '✅ Handed Over ✓ (Returned in cash at shop)' : '❌ Pending Return at Shop (Not handed over yet)'}\n`;
    header += `  - Remaining Balance Due: **0 ETB**\n`;
  } else {
    header += `• **Payment**: ${price} ETB (${paymentStatus} via ${paymentMethod})\n`;
  }

  header += `• **Appointment Status**: ${apptStatus}\n`;
  if (refundStatus !== 'None') {
    header += `• **Refund Status**: ${refundStatus}\n`;
  }

  return header;
}

// ── 8. MASTER INTENT CLASSIFICATION & PROCESSING PIPELINE ──────────────


/**
 * Exact UI Entity Selection Handlers
 * Directly resolves a specific customer or appointment from UI clicks without re-running ambiguous natural language parsing.
 */
export function selectCustomerEntity(targetIdOrKey, referenceDate = null) {
  const allProfiles = getAllCustomerProfiles();
  if (!targetIdOrKey || allProfiles.length === 0) {
    return {
      text: "I couldn't find that customer record. You can search by customer name or phone number.",
      cardType: null,
      cardData: null,
      suggestions: [
        { label: "Today's Schedule", prompt: "today appointment?" },
        { label: "Find Customer", prompt: "find customer" }
      ]
    };
  }

  const cleanTarget = String(targetIdOrKey).trim();
  const cleanTargetLower = cleanTarget.toLowerCase();
  const digits = cleanTarget.replace(/\D/g, '');

  let matchedProfile = null;

  // 1. Exact match by customerId
  matchedProfile = allProfiles.find(p => p.customerId === cleanTarget);

  // 2. Exact match by phone number
  if (!matchedProfile && digits && digits.length >= 7) {
    matchedProfile = allProfiles.find(p => {
      const pDigits = (p.customerPhone || '').replace(/\D/g, '');
      return pDigits === digits || (pDigits.length >= 9 && pDigits.endsWith(digits.slice(-9)));
    });
  }

  // 3. Exact match by appointment reference / ID
  if (!matchedProfile) {
    matchedProfile = allProfiles.find(p => 
      p.allAppointments.some(a => 
        (a.ref && a.ref.toLowerCase() === cleanTargetLower) || 
        (a.bookingReference && a.bookingReference.toLowerCase() === cleanTargetLower) || 
        (a.id && a.id.toLowerCase() === cleanTargetLower)
      )
    );
  }

  // 4. Exact match by full customer name (case-insensitive)
  if (!matchedProfile) {
    matchedProfile = allProfiles.find(p => p.customerName.toLowerCase() === cleanTargetLower);
  }

  // 5. High-confidence resolution fallback
  if (!matchedProfile) {
    const scored = resolveCustomerEntity(cleanTarget, allProfiles);
    if (scored.length > 0) {
      matchedProfile = scored[0];
    }
  }

  if (!matchedProfile) {
    return {
      text: `I couldn't find a customer record matching '${cleanTarget}'.`,
      cardType: null,
      cardData: null,
      suggestions: [
        { label: "Today's Schedule", prompt: "today appointment?" }
      ]
    };
  }

  // Set active context
  const latestAppt = matchedProfile.latestAppointment || (matchedProfile.allAppointments.length > 0 ? matchedProfile.allAppointments[0] : null);
  currentStaffContext.activeCustomer = matchedProfile;
  currentStaffContext.activeAppointment = latestAppt;
  currentStaffContext.activeBarber = latestAppt?.barberName || matchedProfile.favoriteBarber;

  // Format detailed customer dossier
  const dossierText = formatCustomerFullDossier(matchedProfile, latestAppt);

  return {
    text: dossierText,
    cardType: 'customer_profile',
    cardData: matchedProfile,
    suggestions: [
      { label: "What service?", prompt: "what service did he get?" },
      { label: "What phone?", prompt: "what is his phone number?" },
      { label: "Was payment verified?", prompt: "was his payment verified?" },
      { label: "Who was his barber?", prompt: "who was his barber?" },
      { label: "When was it?", prompt: "when was his appointment?" }
    ]
  };
}

export function selectAppointmentEntity(refOrId, referenceDate = null) {
  const allAppts = getAuthoritativeAppointments();
  const searchStr = String(refOrId || '').trim().toLowerCase();
  
  const appt = allAppts.find(a => 
    (a.ref && a.ref.toLowerCase() === searchStr) || 
    (a.bookingReference && a.bookingReference.toLowerCase() === searchStr) || 
    (a.id && a.id.toLowerCase() === searchStr)
  );

  if (!appt) {
    return {
      text: `I couldn't find appointment '${refOrId}'.`,
      cardType: null,
      cardData: null,
      suggestions: [
        { label: "Today's Schedule", prompt: "today appointment?" }
      ]
    };
  }

  const allProfiles = getAllCustomerProfiles(allAppts);
  const cust = allProfiles.find(p => 
    p.allAppointments.some(a => a.ref === appt.ref || a.id === appt.id) ||
    (p.customerPhone && p.customerPhone === appt.customerPhone) ||
    (p.customerName && p.customerName.toLowerCase() === (appt.customerName || '').toLowerCase())
  );

  currentStaffContext.activeCustomer = cust || { customerName: appt.customerName, customerPhone: appt.customerPhone };
  currentStaffContext.activeAppointment = appt;
  currentStaffContext.activeBarber = appt.barberName;

  const dateDisplay = formatAppointmentRelativeDate(appt.dateStr, referenceDate) || appt.dateStr;
  const price = appt.price || appt.amountPaid || 0;
  const payStatus = appt.paymentStatus || 'Verification Pending';
  const payMethod = (appt.paymentMethod || 'Direct').toUpperCase();
  const status = appt.status || appt.bookingStatus || 'Confirmed';

  const text = `📋 **Booking ${appt.ref || appt.bookingReference}**: **${appt.customerName}** (${appt.customerPhone || 'No phone'}) booked **${appt.serviceName}** with **${appt.barberName}** on **${dateDisplay}** at **${appt.timeDisplay || appt.startTime}**. Price: **${price} ETB** (${payStatus} via ${payMethod}). Status: **${status}**.`;

  return {
    text,
    cardType: 'booking_card',
    cardData: appt,
    suggestions: [
      { label: "Is he in chair?", prompt: "Is he in the chair?" },
      { label: "Was payment verified?", prompt: "Was payment verified?" },
      { label: "Customer Profile", prompt: `Show me ${appt.customerName}'s profile` }
    ]
  };
}

export function processStaffQuery(rawQuery, appointmentsListOrRefDate = null, referenceDate = null) {
  let appointmentsList = null;
  let refDate = null;

  if (Array.isArray(appointmentsListOrRefDate)) {
    appointmentsList = appointmentsListOrRefDate;
    setInMemoryStaffAppointments(appointmentsList);
    refDate = referenceDate instanceof Date ? referenceDate : getSystemNow();
  } else if (appointmentsListOrRefDate instanceof Date) {
    refDate = appointmentsListOrRefDate;
  } else if (appointmentsListOrRefDate && typeof appointmentsListOrRefDate === 'object') {
    if (appointmentsListOrRefDate.appointmentsList) {
      appointmentsList = appointmentsListOrRefDate.appointmentsList;
      setInMemoryStaffAppointments(appointmentsList);
    }
    refDate = appointmentsListOrRefDate.referenceDate || null;
  }

  refDate = refDate || (referenceDate instanceof Date ? referenceDate : getSystemNow());
  // ── [PRIORITY 0] EXACT UI ENTITY SELECTION DISPATCHER ──────────────────
  if (rawQuery && typeof rawQuery === 'object') {
    if (rawQuery.type === 'customer_selection' || rawQuery.action === 'select_customer') {
      return selectCustomerEntity(rawQuery.customerId || rawQuery.customerPhone || rawQuery.bookingRef || rawQuery.customerName, referenceDate);
    }
    if (rawQuery.type === 'appointment_selection' || rawQuery.action === 'select_appointment') {
      return selectAppointmentEntity(rawQuery.appointmentId || rawQuery.bookingRef || rawQuery.ref || rawQuery.id, referenceDate);
    }
  }

  if (typeof rawQuery === 'string') {
    if (rawQuery.startsWith('__SELECT_CUSTOMER__:')) {
      const target = rawQuery.replace('__SELECT_CUSTOMER__:', '').trim();
      return selectCustomerEntity(target, referenceDate);
    }
    if (rawQuery.startsWith('__SELECT_APPOINTMENT__:')) {
      const target = rawQuery.replace('__SELECT_APPOINTMENT__:', '').trim();
      return selectAppointmentEntity(target, referenceDate);
    }
  }

  const query = (rawQuery || '').trim();
  const q = normalizeQuery(query);
  const tokens = q.split(/\s+/).filter(Boolean);

  // ── [PRIORITY 1] SECURITY & CREDENTIAL INTENT ────────────────────────
  if (
    q.includes('password') || 
    q.includes('admin login') || 
    q.includes('secret') || 
    q.includes('token') || 
    q.includes('credential') || 
    q.includes('auth key') ||
    q.includes('barber password') ||
    q.includes('staff password') ||
    q.includes('system password')
  ) {
    return {
      text: "🔒 Security Alert: Staff passwords, authentication credentials, and system tokens are strictly encrypted and cannot be displayed.",
      cardType: null,
      cardData: null,
      suggestions: [
        { label: "Today's Schedule", prompt: "today appointment?" },
        { label: "Today's Briefing", prompt: "Give me today's briefing" },
        { label: "Today's Revenue", prompt: "How much did we make today?" }
      ]
    };
  }

  
  // ── [PRIORITY 1.1] REAL-TIME CLOCK & DATE INQUIRY ─────────────────────
  const isClockQuery = (
    q === 'what time is it' ||
    q === 'what time is it now' ||
    q === 'what is the time' ||
    q === 'what is the time now' ||
    q === 'current time' ||
    q === 'time now' ||
    q === 'time'
  );

  const isDateQuery = (
    q === 'what is today date' ||
    q === 'what is todays date' ||
    q === 'what date is it' ||
    q === 'what is the date' ||
    q === 'today date' ||
    q === 'current date' ||
    q === 'date today'
  );

  if (isClockQuery) {
    const curTime = getCurrentTime(referenceDate);
    const curDate = getCurrentDate(referenceDate);
    return {
      text: `🕒 The current time is **${curTime}** (${curDate}) in **Africa/Addis_Ababa** (UTC+3, Ethiopia). Shop operating hours are 8:00 AM – 8:00 PM Daily.`,
      cardType: null,
      cardData: null,
      suggestions: [
        { label: "Today's Schedule", prompt: "today appointment?" },
        { label: "Today's Revenue", prompt: "How much did we make today?" }
      ]
    };
  }

  if (isDateQuery) {
    const curDate = getCurrentDate(referenceDate);
    const dateFormatted = formatAppointmentRelativeDate(curDate, referenceDate);
    return {
      text: `📅 Today's official date is **${dateFormatted}** (${curDate}) in **Africa/Addis_Ababa** (UTC+3, Ethiopia).`,
      cardType: null,
      cardData: null,
      suggestions: [
        { label: "Today's Schedule", prompt: "today appointment?" },
        { label: "Today's Revenue", prompt: "How much did we make today?" }
      ]
    };
  }

  // ── Extract Timeframe for date-aware routing ─────────────────────────
  const timeframe = extractTimeframe(q);

  // ── Match Barber if present ──────────────────────────────────────────
  const isBarberPerformanceKeyword = (
    q.includes('busiest barber') ||
    q.includes('top barber') ||
    q.includes('best barber') ||
    q.includes('who made the most') ||
    q.includes('completed the most') ||
    q.includes('most appointments') ||
    q.includes('barber performance') ||
    q.includes('who served the most') ||
    q.includes('which barber has the most')
  );

  // ── Candidate Customer & Intent Parsing ──────────────────────────────
  const parsedCustomer = parseCustomerIntent(query);
  const candidateName = parsedCustomer.candidateName;

  const matchedCustomerProfiles = (!isBarberPerformanceKeyword && candidateName.length >= 2) ? findCustomerProfiles(candidateName, appointmentsList) : [];
  const isExplicitCustomerMatch = matchedCustomerProfiles.length >= 1;

  // Match Barber if present
  const matchedBarber = MOCK_BARBERS.find(b => {
    const bName = b.name.toLowerCase();
    const bFull = b.fullName ? b.fullName.toLowerCase() : '';
    if (isExplicitCustomerMatch && !q.includes(bName + ' s') && !q.includes(bName + 's') && !q.includes('with ' + bName) && !q.includes('serving') && !q.includes('did ' + bName)) {
      return false;
    }
    return q.includes(bName) || (bFull && q.includes(bFull));
  });

  // Active customer from match or multi-turn context
  const resolvedCustomer = isExplicitCustomerMatch ? matchedCustomerProfiles[0] : currentStaffContext.activeCustomer;
  const resolvedAppt = resolvedCustomer?.activeAppointments?.[0] || resolvedCustomer?.latestAppointment || currentStaffContext.activeAppointment;

  
  // ── [PRIORITY 1.4] EXPLICIT BARBER SEARCH, SCHEDULE & REVENUE DISPATCHER ─
  const isDedicatedBarberQuery = !!matchedBarber && !isExplicitCustomerMatch && !isBarberPerformanceKeyword && (
    q.includes('search') ||
    q.includes('find') ||
    q.includes('who is') ||
    q.includes('show') ||
    q.includes('look') ||
    q.includes('profile') ||
    q.includes('barber') ||
    q.includes('booked with') ||
    q.includes('serving') ||
    q.includes('chair') ||
    q.includes('customers') ||
    q.includes('schedule') ||
    q.includes('appointment') ||
    q.includes('appointments') ||
    q.includes('revenue') ||
    q.includes('income') ||
    q.includes('earn') ||
    q.includes('make') ||
    q.includes('made') ||
    q === matchedBarber.name.toLowerCase() ||
    q === `barber ${matchedBarber.name.toLowerCase()}` ||
    q === `search ${matchedBarber.name.toLowerCase()}` ||
    q === `find ${matchedBarber.name.toLowerCase()}` ||
    q === `show ${matchedBarber.name.toLowerCase()}` ||
    q === `show me ${matchedBarber.name.toLowerCase()}` ||
    q.startsWith(`who booked with ${matchedBarber.name.toLowerCase()}`) ||
    q.startsWith(`${matchedBarber.name.toLowerCase()} appointment`) ||
    q.startsWith(`${matchedBarber.name.toLowerCase()} revenue`) ||
    q.startsWith(`${matchedBarber.name.toLowerCase()} schedule`)
  );

  if (isDedicatedBarberQuery) {
    currentStaffContext.activeBarber = matchedBarber.name;
    const allAppts = getAuthoritativeAppointments();
    const period = timeframe.period || 'today';
    const periodLabel = timeframe.label || 'today';

    const barberAppts = allAppts.filter(a => 
      a.barberId === matchedBarber.id || 
      (a.barberName && a.barberName.toLowerCase().includes(matchedBarber.name.toLowerCase()))
    );

    // 1. Barber Revenue Query (e.g. "how much did abebe make today?", "abebe revenue")
    if (q.includes('revenue') || q.includes('income') || q.includes('earn') || q.includes('make') || q.includes('made') || q.includes('sales')) {
      const stats = calculateStaffMetrics(period, null, refDate);
      const bStat = stats.barberRankings.find(b => b.id === matchedBarber.id) || { completedCount: 0, verifiedCount: 0, realizedRevenue: 0, pendingRevenue: 0, totalCount: 0 };

      let barberText = '';
      if (bStat.realizedRevenue === 0 && bStat.pendingRevenue > 0) {
        barberText = `💈 **${matchedBarber.name}** has **0 ETB** in realized revenue ${periodLabel}, with **${bStat.pendingRevenue.toLocaleString()} ETB** pending verification (${bStat.totalCount} booking${bStat.totalCount === 1 ? '' : 's'}).`;
      } else if (bStat.realizedRevenue > 0) {
        barberText = `💈 **${matchedBarber.name}** generated **${bStat.realizedRevenue.toLocaleString()} ETB** in finalized service revenue from **${bStat.completedCount || bStat.verifiedCount}** booking${(bStat.completedCount || bStat.verifiedCount) === 1 ? '' : 's'} ${periodLabel}${bStat.pendingRevenue > 0 ? ` (${bStat.pendingRevenue.toLocaleString()} ETB pending verification)` : ''}.`;
      } else {
        barberText = `💈 **${matchedBarber.name}** has generated **0 ETB** in revenue ${periodLabel} (0 completed bookings).`;
      }

      return {
        text: barberText,
        cardType: 'analytics_metric',
        cardData: {
          periodLabel,
          title: `${matchedBarber.name}'s Revenue (${periodLabel})`,
          revenue: bStat.realizedRevenue,
          pendingRevenue: bStat.pendingRevenue,
          completedCount: bStat.completedCount,
          barber: matchedBarber.name
        },
        suggestions: [
          { label: `${matchedBarber.name}'s Schedule`, prompt: `${matchedBarber.name} appointments today?` },
          { label: "Today's Revenue", prompt: "How much did we make today?" }
        ]
      };
    }

    // 2. Barber Chair Query (e.g. "who is in abebe's chair?", "who is abebe serving?")
    if (q.includes('chair') || q.includes('serving')) {
      const inChairForBarber = barberAppts.find(a => a.status === 'In-Chair' || a.bookingStatus === 'In-Chair');
      if (inChairForBarber) {
        return {
          text: `💈 **${matchedBarber.name}** is currently serving **${inChairForBarber.customerName}** for **${inChairForBarber.serviceName}** in Chair 1 (${inChairForBarber.timeDisplay || inChairForBarber.startTime} · ${inChairForBarber.paymentStatus}).`,
          cardType: 'booking_card',
          cardData: inChairForBarber,
          suggestions: [
            { label: "Payment Status", prompt: `Was ${inChairForBarber.customerName}'s payment verified?` },
            { label: `${matchedBarber.name}'s Schedule`, prompt: `${matchedBarber.name} appointments today?` }
          ]
        };
      }
      return {
        text: `💈 **${matchedBarber.name}** does not currently have a customer active in the chair.`,
        cardType: 'appointments_list',
        cardData: [],
        suggestions: [
          { label: `${matchedBarber.name}'s Schedule`, prompt: `${matchedBarber.name} appointments today?` },
          { label: "Who is in chair?", prompt: "Who is currently in chair?" }
        ]
      };
    }

    // 3. Barber Appointments & Search Query (e.g. "search abebe", "who booked with abebe?", "abebe appointments?", "show me abebe's customers")
    const targetPeriodAppts = period && period !== 'all'
      ? barberAppts.filter(a => isAppointmentInPeriod(a, period, refDate))
      : barberAppts;

    const roleName = matchedBarber.role || 'Master Barber';
    const spec = matchedBarber.specialty || 'Master Grooming & Styling';
    const exp = matchedBarber.experience || '8+ Years';
    const rat = matchedBarber.rating || '4.9 ★';

    let header = `💈 **Barber Profile & Schedule: ${matchedBarber.name.toUpperCase()}**\n`;
    header += `• **Role / Specialty**: ${roleName} — ${spec}\n`;
    header += `• **Rating & Experience**: ${rat} · ${exp}\n`;
    header += `• **Working Hours**: 8:00 AM – 8:00 PM Daily (Lucy Hotel Ground Floor)\n\n`;

    if (targetPeriodAppts.length === 0) {
      header += `📅 **${matchedBarber.name}** has **0 appointments** scheduled for ${periodLabel}.`;
      return {
        text: header,
        cardType: 'appointments_list',
        cardData: [],
        suggestions: [
          { label: "All Appointments", prompt: `${periodLabel} appointment?` },
          { label: "How much did he make?", prompt: `How much did ${matchedBarber.name} make today?` }
        ]
      };
    }

    const listSummary = targetPeriodAppts.map(a => {
      const relDate = formatAppointmentRelativeDate(a.dateStr, refDate) || a.dateStr;
      return `• **${a.timeDisplay || a.startTime || 'Time'}** — **${a.customerName}** — ${a.serviceName} (${a.price} ETB · ${a.paymentStatus} · ${a.status})`;
    }).join('\n');

    header += `📋 **Appointments (${periodLabel}) — ${targetPeriodAppts.length} booking${targetPeriodAppts.length === 1 ? '' : 's'}**:\n\n${listSummary}`;

    return {
      text: header,
      cardType: 'appointments_list',
      cardData: targetPeriodAppts,
      suggestions: [
        { label: "Who is in chair?", prompt: `Who is in ${matchedBarber.name}'s chair?` },
        { label: "How much did he make?", prompt: `How much did ${matchedBarber.name} make today?` },
        { label: "Today's Schedule", prompt: "today appointment?" }
      ]
    };
  }

  // ── [PRIORITY 1.5] EXPLICIT CUSTOMER SPECIFIC INTENT DISPATCHER ──────────
  // Check if query is targeting specific customer details: appointment, service, payment, barber, phone, history
  const isDedicatedCustomerQuery = isExplicitCustomerMatch && matchedCustomerProfiles.length === 1 && !isBarberPerformanceKeyword;
  
  if (isDedicatedCustomerQuery) {
    const cust = matchedCustomerProfiles[0];
    currentStaffContext.activeCustomer = cust;
    const targetPeriod = parsedCustomer.timeframe.period;

    let targetAppt = null;
    if (targetPeriod && targetPeriod !== 'all') {
      targetAppt = cust.allAppointments.find(a => isAppointmentInPeriod(a, targetPeriod, refDate)) || cust.latestAppointment;
    } else {
      targetAppt = cust.activeAppointments?.[0] || cust.latestAppointment;
    }
    currentStaffContext.activeAppointment = targetAppt;

    const custName = cust.customerName;
    const dateStr = targetAppt ? (formatAppointmentRelativeDate(targetAppt.dateStr) || targetAppt.dateStr || 'Scheduled Date') : 'N/A';
    const timeStr = targetAppt ? (targetAppt.timeDisplay || targetAppt.startTime || 'Scheduled Time') : 'N/A';
    const sName = targetAppt?.serviceName || cust.mostRequestedService || 'Grooming Service';
    const bName = targetAppt?.barberName || (MOCK_BARBERS.find(b => b.id === targetAppt?.barberId)?.name) || cust.favoriteBarber || 'Barber';
    const price = targetAppt?.price || targetAppt?.amountPaid || 0;
    const payStatus = targetAppt?.paymentStatus || 'Verification Pending';
    const payMethod = (targetAppt?.paymentMethod || 'Direct').toUpperCase();
    const apptStatus = targetAppt?.status || targetAppt?.bookingStatus || 'Confirmed';
    const refCode = targetAppt?.ref || targetAppt?.bookingReference || 'N/A';

    // 0. Customer Cash Change Intent (e.g. "did we return bvvvvv's change?", "did bvvvvv get his change?")
    if (parsedCustomer.intent === 'CUSTOMER_CHANGE') {
      const changeAppt = cust.activeAppointments?.find(a => 
        a.adjustmentType === 'downgrade_refund_at_shop' || 
        (a.overpaymentAmount > 0) || 
        (a.originalPrice && Number(a.originalPrice) > Number(a.price))
      ) || cust.allAppointments?.find(a => 
        a.adjustmentType === 'downgrade_refund_at_shop' || 
        (a.overpaymentAmount > 0) || 
        (a.originalPrice && Number(a.originalPrice) > Number(a.price))
      );

      if (changeAppt) {
        const changeAmt = changeAppt.overpaymentAmount || (Number(changeAppt.originalPrice) - Number(changeAppt.price));
        const isHandedOver = Boolean(changeAppt.shopRefundHandedOver);

        return {
          text: isHandedOver
            ? `✅ **Yes** — **${custName}**'s **${changeAmt} ETB** cash change has already been **Handed Over ✓** at the shop (marked returned by staff).`
            : `❌ **No** — **${custName}** has not received his **${changeAmt} ETB** cash change yet (Status: **Pending Return ❌**). Please remember to hand him **${changeAmt} ETB in cash** when he arrives for his haircut at the front desk.`,
          cardType: 'booking_card',
          cardData: changeAppt,
          suggestions: [
            { label: "View Appointment", prompt: `Show me ${custName}` },
            { label: "Was payment verified?", prompt: `Was ${custName}'s payment verified?` }
          ]
        };
      } else {
        return {
          text: `ℹ️ **${custName}** does not have any cash change due. He booked **${targetAppt?.serviceName || 'Service'}** (${targetAppt?.price || 0} ETB · ${targetAppt?.paymentStatus || 'Confirmed'}).`,
          cardType: 'booking_card',
          cardData: targetAppt,
          suggestions: [
            { label: "Appointment Details", prompt: `Show me ${custName}` },
            { label: "Who is owed change?", prompt: "who is still owed change?" }
          ]
        };
      }
    }

    // A. Customer Service Intent (e.g. "what service did belete choose?", "did belete change his service?", "what was the original service?", "what is the new service?")
    if (parsedCustomer.intent === 'CUSTOMER_SERVICE') {
      const isServiceChangeQuery = parsedCustomer.cleanQ.includes('change') || parsedCustomer.cleanQ.includes('changed') || parsedCustomer.cleanQ.includes('switch');
      const isOriginalServiceQuery = parsedCustomer.cleanQ.includes('original');
      const isCurrentServiceQuery = parsedCustomer.cleanQ.includes('new service') || parsedCustomer.cleanQ.includes('current service') || parsedCustomer.cleanQ.includes('what is the new') || parsedCustomer.cleanQ.includes('what is the current');

      if (isOriginalServiceQuery) {
        const origName = targetAppt?.originalServiceName || sName;
        const origPrice = targetAppt?.originalPrice !== undefined ? targetAppt.originalPrice : price;
        const responseText = (origName !== sName)
          ? `✂️ The original service booked by **${custName}** was **${origName}** (${origPrice} ETB). It was updated to **${sName}** (${price} ETB).`
          : `✂️ **${custName}**'s original service is **${sName}** (${price} ETB) with **${bName}**.`;
        return {
          text: responseText,
          cardType: 'booking_card',
          cardData: targetAppt,
          suggestions: [
            { label: "New Service", prompt: `What is ${custName}'s new service?` },
            { label: "How much does he owe?", prompt: `How much does ${custName} still owe?` }
          ]
        };
      }

      if (isCurrentServiceQuery) {
        return {
          text: `✂️ The current service for **${custName}** is **${sName}** (${price} ETB) with **${bName}** on **${dateStr}** at **${timeStr}**.`,
          cardType: 'booking_card',
          cardData: targetAppt,
          suggestions: [
            { label: "Original Service", prompt: `What was ${custName}'s original service?` },
            { label: "Payment Status", prompt: `Was ${custName}'s payment verified?` }
          ]
        };
      }

      if (isServiceChangeQuery) {
        const hasChanged = Boolean(targetAppt?.originalServiceName && targetAppt.originalServiceName !== sName) || (targetAppt?.adjustmentType && targetAppt.adjustmentType !== 'none');
        if (hasChanged) {
          let changeDetails = '';
          if (targetAppt.adjustmentType === 'additional_payment') {
            changeDetails = ` An additional payment of **${targetAppt.remainingAmount} ETB** is required.`;
          } else if (targetAppt.adjustmentType === 'refund_or_credit') {
            changeDetails = ` He has a refund/credit of **${targetAppt.adjustmentAmount} ETB** due.`;
          }
          return {
            text: `✂️ **Yes** — **${custName}** changed his service from **${targetAppt.originalServiceName || 'original service'}** (${targetAppt.originalPrice} ETB) to **${sName}** (${price} ETB).${changeDetails}`,
            cardType: 'booking_card',
            cardData: targetAppt,
            suggestions: [
              { label: "How much does he owe?", prompt: `How much does ${custName} still owe?` },
              { label: "Was payment verified?", prompt: `Was ${custName}'s payment verified?` }
            ]
          };
        } else {
          return {
            text: `No — **${custName}** has not changed his service. He is scheduled for **${sName}** (${price} ETB) with **${bName}**.`,
            cardType: 'booking_card',
            cardData: targetAppt,
            suggestions: [
              { label: "Appointment Time", prompt: `When is ${custName}'s appointment?` },
              { label: "Was payment verified?", prompt: `Was ${custName}'s payment verified?` }
            ]
          };
        }
      }

      return {
        text: `✂️ **${custName}** chose **${sName}** (${price} ETB) with **${bName}** on **${dateStr}** at **${timeStr}** (${apptStatus} · ${payStatus}).`,
        cardType: 'booking_card',
        cardData: targetAppt,
        suggestions: [
          { label: "Was payment verified?", prompt: `Was ${custName}'s payment verified?` },
          { label: "Who is his barber?", prompt: `Who was ${custName}'s barber?` },
          { label: "Customer Phone", prompt: `What is ${custName}'s phone number?` }
        ]
      };
    }

    // B. Customer Payment Intent (e.g. "was belete's payment verified?", "how much does benjamin still owe?", "how much has he paid?", "what is the current appointment price?")
    if (parsedCustomer.intent === 'CUSTOMER_PAYMENT') {
      const isOweQuery = parsedCustomer.cleanQ.includes('owe') || parsedCustomer.cleanQ.includes('owes') || parsedCustomer.cleanQ.includes('owing') || parsedCustomer.cleanQ.includes('balance') || parsedCustomer.cleanQ.includes('additional payment') || parsedCustomer.cleanQ.includes('additional') || parsedCustomer.cleanQ.includes('still owe');
      const isPriceQuery = parsedCustomer.cleanQ.includes('current appointment price') || parsedCustomer.cleanQ.includes('current price') || (parsedCustomer.cleanQ.includes('what is') && parsedCustomer.cleanQ.includes('price')) || parsedCustomer.cleanQ.includes('how much is the service');
      const isHowMuchPaidQuery = parsedCustomer.cleanQ.includes('how much has he paid') || parsedCustomer.cleanQ.includes('how much did he pay') || parsedCustomer.cleanQ.includes('how much paid') || parsedCustomer.cleanQ.includes('what did he pay') || parsedCustomer.cleanQ.includes('how much he paid');

      const details = getPaymentVerificationDetails(targetAppt);
      const isVerified = details.isFullyVerified;
      const actualPaid = details.actualPaid;
      const remainingDue = details.remainingDue;
      const price = details.price;

      if (isOweQuery) {
        if (details.isUpgraded && remainingDue > 0) {
          const origNote = details.isOrigVerified 
            ? `Initial payment of ${details.origPrice} ETB is Verified ✓` 
            : `Initial payment of ${details.origPrice} ETB is UNVERIFIED (0 ETB paid)`;
          return {
            text: `💳 **${custName}** has an outstanding balance of **${remainingDue} ETB** for **${sName}** (Total: ${price} ETB, ${origNote}${details.isAddSubmitted ? ', additional receipt submitted' : ''}).`,
            cardType: 'booking_card',
            cardData: targetAppt,
            suggestions: [
              { label: "Did he change service?", prompt: `Did ${custName} change his service?` },
              { label: "Verify Payment", prompt: `Was ${custName}'s payment verified?` }
            ]
          };
        } else if (targetAppt?.adjustmentType === 'downgrade_refund_at_shop' || (details.isDowngraded && details.overpayChange > 0)) {
          const overpay = targetAppt.overpaymentAmount || details.overpayChange;
          return {
            text: `💚 **${custName}** does not owe anything! He changed to a cheaper service: **${sName}** (${price} ETB, down from ${details.origPrice} ETB). He is due **${overpay} ETB cash change** back in person when he arrives for his haircut.`,
            cardType: 'booking_card',
            cardData: targetAppt,
            suggestions: [
              { label: "Original Service", prompt: `What was ${custName}'s original service?` },
              { label: "Customer Phone", prompt: `What is ${custName}'s phone number?` }
            ]
          };
        } else if (targetAppt?.adjustmentType === 'refund_or_credit') {
          return {
            text: `💚 **${custName}** does not owe anything! He has a **refund/credit of ${targetAppt.adjustmentAmount} ETB** due because he changed from **${targetAppt.originalServiceName}** (${targetAppt.originalPrice} ETB) to **${sName}** (${price} ETB).`,
            cardType: 'booking_card',
            cardData: targetAppt,
            suggestions: [
              { label: "Original Service", prompt: `What was ${custName}'s original service?` },
              { label: "Customer Phone", prompt: `What is ${custName}'s phone number?` }
            ]
          };
        } else if (isVerified) {
          return {
            text: `✅ **${custName}** does not owe anything. His payment of **${price} ETB** for **${sName}** is fully **Verified** ✓.`,
            cardType: 'booking_card',
            cardData: targetAppt,
            suggestions: [
              { label: "Service Details", prompt: `What service did ${custName} choose?` },
              { label: "Appointment Time", prompt: `When is ${custName}'s appointment?` }
            ]
          };
        } else {
          return {
            text: `⏳ **${custName}**'s payment of **${price} ETB** for **${sName}** is currently **Verification Pending** (owes ${price} ETB).`,
            cardType: 'booking_card',
            cardData: targetAppt,
            suggestions: [
              { label: "Verify Payment", prompt: `Was ${custName}'s payment verified?` },
              { label: "Contact Phone", prompt: `What is ${custName}'s phone number?` }
            ]
          };
        }
      }

      if (isPriceQuery) {
        return {
          text: `🏷️ The current appointment price for **${custName}** (${sName}) is **${price} ETB**${details.isUpgraded ? ` (Upgraded from ${details.origPrice} ETB)` : ''}.`,
          cardType: 'booking_card',
          cardData: targetAppt,
          suggestions: [
            { label: "How much did he pay?", prompt: `How much has ${custName} paid?` },
            { label: "How much does he owe?", prompt: `How much does ${custName} still owe?` }
          ]
        };
      }

      if (isHowMuchPaidQuery) {
        let paidDesc = '';
        if (details.isFullyVerified) {
          paidDesc = `has paid **${price} ETB** in full (**Verified ✓**)`;
        } else if (details.isPartiallyVerified) {
          paidDesc = `has **${details.actualPaid} ETB paid and Verified ✓** for original service, with **+${details.addPrice} ETB** additional balance due`;
        } else if (details.isUpgraded && !details.isOrigVerified) {
          paidDesc = `has **0 ETB verified paid** so far. Total for **${sName}** is **${price} ETB** (${details.origPrice} ETB original + ${details.addPrice} ETB upgrade balance due)`;
        } else if (details.isDowngraded && details.overpayChange > 0) {
          paidDesc = `submitted a receipt for **${details.origPrice} ETB** for **${sName}** (${price} ETB service). He is due **${details.overpayChange} ETB cash change** back at the shop`;
        } else {
          paidDesc = `has a booking of **${price} ETB** (**Verification Pending**)`;
        }
        return {
          text: `💳 **${custName}** ${paidDesc} for **${sName}**.`,
          cardType: 'booking_card',
          cardData: targetAppt,
          suggestions: [
            { label: "How much does he owe?", prompt: `How much does ${custName} still owe?` },
            { label: "Was payment verified?", prompt: `Was ${custName}'s payment verified?` }
          ]
        };
      }

      let statusText = '';
      if (details.isFullyVerified) {
        statusText = `✅ **Yes** — **${custName}**'s payment of **${price} ETB** for **${sName}** is **Fully Verified ✓** (via ${details.paymentMethod}).`;
      } else if (details.isPartiallyVerified) {
        statusText = `⏳ **Partially Verified** — **${custName}**'s original payment of **${details.origPrice} ETB** is **Verified ✓**, but the additional upgrade balance of **+${details.addPrice} ETB** for **${sName}** is **Pending Verification** (${details.isAddSubmitted ? 'Additional receipt attached, awaiting staff review' : 'No additional receipt attached yet'}).`;
      } else if (details.isUpgraded && !details.isOrigVerified) {
        statusText = `⏳ **No** — **${custName}**'s payment for **${sName}** (${price} ETB) is **UNVERIFIED** (0 ETB verified paid so far).\n\n• **Original Service (${details.origPrice} ETB)**: Unverified / Pending Verification\n• **Additional Upgrade (+${details.addPrice} ETB)**: ${details.isAddSubmitted ? 'Receipt attached, Pending Verification' : 'Pending Submission'} (+${remainingDue} ETB Due)\n• **Total Outstanding**: **${price} ETB**\n• **Dashboard Action Required**: Review receipts and click **"Verify All (${price} ETB)"** to verify.`;
      } else if (targetAppt?.adjustmentType === 'downgrade_refund_at_shop' || (details.isDowngraded && details.overpayChange > 0)) {
        const overpay = targetAppt.overpaymentAmount || details.overpayChange;
        statusText = `💵 **${custName}** changed service from **${targetAppt.originalServiceName || 'original service'}** (${details.origPrice} ETB) to **${sName}** (${price} ETB). ${isVerified ? 'Payment is Verified ✓' : 'Payment receipt is Verification Pending'}. Staff must **return ${overpay} ETB cash change** to him at the shop when he arrives for his haircut.`;
      } else if (targetAppt?.adjustmentType === 'refund_or_credit') {
        statusText = `💚 **${custName}** paid **${actualPaid} ETB** (Verified) and changed to **${sName}** (${price} ETB). Refund/credit due: **${targetAppt.adjustmentAmount} ETB**.`;
      } else {
        statusText = `⏳ **No** — **${custName}**'s payment of **${price} ETB** for **${sName}** is currently **Verification Pending** (awaiting staff review via the "Verify Payment" button).`;
      }

      return {
        text: statusText,
        cardType: 'booking_card',
        cardData: targetAppt,
        suggestions: [
          { label: "Service Details", prompt: `What service did ${custName} choose?` },
          { label: "Contact Phone", prompt: `What is ${custName}'s phone number?` },
          { label: "Today's Schedule", prompt: "today appointment?" }
        ]
      };
    }

    // C. Customer Barber Intent (e.g. "who was belete's barber?", "who cut belete's hair?")
    if (parsedCustomer.intent === 'CUSTOMER_BARBER') {
      return {
        text: `💈 **${custName}**'s barber is **${bName}** for **${sName}** on **${dateStr}** at **${timeStr}**.`,
        cardType: 'booking_card',
        cardData: targetAppt,
        suggestions: [
          { label: "Service Details", prompt: `What service did ${custName} choose?` },
          { label: "Was payment verified?", prompt: `Was ${custName}'s payment verified?` }
        ]
      };
    }

    // D. Customer Phone Intent (e.g. "what is belete's phone?")
    if (parsedCustomer.intent === 'CUSTOMER_PHONE') {
      return {
        text: `📞 **${custName}**'s contact phone number is **${cust.customerPhone || 'Not recorded'}** (${cust.totalCount} recorded visit${cust.totalCount === 1 ? '' : 's'}).`,
        cardType: 'customer_profile',
        cardData: cust,
        suggestions: [
          { label: "View Appointment", prompt: `Show me ${custName}'s appointment.` },
          { label: "Was payment verified?", prompt: `Was ${custName}'s payment verified?` }
        ]
      };
    }

    // E. Customer History Intent (e.g. "show me belete's history")
    if (parsedCustomer.intent === 'CUSTOMER_HISTORY') {
      const historyBullets = cust.allAppointments.map(a => 
        `• **${formatAppointmentRelativeDate(a.dateStr) || a.dateStr}** at ${a.timeDisplay || a.startTime} — **${a.serviceName}** with ${a.barberName} (${a.price} ETB · ${a.status || 'Confirmed'})`
      ).join('\n');
      return {
        text: `📜 Found **${cust.totalCount}** recorded appointment${cust.totalCount === 1 ? '' : 's'} for **${custName}** (${cust.completedCount} completed, ${cust.activeCount} active, ${cust.cancelledCount} cancelled):\n\n${historyBullets}`,
        cardType: 'customer_profile',
        cardData: cust,
        suggestions: [
          { label: "Contact Phone", prompt: `What is ${custName}'s phone number?` },
          { label: "Latest Appointment", prompt: `Show me ${custName}'s appointment.` }
        ]
      };
    }

    // F. Customer Appointment Intent (e.g. "Show me belete's appointment.", "show belete appointment", "appointment for belete", "belete appoitment", "belete bokking", "belete's appointment yesterday")
    // NOTE: If the query is asking about chair, completion, cancellation, or full dossier, let it proceed to Priorities 2-5
    const isSpecialLifecycleIntent = (
      parsedCustomer.intent === 'CUSTOMER_DOSSIER' ||
      parsedCustomer.intent === 'CUSTOMER_STATUS' ||
      parsedCustomer.intent === 'CUSTOMER_COMPLETED' ||
      parsedCustomer.intent === 'CUSTOMER_CANCELLED' ||
      q.includes('chair') || q.includes('chare') ||
      q.includes('finish') || q.includes('complete') ||
      q.includes('cancel') || q.includes('refund') ||
      q.includes('everything') || q.includes('dossier')
    );

    if (!isSpecialLifecycleIntent && targetAppt) {
      const details = getPaymentVerificationDetails(targetAppt);
      let payDesc = '';
      if (details.isFullyVerified) {
        payDesc = details.isDowngraded && details.overpayChange > 0
          ? `Verified ✓ (${details.overpayChange} ETB change ${details.isShopRefundHandedOver ? 'returned ✓' : 'due at shop'})`
          : `Verified ✓ (via ${details.paymentMethod})`;
      } else if (details.isPartiallyVerified) {
        payDesc = `Original Verified (${details.origPrice} ETB), Additional Pending (+${details.addPrice} ETB)`;
      } else if (details.isUpgraded && !details.isOrigVerified) {
        payDesc = `UNVERIFIED — 0 ETB Paid, +${details.addPrice} ETB Additional Submitted, +${details.remainingDue} ETB Due (Click "Verify All")`;
      } else if (details.isDowngraded && details.overpayChange > 0) {
        payDesc = `Verification Pending (${details.origPrice} ETB receipt submitted — ${details.isShopRefundHandedOver ? `${details.overpayChange} ETB change returned ✓` : `Return ${details.overpayChange} ETB cash change at shop`})`;
      } else {
        payDesc = `Verification Pending (via ${details.paymentMethod})`;
      }

      const upgradeHeader = details.isUpgraded 
        ? ` (Upgraded from ${targetAppt.originalServiceName || 'Original Service'} ${details.origPrice} ETB)` 
        : (details.isDowngraded && details.overpayChange > 0 ? ` (Changed from ${targetAppt.originalServiceName || 'Original Service'} ${details.origPrice} ETB — ${details.isShopRefundHandedOver ? `${details.overpayChange} ETB change returned ✓` : `Return ${details.overpayChange} ETB change at shop`})` : '');

      return {
        text: `👤 **${custName}'s Appointment**:\n\n📅 **Date & Time**: ${dateStr} — ${timeStr}\n✂️ **Service**: **${sName}** (${price} ETB)${upgradeHeader}\n💈 **Barber**: **${bName}**\n💰 **Price**: ${price} ETB (Paid so far: ${details.actualPaid} ETB${details.remainingDue > 0 ? `, Remaining Due: ${details.remainingDue} ETB` : ''})\n💳 **Payment**: ${payDesc}\n📋 **Reference**: ${refCode}\n📌 **Status**: ${apptStatus}`,
        cardType: 'booking_card',
        cardData: targetAppt,
        suggestions: [
          { label: "Was payment verified?", prompt: `Was ${custName}'s payment verified?` },
          { label: "Is he in chair?", prompt: `Is ${custName} in the chair?` },
          { label: "Customer Phone", prompt: `What is ${custName}'s phone number?` }
        ]
      };
    }
  }

  // Multi-match disambiguation for candidate name
  if (isExplicitCustomerMatch && matchedCustomerProfiles.length > 1 && !isBarberPerformanceKeyword) {
    const names = matchedCustomerProfiles.map(p => `• **${p.customerName}** (${p.customerPhone || 'No phone'})`).join('\n');
    return {
      text: `🔍 I found **${matchedCustomerProfiles.length}** customers matching "${candidateName}":\n\n${names}\n\nPlease specify the customer's full name or phone number.`,
      cardType: 'clarification',
      cardData: matchedCustomerProfiles,
      suggestions: matchedCustomerProfiles.map(p => ({
        label: `${p.customerName}${p.customerPhone ? ' (' + p.customerPhone + ')' : ''}`,
        prompt: `__SELECT_CUSTOMER__:${p.customerId || p.customerPhone || p.customerName}`,
        action: 'select_customer',
        customerId: p.customerId || p.customerPhone || p.customerName,
        customerPhone: p.customerPhone,
        customerName: p.customerName
      }))
    };
  }
  
  // ── [PRIORITY 1.6] ACTIVE CUSTOMER MULTI-TURN CONTEXT FOLLOW-UP HANDLER ─
  const hasActiveCustomer = !!currentStaffContext.activeCustomer;
  const isGeneralWhoQuery = (
    q.startsWith('who is in') || q.startsWith('who is currently') || q.startsWith('who are in') ||
    q.startsWith('who did') || q.startsWith('who completed') || q.startsWith('who cancelled') ||
    q.startsWith('who booked') || q.startsWith('who has') || q.startsWith('who is coming') ||
    q.startsWith('which barber') || q.startsWith('which refunds') || q.startsWith('which appointments')
  );

  const isCustomerSpecificFollowUp = hasActiveCustomer && !isExplicitCustomerMatch && !isBarberPerformanceKeyword && !matchedBarber && !isGeneralWhoQuery && (
    (q.startsWith('what') && (q.includes('phone') || q.includes('service') || q.includes('haircut') || q.includes('price') || q.includes('cost') || q.includes('time') || q.includes('date') || q.includes('status'))) ||
    (q.startsWith('who') && (q.includes('barber') || q.includes('cut') || q.includes('served') || q.includes('stylist'))) ||
    (q.startsWith('was') && (q.includes('pay') || q.includes('verified') || q.includes('complete') || q.includes('done') || q.includes('finish') || q.includes('cancel') || q.includes('chair') || q.includes('it'))) ||
    (q.startsWith('when') && (q.includes('was') || q.includes('is') || q.includes('it') || q.includes('appointment') || q.includes('booking') || q === 'when')) ||
    (q.startsWith('is') && (q.includes('he') || q.includes('she') || q.includes('chair') || q.includes('paid') || q.includes('verified') || q.includes('completed') || q.includes('done') || q.includes('cancelled'))) ||
    (q.startsWith('did') && (q.includes('he') || q.includes('she') || q.includes('pay') || q.includes('complete') || q.includes('finish') || q.includes('cancel') || q.includes('choose') || q.includes('get'))) ||
    (q.startsWith('how') && (q.includes('much') || q.includes('many times') || q.includes('often'))) ||
    q === 'phone' || q === 'service' || q === 'barber' || q === 'payment' || q === 'when' || q === 'price' || q === 'cost' || q === 'chair' || q === 'status' || q === 'completed' || q === 'paid'
  );

  if (isCustomerSpecificFollowUp) {
    const cust = currentStaffContext.activeCustomer;
    const targetAppt = currentStaffContext.activeAppointment || cust.latestAppointment || (cust.allAppointments && cust.allAppointments[0]);
    const custName = cust.customerName;
    const dateStr = targetAppt ? (formatAppointmentRelativeDate(targetAppt.dateStr, refDate) || targetAppt.dateStr) : 'N/A';
    const timeStr = targetAppt ? (targetAppt.timeDisplay || targetAppt.startTime || 'Scheduled Time') : 'N/A';
    const sName = targetAppt?.serviceName || cust.mostRequestedService || 'Grooming Service';
    const bName = targetAppt?.barberName || (MOCK_BARBERS.find(b => b.id === targetAppt?.barberId)?.name) || cust.favoriteBarber || 'Barber';
    const price = targetAppt?.price || targetAppt?.amountPaid || 0;
    const payStatus = targetAppt?.paymentStatus || 'Verification Pending';
    const payMethod = (targetAppt?.paymentMethod || 'Direct').toUpperCase();
    const apptStatus = targetAppt?.status || targetAppt?.bookingStatus || 'Confirmed';

    // A. Phone follow-up (e.g. "what phone?", "phone?", "what is his phone?")
    if (q.includes('phone') || q.includes('number') || q.includes('contact') || q.includes('call')) {
      return {
        text: `📱 **${custName}**'s phone number is **${cust.customerPhone || 'Not recorded'}**.`,
        cardType: 'customer_profile',
        cardData: cust,
        suggestions: [
          { label: "What service?", prompt: "what service did he get?" },
          { label: "Was payment verified?", prompt: "was his payment verified?" },
          { label: "Who was his barber?", prompt: "who was his barber?" }
        ]
      };
    }

    // B. Service follow-up (e.g. "what service?", "service?", "what did he get?")
    if (q.includes('service') || q.includes('haircut') || q.includes('cut') || q.includes('treatment') || q.includes('choose') || q.includes('chose')) {
      return {
        text: `✂️ **${custName}** chose **${sName}** (${price} ETB) with **${bName}** on **${dateStr}** at **${timeStr}** (${apptStatus} · ${payStatus}).`,
        cardType: 'booking_card',
        cardData: targetAppt,
        suggestions: [
          { label: "What phone?", prompt: "what is his phone?" },
          { label: "Was payment verified?", prompt: "was his payment verified?" },
          { label: "Who was his barber?", prompt: "who was his barber?" }
        ]
      };
    }

    // C. Payment follow-up (e.g. "was payment verified?", "was it paid?", "did he pay?", "how much?")
    if (q.includes('payment') || q.includes('paid') || q.includes('pay') || q.includes('verified') || q.includes('cost') || q.includes('price') || q.includes('how much') || q.includes('receipt')) {
      const details = getPaymentVerificationDetails(targetAppt);
      let statusText = '';
      if (details.isFullyVerified) {
        statusText = `✅ **Yes** — **${custName}**'s payment of **${details.price} ETB** was **Fully Verified ✓** via ${details.paymentMethod}.`;
      } else if (details.isPartiallyVerified) {
        statusText = `⏳ **Partially Verified** — **${custName}**'s original payment of **${details.origPrice} ETB** is **Verified ✓**, but the additional **+${details.addPrice} ETB** is **Pending Verification** (${details.isAddSubmitted ? 'Additional receipt attached' : 'Pending submission'}).`;
      } else if (details.isUpgraded && !details.isOrigVerified) {
        statusText = `⏳ **No** — **${custName}**'s payment for **${details.price} ETB** is **UNVERIFIED** (0 ETB verified paid so far, +${details.addPrice} ETB additional receipt submitted, +${details.remainingDue} ETB balance due). Staff can click **"Verify All (${details.price} ETB)"** on the dashboard.`;
      } else {
        statusText = `⏳ **No** — **${custName}**'s payment of **${details.price} ETB** for **${sName}** is currently **Verification Pending** (awaiting staff review via the "Verify Payment" button).`;
      }

      return {
        text: statusText,
        cardType: 'booking_card',
        cardData: targetAppt,
        suggestions: [
          { label: "What service?", prompt: "what service did he get?" },
          { label: "What phone?", prompt: "what is his phone?" },
          { label: "Who was his barber?", prompt: "who was his barber?" }
        ]
      };
    }

    // D. Barber follow-up (e.g. "who was his barber?", "barber?", "who cut his hair?")
    if (q.includes('barber') || (q.startsWith('who') && (q.includes('cut') || q.includes('served') || q.includes('barber')))) {
      return {
        text: `💈 **${custName}**'s barber was **${bName}** for **${sName}** on **${dateStr}** at **${timeStr}**.`,
        cardType: 'booking_card',
        cardData: targetAppt,
        suggestions: [
          { label: "What service?", prompt: "what service did he get?" },
          { label: "Was payment verified?", prompt: "was his payment verified?" },
          { label: "What phone?", prompt: "what is his phone?" }
        ]
      };
    }

    // E. Date & Time follow-up (e.g. "when was it?", "when is it?", "what time?", "when?")
    if (q.includes('when') || q.includes('time') || q.includes('date')) {
      return {
        text: `📅 **${custName}**'s appointment was scheduled for **${dateStr}** from **${timeStr}** with **${bName}** (${sName} · ${price} ETB · ${apptStatus}).`,
        cardType: 'booking_card',
        cardData: targetAppt,
        suggestions: [
          { label: "What service?", prompt: "what service did he get?" },
          { label: "Was payment verified?", prompt: "was his payment verified?" },
          { label: "What phone?", prompt: "what is his phone?" }
        ]
      };
    }

    // F. Completion follow-up (e.g. "did he complete?", "is he completed?", "finished?")
    if (q.includes('complete') || q.includes('finish') || q.includes('done')) {
      const isDone = apptStatus === 'Completed';
      const text = isDone
        ? `✅ **Yes** — **${custName}**'s appointment for **${sName}** with **${bName}** was **Completed** on **${dateStr}** at **${timeStr}**.`
        : `⏳ No — **${custName}** is currently ${apptStatus === 'In-Chair' || apptStatus === 'In Chair' ? '**in the chair**' : `**${apptStatus}**`} (not completed yet).`;

      return {
        text,
        cardType: 'booking_card',
        cardData: targetAppt,
        suggestions: [
          { label: "What service?", prompt: "what service did he get?" },
          { label: "Was payment verified?", prompt: "was his payment verified?" }
        ]
      };
    }

    // G. Chair status follow-up (e.g. "is he in chair?", "where is he now?")
    if (q.includes('chair') || q.includes('where') || q.includes('now')) {
      const inChair = apptStatus === 'In-Chair' || apptStatus === 'In Chair';
      const text = inChair
        ? `💈 **Yes** — **${custName}** is **currently in the chair** getting **${sName}** with **${bName}**.`
        : `No — **${custName}** is currently **${apptStatus}** with **${bName}**, not in the chair yet.`;

      return {
        text,
        cardType: 'booking_card',
        cardData: targetAppt,
        suggestions: [
          { label: "What service?", prompt: "what service did he get?" },
          { label: "Was payment verified?", prompt: "was his payment verified?" }
        ]
      };
    }
  }

  // ── [PRIORITY 2] "TELL ME EVERYTHING" / FULL CUSTOMER DOSSIER INTENT ──
  const isEverythingQuery = (
    q.includes('everything about') ||
    q.includes('all details about') ||
    q.includes('tell me everything') ||
    q.includes('all about') ||
    q.includes('full details') ||
    q.includes('dossier') ||
    (resolvedCustomer && (q === 'everything' || q === 'details' || q === 'all details' || q === 'profile'))
  );

  if (isEverythingQuery && resolvedCustomer) {
    currentStaffContext.activeCustomer = resolvedCustomer;
    currentStaffContext.activeAppointment = resolvedAppt;

    const dossierText = formatCustomerFullDossier(resolvedCustomer, resolvedAppt);
    return {
      text: dossierText,
      cardType: 'customer_profile',
      cardData: resolvedCustomer,
      suggestions: [
        { label: "Is he in chair?", prompt: "Is he in the chair?" },
        { label: "Was payment verified?", prompt: "Was his payment verified?" },
        { label: "Booking History", prompt: `Show all appointments for ${resolvedCustomer.customerName}` }
      ]
    };
  }

  // ── [PRIORITY 3] "IN-CHAIR" / CHAIR STATUS INTENT ─────────────────────
  const isInChairKeyword = (
    q.includes('chair') ||
    q.includes('chare') ||
    q.includes('char') ||
    q.includes('getting haircut') ||
    q.includes('getting his haircut') ||
    q.includes('getting her haircut') ||
    q.includes('being served') ||
    q.includes('getting cut') ||
    (matchedBarber && (q.includes('serving') || q.includes('chair'))) ||
    (currentStaffContext.activeCustomer && (q === 'in chair?' || q === 'is he in chair?' || q === 'is he in chair' || q === 'chair' || q === 'in chair'))
  );

  if (isInChairKeyword) {
    // A. Specific Customer In-Chair Question
    const hasCustomerPronoun = tokens.includes('he') || tokens.includes('she') || tokens.includes('his') || tokens.includes('her') || tokens.includes('him');
    const isCustomerChairQuery = (isExplicitCustomerMatch || (currentStaffContext.activeCustomer && (hasCustomerPronoun || q.includes(currentStaffContext.activeCustomer.customerName.toLowerCase()))));
    
    if (resolvedCustomer && isCustomerChairQuery && !q.startsWith('who')) {
      currentStaffContext.activeCustomer = resolvedCustomer;
      currentStaffContext.activeAppointment = resolvedAppt;

      const appt = resolvedAppt;
      const custName = resolvedCustomer.customerName;
      const bName = appt?.barberName || (MOCK_BARBERS.find(b => b.id === appt?.barberId)?.name) || 'his barber';

      if (appt?.status === 'In-Chair' || appt?.bookingStatus === 'In-Chair') {
        return {
          text: `✂️ **Yes** — **${custName}** is currently **in the chair** with **${bName}** receiving **${appt?.serviceName || 'haircut styling'}** (scheduled ${appt?.timeDisplay || appt?.startTime}).`,
          cardType: 'booking_card',
          cardData: appt,
          suggestions: [
            { label: "Payment Status", prompt: `Was ${custName}'s payment verified?` },
            { label: "Contact Phone", prompt: `What is ${custName}'s phone number?` }
          ]
        };
      }

      if (appt?.status === 'Completed' || appt?.bookingStatus === 'Completed') {
        return {
          text: `No — **${custName}** is not in the chair. His appointment for **${appt?.serviceName}** with **${bName}** has already been marked **Completed**.`,
          cardType: 'booking_card',
          cardData: appt,
          suggestions: [
            { label: "How much did he pay?", prompt: `How much did ${custName} pay?` },
            { label: "Lifetime Visits", prompt: `How many times has ${custName} visited?` }
          ]
        };
      }

      if (appt?.status?.includes('Cancelled') || appt?.bookingStatus?.includes('Cancelled')) {
        return {
          text: `No — **${custName}** is not in the chair. His appointment was **Customer Cancelled** (Refund Status: **${appt?.refundStatus || 'Pending'}**).`,
          cardType: 'booking_card',
          cardData: appt,
          suggestions: [
            { label: "Refund Status", prompt: `Is ${custName}'s refund pending?` },
            { label: "Today's Schedule", prompt: "today appointment?" }
          ]
        };
      }

      return {
        text: `No — **${custName}** is currently **${appt?.status || 'Confirmed'}** for **${formatAppointmentRelativeDate(appt?.dateStr) || appt?.dateStr || 'today'}** at **${appt?.timeDisplay || appt?.startTime || 'scheduled time'}** with **${bName}** (Waiting / Ready), not in the chair yet.`,
        cardType: 'booking_card',
        cardData: appt,
        suggestions: [
          { label: "Was payment verified?", prompt: `Was ${custName}'s payment verified?` },
          { label: "View Appointment", prompt: `Show me ${custName}` }
        ]
      };
    }

    // B. Specific Barber Chair Question (e.g. "Who is in Abebe's chair?" / "Who is Abebe serving?")
    if (matchedBarber) {
      const allAppts = getAuthoritativeAppointments();
      const inChairForBarber = allAppts.find(a => 
        (a.barberId === matchedBarber.id || (a.barberName && a.barberName.toLowerCase().includes(matchedBarber.name.toLowerCase()))) &&
        (a.status === 'In-Chair' || a.bookingStatus === 'In-Chair')
      );

      if (inChairForBarber) {
        return {
          text: `💈 **${matchedBarber.name}** is currently serving **${inChairForBarber.customerName}** (**${inChairForBarber.serviceName}**, scheduled ${inChairForBarber.timeDisplay || inChairForBarber.startTime} · ${inChairForBarber.paymentStatus}).`,
          cardType: 'booking_card',
          cardData: inChairForBarber,
          suggestions: [
            { label: "Payment Status", prompt: `Was ${inChairForBarber.customerName}'s payment verified?` },
            { label: "Today's Schedule", prompt: `${matchedBarber.name} appointments today?` }
          ]
        };
      }

      return {
        text: `💈 **${matchedBarber.name}** currently has no customer in his chair (0 active in chair).`,
        cardType: 'appointments_list',
        cardData: [],
        suggestions: [
          { label: "Today's Schedule", prompt: "today appointment?" },
          { label: `${matchedBarber.name}'s Schedule`, prompt: `Who booked with ${matchedBarber.name}?` }
        ]
      };
    }

    // C. General Shop In-Chair Question (e.g. "Who is currently in chair?" / "Who in chair?")
    const allAppts = getAuthoritativeAppointments();
    const inChairList = allAppts.filter(a => a.status === 'In-Chair' || a.bookingStatus === 'In-Chair');

    if (inChairList.length === 0) {
      return {
        text: `💺 There are currently **0 customers** in the chair across all 8 barber stations.`,
        cardType: 'appointments_list',
        cardData: [],
        suggestions: [
          { label: "Today's Schedule", prompt: "today appointment?" },
          { label: "Who is coming today?", prompt: "who is coming today?" }
        ]
      };
    }

    const listSummary = inChairList.map(a => `• **${a.customerName}** with **${a.barberName}** — ${a.serviceName} (${a.timeDisplay || a.startTime} · ${a.paymentStatus})`).join('\n');
    return {
      text: `💺 There ${inChairList.length === 1 ? 'is' : 'are'} currently **${inChairList.length}** customer${inChairList.length === 1 ? '' : 's'} **active in chair**:\n\n${listSummary}`,
      cardType: 'appointments_list',
      cardData: inChairList,
      suggestions: [
        { label: "Today's Revenue", prompt: "How much did we make today?" },
        { label: "Daily Briefing", prompt: "Give me today's briefing" }
      ]
    };
  }

  // ── [PRIORITY 4] "COMPLETED" / FINISHED CUSTOMERS INTENT ─────────────
  const isCompletedKeyword = (
    !q.includes('refund') &&
    !isBarberPerformanceKeyword && (
      q.includes('completed') || 
      q.includes('complete') || 
      q.includes('complted') || 
      q.includes('finished') || 
      q.includes('finish') || 
      q.includes('finishd') || 
      q.includes('how many customers have we served') || 
      (resolvedCustomer && (q.includes('did he complete') || q.includes('did she complete') || q.includes('was he completed') || q.includes('was she completed') || q.includes('completed?') || q === 'completed' || q === 'did he finish' || q === 'finished'))
    )
  );

  if (isCompletedKeyword) {
    // A. Specific Customer Completion Inquiry
    const hasCustomerPronoun = tokens.includes('he') || tokens.includes('she') || tokens.includes('his') || tokens.includes('her') || tokens.includes('him');
    const isCustomerCompletedQuery = (isExplicitCustomerMatch || (currentStaffContext.activeCustomer && (hasCustomerPronoun || q.includes(currentStaffContext.activeCustomer.customerName.toLowerCase()))));

    if (resolvedCustomer && isCustomerCompletedQuery && !q.startsWith('who')) {
      currentStaffContext.activeCustomer = resolvedCustomer;
      currentStaffContext.activeAppointment = resolvedAppt;

      const appt = resolvedAppt;
      const custName = resolvedCustomer.customerName;
      const isCurrentApptCompleted = appt?.status === 'Completed' || appt?.bookingStatus === 'Completed';
      const completedAppt = isCurrentApptCompleted 
        ? appt 
        : (!resolvedCustomer.activeAppointments?.length ? resolvedCustomer.allAppointments?.find(a => a.status === 'Completed' || a.bookingStatus === 'Completed') : null);

      if (completedAppt) {
        return {
          text: `✅ **Yes** — **${custName}** completed his appointment for **${completedAppt.serviceName}** with **${completedAppt.barberName}** on **${formatAppointmentRelativeDate(completedAppt.dateStr) || completedAppt.dateStr}** at **${completedAppt.timeDisplay || completedAppt.startTime}** (${completedAppt.price} ETB · ${completedAppt.paymentStatus}).`,
          cardType: 'booking_card',
          cardData: completedAppt,
          suggestions: [
            { label: "How much did he pay?", prompt: `How much did ${custName} pay?` },
            { label: "Lifetime Visits", prompt: `How many times has ${custName} visited?` }
          ]
        };
      }

      if (appt?.status === 'In-Chair' || appt?.bookingStatus === 'In-Chair') {
        return {
          text: `No — **${custName}** has not completed yet. He is currently **in the chair** with **${appt.barberName}** receiving **${appt.serviceName}**.`,
          cardType: 'booking_card',
          cardData: appt,
          suggestions: [
            { label: "Payment Status", prompt: `Was ${custName}'s payment verified?` }
          ]
        };
      }

      if (appt?.status?.includes('Cancelled') || appt?.bookingStatus?.includes('Cancelled')) {
        return {
          text: `No — **${custName}** did not complete. His appointment was **Customer Cancelled**.`,
          cardType: 'booking_card',
          cardData: appt,
          suggestions: [
            { label: "Refund Status", prompt: `Is ${custName}'s refund pending?` }
          ]
        };
      }

      return {
        text: `No — **${custName}** has not completed yet. His booking is **Confirmed** for **${formatAppointmentRelativeDate(appt?.dateStr) || appt?.dateStr}** at **${appt?.timeDisplay || appt?.startTime}** with **${appt?.barberName}** (Waiting / Ready).`,
        cardType: 'booking_card',
        cardData: appt,
        suggestions: [
          { label: "Was payment verified?", prompt: `Was ${custName}'s payment verified?` }
        ]
      };
    }

    // B. Barber Specific Completion Inquiry (e.g. "Who did Abebe complete today?")
    if (matchedBarber) {
      const stats = calculateStaffMetrics(timeframe.period, null, refDate);
      const barberCompleted = stats.appointments.filter(a => 
        (a.barberId === matchedBarber.id || (a.barberName && a.barberName.toLowerCase().includes(matchedBarber.name.toLowerCase()))) &&
        (a.status === 'Completed' || a.bookingStatus === 'Completed')
      );

      if (barberCompleted.length === 0) {
        return {
          text: `💈 **${matchedBarber.name}** has completed **0 appointments** ${timeframe.label}.`,
          cardType: 'appointments_list',
          cardData: [],
          suggestions: [
            { label: `${matchedBarber.name}'s Schedule`, prompt: `${matchedBarber.name} appointments today?` },
            { label: "Today's Schedule", prompt: "today appointment?" }
          ]
        };
      }

      const listSummary = barberCompleted.map(a => `• **${a.customerName}** — ${a.serviceName} (${a.timeDisplay || a.startTime} · ${a.price} ETB · ${a.paymentStatus})`).join('\n');
      return {
        text: `💈 **${matchedBarber.name}** has completed **${barberCompleted.length}** appointment${barberCompleted.length === 1 ? '' : 's'} ${timeframe.label}:\n\n${listSummary}`,
        cardType: 'appointments_list',
        cardData: barberCompleted,
        suggestions: [
          { label: "How much did he make?", prompt: `How much did ${matchedBarber.name} make today?` },
          { label: "All Completed", prompt: "who completed today?" }
        ]
      };
    }

    // C. General Completed Inquiry (e.g. "Who completed today?" / "Who completed their haircut today?")
    const stats = calculateStaffMetrics(timeframe.period, null, refDate);
    const completedList = stats.appointments.filter(a => a.status === 'Completed' || a.bookingStatus === 'Completed');

    if (completedList.length === 0) {
      return {
        text: `There are **0 completed appointments** recorded for ${timeframe.label}.`,
        cardType: 'appointments_list',
        cardData: [],
        suggestions: [
          { label: "Today's Schedule", prompt: "today appointment?" },
          { label: "Today's Briefing", prompt: "Give me today's briefing" }
        ]
      };
    }

    const listSummary = completedList.map(a => `• **${a.customerName}** with **${a.barberName}** — ${a.serviceName} (${a.price} ETB · ${a.paymentStatus})`).join('\n');
    return {
      text: `✅ **${completedList.length}** customer${completedList.length === 1 ? '' : 's'} completed ${completedList.length === 1 ? 'their haircut' : 'their appointments'} ${timeframe.label}:\n\n${listSummary}`,
      cardType: 'appointments_list',
      cardData: completedList,
      suggestions: [
        { label: "Today's Revenue", prompt: "How much did we make today?" },
        { label: "Top Barber", prompt: "Who is our top barber this month?" }
      ]
    };
  }

  // ── [PRIORITY 4.5] CASH CHANGE & SERVICE DOWNGRADE INTENT ─────────────
  const isCashChangeKeyword = (
    q.includes('change') ||
    q.includes('return money') ||
    q.includes('return cash') ||
    q.includes('cash change') ||
    q.includes('handed over') ||
    q.includes('hand over') ||
    q.includes('give change') ||
    q.includes('gave change') ||
    q.includes('returned') ||
    (q.includes('return') && (q.includes('birr') || q.includes('etb') || q.includes('100') || q.includes('cash') || q.includes('money')))
  );

  if (isCashChangeKeyword && !q.includes('chair') && !q.includes('complete')) {
    const allAppts = getAuthoritativeAppointments();

    // A. Specific Customer Change Query
    const hasCustomerPronoun = tokens.includes('he') || tokens.includes('she') || tokens.includes('his') || tokens.includes('her') || tokens.includes('him');
    const isCustomerChangeQuery = isExplicitCustomerMatch || (currentStaffContext.activeCustomer && (hasCustomerPronoun || q.includes(currentStaffContext.activeCustomer.customerName.toLowerCase())));

    if (resolvedCustomer && isCustomerChangeQuery && !q.startsWith('who')) {
      currentStaffContext.activeCustomer = resolvedCustomer;
      currentStaffContext.activeAppointment = resolvedAppt;
      const custName = resolvedCustomer.customerName;

      // Find downgraded appointment for this customer
      const changeAppt = resolvedCustomer.activeAppointments?.find(a => 
        a.adjustmentType === 'downgrade_refund_at_shop' || 
        (a.overpaymentAmount > 0) || 
        (a.originalPrice && Number(a.originalPrice) > Number(a.price))
      ) || resolvedCustomer.allAppointments?.find(a => 
        a.adjustmentType === 'downgrade_refund_at_shop' || 
        (a.overpaymentAmount > 0) || 
        (a.originalPrice && Number(a.originalPrice) > Number(a.price))
      );

      if (changeAppt) {
        const changeAmt = changeAppt.overpaymentAmount || (Number(changeAppt.originalPrice) - Number(changeAppt.price));
        const isHandedOver = Boolean(changeAppt.shopRefundHandedOver);

        return {
          text: isHandedOver
            ? `✅ **Yes** — **${custName}**'s **${changeAmt} ETB** cash change has already been **Handed Over ✓** at the shop (marked returned by staff).`
            : `❌ **No** — **${custName}** has not received his **${changeAmt} ETB** cash change yet (Status: **Pending Return ❌**). Please remember to hand him **${changeAmt} ETB in cash** when he arrives for his haircut at the front desk.`,
          cardType: 'booking_card',
          cardData: changeAppt,
          suggestions: [
            { label: "View Appointment", prompt: `Show me ${custName}` },
            { label: "Was payment verified?", prompt: `Was ${custName}'s payment verified?` }
          ]
        };
      }

      const currentAppt = resolvedCustomer.activeAppointments?.[0] || resolvedCustomer.latestAppointment;
      return {
        text: `ℹ️ **${custName}** does not have any cash change due. He booked **${currentAppt?.serviceName || 'Service'}** (${currentAppt?.price || 0} ETB · ${currentAppt?.paymentStatus || 'Confirmed'}).`,
        cardType: 'booking_card',
        cardData: currentAppt,
        suggestions: [
          { label: "Appointment Details", prompt: `Show me ${custName}` },
          { label: "Who is owed change?", prompt: "who is still owed change?" }
        ]
      };
    }

    // B. General Cash Change List (e.g. "who is still owed change?", "who needs change?", "unreturned change list")
    if (q.includes('who') || q.includes('list') || q.includes('pending') || q.includes('still') || q.includes('owe') || q.includes('status') || q === 'change' || q === 'cash change') {
      const pendingChangeList = allAppts.filter(a =>
        (a.adjustmentType === 'downgrade_refund_at_shop' || (a.overpaymentAmount > 0) || (a.originalPrice && Number(a.originalPrice) > Number(a.price))) &&
        !a.shopRefundHandedOver
      );

      if (pendingChangeList.length === 0) {
        return {
          text: `✅ There are currently **0 customers waiting for cash change**. All change from service downgrades has been handed over!`,
          cardType: 'appointments_list',
          cardData: [],
          suggestions: [
            { label: "Today's Schedule", prompt: "today appointment?" },
            { label: "Pending Verification", prompt: "who needs review?" }
          ]
        };
      }

      const listSummary = pendingChangeList.map(a => {
        const changeAmt = a.overpaymentAmount || (Number(a.originalPrice) - Number(a.price));
        return `• **${a.customerName}** — **❌ Return ${changeAmt} ETB Change** (Changed from ${a.originalServiceName} to ${a.serviceName} · Scheduled: ${a.dateStr} at ${a.timeDisplay || a.startTime} · Ref: ${a.ref || a.bookingReference})`;
      }).join('\n');

      return {
        text: `💵 Found **${pendingChangeList.length}** customer${pendingChangeList.length === 1 ? '' : 's'} with **unreturned cash change waiting at the shop**:\n\n${listSummary}\n\n*In the admin dashboard, click the red "❌ Return Change" button on each order once you hand them the cash!*`,
        cardType: 'appointments_list',
        cardData: pendingChangeList,
        suggestions: [
          { label: "Today's Schedule", prompt: "today appointment?" },
          { label: "Pending Verification", prompt: "who needs review?" }
        ]
      };
    }
  }

  // ── [PRIORITY 5] CANCELLATION & REFUND LIFECYCLE INTENT ────────────────
  const isCancellationKeyword = (
    q.includes('cancel') || 
    q.includes('cancelled') || 
    q.includes('cancld') || 
    q.includes('canclled') || 
    q.includes('canceld') || 
    q.includes('refund') || 
    q.includes('refundd') || 
    q.includes('refnd') || 
    q.includes('credit') || 
    (resolvedCustomer && (q.includes('did he cancel') || q.includes('did she cancel') || q.includes('was his refund') || q.includes('is his refund') || q.includes('refund status') || q === 'refund?' || q === 'refund'))
  );

  if (isCancellationKeyword) {
    // A. Specific Customer Cancellation Inquiry
    const hasCustomerPronoun = tokens.includes('he') || tokens.includes('she') || tokens.includes('his') || tokens.includes('her') || tokens.includes('him');
    const isCustomerCancQuery = (isExplicitCustomerMatch || (currentStaffContext.activeCustomer && (hasCustomerPronoun || q.includes(currentStaffContext.activeCustomer.customerName.toLowerCase()))));

    if (resolvedCustomer && isCustomerCancQuery && !q.startsWith('who')) {
      currentStaffContext.activeCustomer = resolvedCustomer;
      currentStaffContext.activeAppointment = resolvedAppt;

      const custName = resolvedCustomer.customerName;
      const cancelledAppt = resolvedCustomer.allAppointments?.find(a => 
        a.status?.includes('Cancelled') || a.bookingStatus?.includes('Cancelled')
      );

      if (cancelledAppt) {
        const isRefundDone = cancelledAppt.refundStatus === 'Completed' || cancelledAppt.status === 'Cancelled — Refund Completed';
        const refundMsg = isRefundDone ? 'Refund Completed ✓' : 'Refund Pending (Requires Processing)';

        return {
          text: `🚫 **Yes** — **${custName}** cancelled booking **${cancelledAppt.ref || cancelledAppt.bookingReference}** for **${cancelledAppt.serviceName}** with **${cancelledAppt.barberName}** (scheduled for **${formatAppointmentRelativeDate(cancelledAppt.dateStr) || cancelledAppt.dateStr}** at **${cancelledAppt.timeDisplay || cancelledAppt.startTime}**). Payment was **${cancelledAppt.paymentStatus}** (${cancelledAppt.price} ETB) and Refund Status is **${refundMsg}**.`,
          cardType: 'booking_card',
          cardData: cancelledAppt,
          suggestions: [
            { label: "Was refund completed?", prompt: `Was ${custName}'s refund completed?` },
            { label: "Contact Phone", prompt: `What is ${custName}'s phone number?` }
          ]
        };
      }

      const currentAppt = resolvedCustomer.activeAppointments?.[0] || resolvedCustomer.latestAppointment;
      return {
        text: `No — **${custName}** has not cancelled any appointments. His current booking is **${currentAppt?.status || 'Confirmed'}** for **${currentAppt?.serviceName || 'Hair Cut'}** with **${currentAppt?.barberName || 'Barber'}**.`,
        cardType: 'booking_card',
        cardData: currentAppt,
        suggestions: [
          { label: "Appointment Details", prompt: `Show me ${custName}` },
          { label: "Was payment verified?", prompt: `Was ${custName}'s payment verified?` }
        ]
      };
    }

    // B.1. Refund or Credit Due Query (e.g. "Who has a refund or credit due?", "who has credit", "credit due")
    if (q.includes('credit') || q.includes('refund or credit') || (q.includes('who') && (q.includes('refund') || q.includes('credit')))) {
      const allAppts = getAuthoritativeAppointments();
      const creditDueList = allAppts.filter(a => 
        a.adjustmentType === 'refund_or_credit' || 
        a.refundStatus === 'Pending' || 
        ((a.status?.includes('Cancelled') || a.bookingStatus?.includes('Cancelled')) && a.refundStatus !== 'Completed')
      );

      if (creditDueList.length === 0) {
        return {
          text: `✅ There are currently **0 customers** with a refund or credit due.`,
          cardType: 'appointments_list',
          cardData: [],
          suggestions: [
            { label: "Today's Schedule", prompt: "today appointment?" },
            { label: "Today's Revenue", prompt: "How much did we make today?" }
          ]
        };
      }

      const listSummary = creditDueList.map(a => {
        if (a.adjustmentType === 'refund_or_credit') {
          return `• **${a.customerName}** — **${a.adjustmentAmount} ETB credit/refund due** (changed service from ${a.originalServiceName} to ${a.serviceName} · Ref: ${a.ref || a.bookingReference})`;
        }
        return `• **${a.customerName}** — **${a.price} ETB refund pending** (cancelled ${a.serviceName} · Ref: ${a.ref || a.bookingReference})`;
      }).join('\n');

      return {
        text: `💚 Found **${creditDueList.length}** customer${creditDueList.length === 1 ? '' : 's'} with a **refund or credit due**:\n\n${listSummary}`,
        cardType: 'appointments_list',
        cardData: creditDueList,
        suggestions: [
          { label: "Today's Schedule", prompt: "today appointment?" },
          { label: "Today's Revenue", prompt: "How much did we make today?" }
        ]
      };
    }

    // B.2. Refund Pending / Refund Requested Query (e.g. "Who is waiting for a refund?", "Who requested a refund?", "pending refunds", "refund requests")
    if (q.includes('request') || q.includes('pending') || q.includes('waiting') || q.includes('need') || q.includes('needs')) {
      const allAppts = getAuthoritativeAppointments();
      const pendingRefunds = allAppts.filter(a => 
        a.refundStatus === 'Refund Requested' ||
        a.refundStatus === 'Pending' || 
        ((a.status?.includes('Cancelled') || a.bookingStatus?.includes('Cancelled')) && a.refundStatus !== 'Completed' && a.refundStatus !== 'Refund Completed') ||
        (Number(a.refundAmount) > 0 && a.refundStatus !== 'Refund Completed' && a.refundStatus !== 'Completed')
      );

      if (pendingRefunds.length === 0) {
        return {
          text: `✅ There are currently **0 pending refund requests** requiring staff action.`,
          cardType: 'appointments_list',
          cardData: [],
          suggestions: [
            { label: "Today's Schedule", prompt: "today appointment?" },
            { label: "Today's Briefing", prompt: "Give me today's briefing" }
          ]
        };
      }

      const listSummary = pendingRefunds.map(a => {
        const dest = a.refundAccount ? ` to **${(a.refundMethod || 'telebirr').toUpperCase()}**: \`${a.refundAccount}\`` : '';
        const amt = a.refundAmount ? `${a.refundAmount} ETB (75%)` : `${a.price} ETB`;
        return `• **${a.customerName}** — Refund: **${amt}**${dest} (${a.serviceName} · Ref: ${a.ref || a.bookingReference})`;
      }).join('\n');

      return {
        text: `⏳ Found **${pendingRefunds.length}** appointment${pendingRefunds.length === 1 ? '' : 's'} with **pending refund requests**:\n\n${listSummary}`,
        cardType: 'appointments_list',
        cardData: pendingRefunds,
        suggestions: [
          { label: "Completed Refunds", prompt: "Which refunds were completed?" },
          { label: "Today's Schedule", prompt: "today appointment?" }
        ]
      };
    }

    // B.3. Additional Receipts Waiting for Review Query (e.g. "Who submitted additional receipt?", "additional receipts", "additional payments waiting")
    if (
      q.includes('additional receipt') ||
      q.includes('additional receipts') ||
      q.includes('additional payment') ||
      q.includes('extra receipt') ||
      q.includes('receipt waiting') ||
      q.includes('receipts waiting') ||
      (q.includes('who') && q.includes('additional'))
    ) {
      const allAppts = getAuthoritativeAppointments();
      const waitingAdditional = allAppts.filter(a =>
        a.additionalPaymentStatus === 'Pending Verification' ||
        (Number(a.additionalSubmittedAmount) > 0 && a.additionalPaymentStatus !== 'Verified')
      );

      if (waitingAdditional.length === 0) {
        return {
          text: `✅ There are currently **0 bookings with additional receipts waiting for review**.`,
          cardType: 'appointments_list',
          cardData: [],
          suggestions: [
            { label: "Today's Schedule", prompt: "today appointment?" },
            { label: "Pending Refunds", prompt: "Who requested a refund?" }
          ]
        };
      }

      const listSummary = waitingAdditional.map(a =>
        `• **${a.customerName}** — **+${a.additionalSubmittedAmount || a.remainingAmount} ETB submitted** (Changed to ${a.serviceName} · Barber: ${a.barberName} · Ref: ${a.ref || a.bookingReference})`
      ).join('\n');

      return {
        text: `📑 Found **${waitingAdditional.length}** booking${waitingAdditional.length === 1 ? '' : 's'} with **additional receipts waiting for review**:\n\n${listSummary}`,
        cardType: 'appointments_list',
        cardData: waitingAdditional,
        suggestions: [
          { label: "Today's Schedule", prompt: "today appointment?" },
          { label: "Pending Refunds", prompt: "Who requested a refund?" }
        ]
      };
    }

    // C. Refund Completed Query (e.g. "Which refunds were completed?" / "Who got refund?")
    if (q.includes('completed') || q.includes('got refund') || q.includes('which refunds were completed') || q.includes('refund completed')) {
      const allAppts = getAuthoritativeAppointments();
      const completedRefunds = allAppts.filter(a => 
        a.refundStatus === 'Completed' || a.status === 'Cancelled — Refund Completed' || a.bookingStatus === 'Cancelled — Refund Completed'
      );

      if (completedRefunds.length === 0) {
        return {
          text: `There are **0 completed refunds** recorded in the system.`,
          cardType: 'appointments_list',
          cardData: [],
          suggestions: [
            { label: "Pending Refunds", prompt: "Who is waiting for a refund?" },
            { label: "Today's Schedule", prompt: "today appointment?" }
          ]
        };
      }

      const listSummary = completedRefunds.map(a => `• **${a.customerName}** — ${a.serviceName} (${a.price} ETB refunded · ${a.ref || a.bookingReference})`).join('\n');
      return {
        text: `💸 **${completedRefunds.length}** refund${completedRefunds.length === 1 ? ' was' : 's were'} **completed**:\n\n${listSummary}`,
        cardType: 'appointments_list',
        cardData: completedRefunds,
        suggestions: [
          { label: "Pending Refunds", prompt: "Who is waiting for a refund?" },
          { label: "Today's Schedule", prompt: "today appointment?" }
        ]
      };
    }

    // D. Barber Specific Cancellation Query (e.g. "Who cancelled their Abebe appointment?")
    if (matchedBarber) {
      const stats = calculateStaffMetrics(timeframe.period, null, refDate);
      const barberCancelled = stats.appointments.filter(a => 
        (a.barberId === matchedBarber.id || (a.barberName && a.barberName.toLowerCase().includes(matchedBarber.name.toLowerCase()))) &&
        (a.status?.includes('Cancelled') || a.bookingStatus?.includes('Cancelled'))
      );

      if (barberCancelled.length === 0) {
        return {
          text: `💈 **${matchedBarber.name}** has **0 cancellations** ${timeframe.label}.`,
          cardType: 'appointments_list',
          cardData: [],
          suggestions: [
            { label: `${matchedBarber.name}'s Schedule`, prompt: `${matchedBarber.name} appointments today?` },
            { label: "Today's Schedule", prompt: "today appointment?" }
          ]
        };
      }

      const listSummary = barberCancelled.map(a => `• **${a.customerName}** — ${a.serviceName} (${a.price} ETB · Refund: ${a.refundStatus || 'Pending'})`).join('\n');
      return {
        text: `🚫 **${matchedBarber.name}** had **${barberCancelled.length}** cancellation${barberCancelled.length === 1 ? '' : 's'} ${timeframe.label}:\n\n${listSummary}`,
        cardType: 'appointments_list',
        cardData: barberCancelled,
        suggestions: [
          { label: "Pending Refunds", prompt: "Who is waiting for a refund?" },
          { label: "Today's Schedule", prompt: "today appointment?" }
        ]
      };
    }

    // E. General Cancellation Query (e.g. "Who cancelled today?")
    const stats = calculateStaffMetrics(timeframe.period, null, refDate);
    const cancelledList = stats.appointments.filter(a => 
      a.status?.includes('Cancelled') || a.bookingStatus?.includes('Cancelled')
    );

    if (cancelledList.length === 0) {
      return {
        text: `There are **0 cancelled appointments** recorded for ${timeframe.label}.`,
        cardType: 'appointments_list',
        cardData: [],
        suggestions: [
          { label: "Today's Schedule", prompt: "today appointment?" },
          { label: "Today's Briefing", prompt: "Give me today's briefing" }
        ]
      };
    }

    const listSummary = cancelledList.map(a => `• **${a.customerName}** — ${a.serviceName} (${a.timeDisplay || a.startTime} · Refund: ${a.refundStatus || 'Pending'})`).join('\n');
    return {
      text: `🚫 **${cancelledList.length}** appointment${cancelledList.length === 1 ? ' was' : 's were'} cancelled ${timeframe.label}:\n\n${listSummary}`,
      cardType: 'cancellations',
      cardData: cancelledList,
      suggestions: [
        { label: "Pending Refunds", prompt: "Who is waiting for a refund?" },
        { label: "Today's Schedule", prompt: "today appointment?" }
      ]
    };
  }

  // ── [PRIORITY 6] MULTI-TURN CUSTOMER CONTEXT FOLLOW-UP ────────────────
  const isCustomerContextFollowUp = (
    (currentStaffContext.activeCustomer || currentStaffContext.activeAppointment) && (
      q.includes('what did he') ||
      q.includes('what did she') ||
      q.includes('which did he') ||
      q.includes('which did she') ||
      q.includes('what did they') ||
      q.includes('what service did he') ||
      q.includes('what service did she') ||
      q.includes('service did he') ||
      q.includes('service did she') ||
      q.includes('who was he') ||
      q.includes('who was that') ||
      q.includes('who is he') ||
      q.includes('was he paid') ||
      q.includes('was she paid') ||
      q.includes('was it paid') ||
      q.includes('was his payment') ||
      q.includes('was her payment') ||
      q.includes('is his payment') ||
      q.includes('is it verified') ||
      q.includes('who was his barber') ||
      q.includes('who was her barber') ||
      q.includes('who is his barber') ||
      q.includes('who is her barber') ||
      q.includes('how much did he') ||
      q.includes('how much did she') ||
      q.includes('how much was his') ||
      q.includes('how much is his') ||
      q.includes('what is his phone') ||
      q.includes('what is her phone') ||
      q.includes('his phone') ||
      q.includes('her phone') ||
      q.includes('payment method') ||
      q.includes('what did he book last time') ||
      q.includes('what did he book before') ||
      q.includes('previous haircut') ||
      q.includes('previous service') ||
      q.includes('did he change') ||
      q.includes('did she change') ||
      q.includes('original service') ||
      q.includes('new service') ||
      q.includes('current service') ||
      q.includes('how much does he owe') ||
      q.includes('how much does she owe') ||
      q.includes('does he owe') ||
      q.includes('does she owe') ||
      q.includes('still owe') ||
      q.includes('how much has he paid') ||
      q.includes('how much has she paid') ||
      q.includes('additional payment') ||
      q.includes('current price') ||
      (q === 'phone' || q === 'phone number' || q === 'number' || q === 'what service' || q === 'which service' || q === 'how much' || q === 'payment' || q === 'payment?' || q === 'paid?' || q === 'verified?' || q === 'who was the barber' || q === 'barber')
    )
  );

  if (isCustomerContextFollowUp) {
    const cust = currentStaffContext.activeCustomer;
    const appt = currentStaffContext.activeAppointment || (cust?.latestAppointment) || (cust?.allAppointments?.[0]);

    // Balance / Owed inquiry
    if (q.includes('owe') || q.includes('owes') || q.includes('additional payment') || q.includes('still owe') || q.includes('balance')) {
      const custName = appt?.customerName || cust?.customerName || 'The customer';
      const isVerified = appt?.paymentStatus === 'Verified';
      const price = appt?.price || 0;
      const actualPaid = appt?.paidAmount !== undefined ? Number(appt.paidAmount) : (isVerified ? price : 0);
      const remainingDue = appt?.remainingAmount !== undefined ? Number(appt.remainingAmount) : (isVerified ? 0 : price);
      const sName = appt?.serviceName || 'Service';

      if (appt?.adjustmentType === 'additional_payment' && remainingDue > 0) {
        return {
          text: `💳 **${custName}** still owes an additional payment of **${remainingDue} ETB** for **${sName}** (New Total: ${price} ETB, already paid: ${actualPaid} ETB).`,
          cardType: 'booking_card',
          cardData: appt,
          suggestions: [
            { label: "Did he change service?", prompt: "Did he change his service?" },
            { label: "Verify Payment", prompt: "Was his payment verified?" }
          ]
        };
      } else if (appt?.adjustmentType === 'downgrade_refund_at_shop' || (appt?.overpaymentAmount > 0) || (appt?.originalPrice && Number(appt.originalPrice) > Number(appt.price))) {
        const changeAmt = appt.overpaymentAmount || (Number(appt.originalPrice) - Number(appt.price));
        const isHandedOver = Boolean(appt.shopRefundHandedOver);
        return {
          text: isHandedOver
            ? `💚 **${custName}** does not owe anything! He changed to a cheaper service: **${sName}** (${price} ETB, down from ${appt.originalPrice || price} ETB), and his **${changeAmt} ETB** cash change was already **Handed Over ✓** at the shop.`
            : `💚 **${custName}** does not owe anything! He changed to a cheaper service: **${sName}** (${price} ETB, down from ${appt.originalPrice || price} ETB). He is due **${changeAmt} ETB cash change** back in person when he arrives for his haircut (Status: ❌ **Not handed over yet**).`,
          cardType: 'booking_card',
          cardData: appt,
          suggestions: [
            { label: "Was change returned?", prompt: `Did we return ${custName}'s change?` },
            { label: "Original Service", prompt: "What was the original service?" }
          ]
        };
      } else if (appt?.adjustmentType === 'refund_or_credit') {
        return {
          text: `💚 **${custName}** does not owe anything! He has a **refund/credit of ${appt.adjustmentAmount} ETB** due because he changed from **${appt.originalServiceName}** (${appt.originalPrice} ETB) to **${sName}** (${price} ETB).`,
          cardType: 'booking_card',
          cardData: appt,
          suggestions: [
            { label: "Original Service", prompt: "What was the original service?" },
            { label: "Phone Number", prompt: "What is his phone number?" }
          ]
        };
      } else if (isVerified) {
        return {
          text: `✅ **${custName}** does not owe anything. His payment of **${price} ETB** for **${sName}** is fully **Verified** ✓.`,
          cardType: 'booking_card',
          cardData: appt,
          suggestions: [
            { label: "Service Details", prompt: "Which service did he book?" },
            { label: "Barber Info", prompt: "Who was his barber?" }
          ]
        };
      } else {
        return {
          text: `⏳ **${custName}**'s payment of **${price} ETB** for **${sName}** is currently **Verification Pending** (owes ${price} ETB).`,
          cardType: 'booking_card',
          cardData: appt,
          suggestions: [
            { label: "Verify Payment", prompt: "Was his payment verified?" },
            { label: "Phone Number", prompt: "What is his phone number?" }
          ]
        };
      }
    }

    // Service change / Original service / Current service inquiry
    if (q.includes('change') || q.includes('original') || q.includes('new service') || q.includes('current service')) {
      const custName = appt?.customerName || cust?.customerName || 'The customer';
      const sName = appt?.serviceName || 'Service';
      const price = appt?.price || 0;

      if (q.includes('original')) {
        const origName = appt?.originalServiceName || sName;
        const origPrice = appt?.originalPrice !== undefined ? appt.originalPrice : price;
        const responseText = (origName !== sName)
          ? `✂️ The original service booked by **${custName}** was **${origName}** (${origPrice} ETB). It was updated to **${sName}** (${price} ETB).`
          : `✂️ **${custName}**'s original service is **${sName}** (${price} ETB).`;
        return {
          text: responseText,
          cardType: 'booking_card',
          cardData: appt,
          suggestions: [
            { label: "Current Service", prompt: "What is the new service?" },
            { label: "How much does he owe?", prompt: "How much does he still owe?" }
          ]
        };
      }

      if (q.includes('new service') || q.includes('current service')) {
        return {
          text: `✂️ The current service for **${custName}** is **${sName}** (${price} ETB).`,
          cardType: 'booking_card',
          cardData: appt,
          suggestions: [
            { label: "Original Service", prompt: "What was the original service?" },
            { label: "How much does he owe?", prompt: "How much does he still owe?" }
          ]
        };
      }

      const hasChanged = Boolean(appt?.originalServiceName && appt.originalServiceName !== sName) || (appt?.adjustmentType && appt.adjustmentType !== 'none');
      if (hasChanged) {
        let changeDetails = '';
        if (appt.adjustmentType === 'additional_payment') {
          changeDetails = ` An additional payment of **${appt.remainingAmount} ETB** is required.`;
        } else if (appt.adjustmentType === 'refund_or_credit') {
          changeDetails = ` He has a refund/credit of **${appt.adjustmentAmount} ETB** due.`;
        }
        return {
          text: `✂️ **Yes** — **${custName}** changed his service from **${appt.originalServiceName || 'original'}** (${appt.originalPrice} ETB) to **${sName}** (${price} ETB).${changeDetails}`,
          cardType: 'booking_card',
          cardData: appt,
          suggestions: [
            { label: "How much does he owe?", prompt: "How much does he still owe?" },
            { label: "Was payment verified?", prompt: "Was his payment verified?" }
          ]
        };
      } else {
        return {
          text: `No — **${custName}** has not changed his service. He is scheduled for **${sName}** (${price} ETB).`,
          cardType: 'booking_card',
          cardData: appt,
          suggestions: [
            { label: "Service Details", prompt: "Which service did he book?" },
            { label: "Was payment verified?", prompt: "Was his payment verified?" }
          ]
        };
      }
    }

    // Who was he / customer identity inquiry
    if (q.includes('who was he') || q.includes('who was that') || q.includes('who is he') || q.includes('who came')) {
      return {
        text: `👤 The customer was **${appt?.customerName || cust?.customerName}** (${appt?.customerPhone || cust?.customerPhone || 'No phone recorded'}).`,
        cardType: 'customer_profile',
        cardData: cust || { customerName: appt?.customerName, customerPhone: appt?.customerPhone, allAppointments: [appt] },
        suggestions: [
          { label: "What service?", prompt: "What service did he book?" },
          { label: "Was he paid?", prompt: "Was his payment verified?" }
        ]
      };
    }

    // Phone inquiry
    if (q.includes('phone') || q.includes('number')) {
      return {
        text: `📞 **${cust?.customerName || appt?.customerName}**'s registered contact phone number is **${cust?.customerPhone || appt?.customerPhone}**.`,
        cardType: 'customer_profile',
        cardData: cust || { customerName: appt?.customerName, customerPhone: appt?.customerPhone, allAppointments: [appt] },
        suggestions: [
          { label: "Service Booked", prompt: `Which service did he book?` },
          { label: "Total Spending", prompt: `How much did he spend in total?` }
        ]
      };
    }

    // Historical / past appointment inquiry (e.g. "what did he book last time?" / "what did he get last week?")
    if (q.includes('last time') || q.includes('before') || q.includes('previous') || q.includes('last week') || q.includes('last month') || q.includes('what did he get')) {
      const allPast = (cust?.allAppointments || (appt ? [appt] : [])).filter(a => a.id !== appt?.id && a.ref !== appt?.ref);
      const targetAppt = allPast[0] || cust?.allAppointments?.[1] || appt;
      const formattedDate = formatAppointmentRelativeDate(targetAppt?.dateStr) || targetAppt?.dateStr || 'past appointment';
      const bName = targetAppt?.barberName || (MOCK_BARBERS.find(b => b.id === targetAppt?.barberId)?.name) || cust?.favoriteBarber || 'Barber';
      
      return {
        text: `✂️ **${cust?.customerName || targetAppt?.customerName}**'s appointment on **${formattedDate}** was **${targetAppt?.serviceName || 'Hair Cut Only'}** with **${bName}** at **${targetAppt?.timeDisplay || targetAppt?.startTime || '10:00 AM'}**. Payment was **${targetAppt?.paymentStatus || 'Verified'}** and status was **${targetAppt?.status || 'Completed'}**.`,
        cardType: 'customer_profile',
        cardData: cust || { customerName: targetAppt?.customerName, customerPhone: targetAppt?.customerPhone, allAppointments: [targetAppt] },
        suggestions: [
          { label: "View Full History", prompt: `Show all appointments for ${cust?.customerName || targetAppt?.customerName}` },
          { label: "Contact Phone", prompt: `What is his phone number?` }
        ]
      };
    }

    // Service booked inquiry
    if (q.includes('service') || q.includes('what did he book') || q.includes('what did she book') || q.includes('what service') || q.includes('which service')) {
      return {
        text: `✂️ **${appt?.customerName || cust?.customerName}** booked **${appt?.serviceName || 'Hair Cut Only'}** with **${appt?.barberName || 'Barber'}** on **${formatAppointmentRelativeDate(appt?.dateStr) || appt?.dateStr}** at **${appt?.timeDisplay || appt?.startTime}** (${appt?.price} ETB · ${appt?.paymentStatus}).`,
        cardType: 'customer_profile',
        cardData: cust || { customerName: appt?.customerName, customerPhone: appt?.customerPhone, allAppointments: [appt] },
        suggestions: [
          { label: "Payment Status", prompt: "Was his payment verified?" },
          { label: "Barber Info", prompt: "Who is his barber?" }
        ]
      };
    }

    // Payment verification inquiry
    if (q.includes('payment') || q.includes('verified') || q.includes('paid')) {
      const isVerified = appt?.paymentStatus === 'Verified';
      const statusText = isVerified ? 'Verified ✓' : 'Verification Pending';
      return {
        text: `💳 **${appt?.customerName || cust?.customerName}**'s payment for **${appt?.serviceName || 'Service'}** is **${statusText}** via ${appt?.paymentMethod?.toUpperCase() || 'Direct Transfer'} (${appt?.price || 500} ETB).`,
        cardType: 'customer_profile',
        cardData: cust || { customerName: appt?.customerName, customerPhone: appt?.customerPhone, allAppointments: [appt] },
        suggestions: [
          { label: "What is his phone number?", prompt: "What is his phone number?" },
          { label: "Who was his barber?", prompt: "Who was his barber?" }
        ]
      };
    }

    // Price / Spending inquiry
    if (q.includes('pay') || q.includes('spend') || q.includes('much') || q.includes('spent') || q.includes('price') || q === 'how much') {
      return {
        text: `💵 **${appt?.customerName || cust?.customerName}**'s booking is **${appt?.price || 400} ETB** (${appt?.paymentStatus})${cust?.totalSpend ? `, with **${cust.totalSpend.toLocaleString()} ETB** in total completed lifetime spending` : ''}.`,
        cardType: 'customer_profile',
        cardData: cust || { customerName: appt?.customerName, customerPhone: appt?.customerPhone, allAppointments: [appt] },
        suggestions: [
          { label: "Was it verified?", prompt: "Was his payment verified?" },
          { label: "Barber Details", prompt: "Who was his barber?" }
        ]
      };
    }

    // Barber inquiry
    if (q.includes('barber')) {
      const bName = appt?.barberName || (MOCK_BARBERS.find(b => b.id === appt?.barberId)?.name) || cust?.favoriteBarber || 'Abebe';
      return {
        text: `💈 **${appt?.customerName || cust?.customerName}**'s barber for this session is **${bName}**${cust?.favoriteBarber ? ` (favorite barber across ${cust.totalCount} visits is **${cust.favoriteBarber}**)` : ''}.`,
        cardType: 'customer_profile',
        cardData: cust || { customerName: appt?.customerName, customerPhone: appt?.customerPhone, allAppointments: [appt] },
        suggestions: [
          { label: "Phone Number", prompt: `What is his phone number?` },
          { label: "Service Details", prompt: `What service did he book?` }
        ]
      };
    }
  }

  // ── [PRIORITY 7] DATE + SCHEDULE / APPOINTMENTS INTENT ────────────────
  const hasDateWord = (
    q.includes('today') ||
    q.includes('tomorrow') ||
    q.includes('yesterday') ||
    q.includes('yesrday') ||
    q.includes('yetsrday') ||
    q.includes('yest') ||
    q.includes('last 2 day') ||
    q.includes('last 2 days') ||
    q.includes('past 2 days') ||
    q.includes('last two days') ||
    q.includes('this week') ||
    q.includes('last week')
  );

  const hasScheduleWord = (
    q.includes('appointment') ||
    q.includes('appointments') ||
    q.includes('booking') ||
    q.includes('bookings') ||
    q.includes('schedule') ||
    q.includes('schedules') ||
    q.includes('who is coming') ||
    q.includes('who comes') ||
    q.includes('who came') ||
    q.includes('who was here') ||
    q.includes('who booked') ||
    q.includes('who is booked') ||
    q.includes('who had appointment') ||
    q.includes('what appointments') ||
    q.includes('how many appointments') ||
    q.includes('how many booking') ||
    q.includes('how many bookings') ||
    q.includes('how many appoitments') ||
    q.includes('who today') ||
    q.includes('anyone today') ||
    q.includes('who is with') ||
    q.includes('who booked with') ||
    q.includes('who was his barber') ||
    q.includes('who was the barber') ||
    q.includes('who was her barber') ||
    q.includes('barber yesterday') ||
    q.includes('barber today')
  );

  const isFinancialKeyword = (
    q.includes('revenue') || 
    q.includes('income') || 
    q.includes('earnings') || 
    q.includes('sales') || 
    q.includes('payment') ||
    q.includes('payments') ||
    q.includes('paid') ||
    q.includes('money made') || 
    q.includes('money earned') || 
    q.includes('money came in') || 
    q.includes('total sales') || 
    q.includes('made today') || 
    q.includes('earned today') || 
    q.includes('how much did we make') || 
    q.includes('how much we make') || 
    q.includes('how much we made') || 
    q.includes('how much did we earn') || 
    q.includes('how much we earn') || 
    q.includes('how much money') || 
    q.includes('how much payment') ||
    q.includes('total made') ||
    q.includes('daily income') ||
    q.includes('weekly income') ||
    q.includes('monthly income') ||
    q.includes('daily revenue') ||
    q.includes('weekly revenue') ||
    q.includes('monthly revenue') ||
    q.includes('shop income') ||
    q.includes('pending verification') ||
    q.includes('pending payments') ||
    q.includes('pending payment') ||
    q.includes('unverified') ||
    q.includes('verified payment') ||
    q.includes('verified payments') ||
    q.includes('who has verified') ||
    q.includes('which verified') ||
    q.includes('who is verified') ||
    q.includes('who are verified') ||
    q.includes('payment verification') ||
    q.includes('verify payment')
  );

  const isBriefingKeyword = (
    q.includes('briefing') || 
    q.includes('daily report') || 
    q.includes('today report') || 
    q.includes('morning report') || 
    q.includes('how is today looking')
  );

  const isServiceAnalyticsKeyword = (
    q.includes('popular service') || 
    q.includes('most requested service') || 
    q.includes('how many haircuts') || 
    q.includes('vip royal grooming') || 
    q.includes('how many vip') || 
    q.includes('service analytics') ||
    q.includes('service sales') ||
    q.includes('haircut sales') ||
    q.includes('face treatments') ||
    q.includes('most sold')
  );

  const isRepeatCustomerKeyword = (
    q.includes('repeat') || 
    q.includes('highest value') || 
    q.includes('visited the most') || 
    q.includes('loyal customer') || 
    q.includes('frequent customer') || 
    q.includes('top customer') ||
    q.includes('best customer')
  );

  const isDateScheduleQuery = (
    !isCustomerContextFollowUp &&
    !isFinancialKeyword &&
    !isBriefingKeyword &&
    !isBarberPerformanceKeyword &&
    !isServiceAnalyticsKeyword &&
    !isRepeatCustomerKeyword &&
    !isExplicitCustomerMatch &&
    (
      (hasDateWord && (hasScheduleWord || q === 'today' || q === 'tomorrow' || q === 'yesterday' || q.startsWith('today') || q.startsWith('tomorrow') || q.startsWith('yesterday'))) ||
      hasScheduleWord
    )
  );

  if (isDateScheduleQuery) {
    const period = timeframe.period;
    const periodLabel = timeframe.label;

    currentStaffContext.activeTimePeriod = period;
    currentStaffContext.activeMetric = 'schedule';

    const stats = calculateStaffMetrics(period, null, refDate);

    // Save active appointment / customer in context if available
    if (stats.appointments.length > 0) {
      currentStaffContext.activeAppointment = stats.appointments[0];
      const matchedProfiles = findCustomerProfiles(stats.appointments[0].customerName || stats.appointments[0].customerPhone);
      if (matchedProfiles.length > 0) {
        currentStaffContext.activeCustomer = matchedProfiles[0];
      } else {
        currentStaffContext.activeCustomer = {
          customerName: stats.appointments[0].customerName,
          customerPhone: stats.appointments[0].customerPhone,
          allAppointments: [stats.appointments[0]],
          latestAppointment: stats.appointments[0],
          totalSpend: stats.appointments[0].price || 500,
          totalCount: 1,
          favoriteBarber: stats.appointments[0].barberName,
          mostRequestedService: stats.appointments[0].serviceName
        };
      }
    }

    // Specific Barber Schedule (e.g. "who booked with Abebe?" / "Yohannes appointments today")
    if (matchedBarber) {
      const barberAppts = stats.appointments.filter(a => a.barberId === matchedBarber.id || (a.barberName || '').toLowerCase().includes(matchedBarber.name.toLowerCase()));
      if (barberAppts.length === 0) {
        return {
          text: `💈 **${matchedBarber.name}** has no appointments scheduled for ${periodLabel} (0 bookings).`,
          cardType: 'appointments_list',
          cardData: [],
          suggestions: [
            { label: "All Appointments", prompt: `${periodLabel} appointment?` },
            { label: "Today's Revenue", prompt: "How much did we make today?" }
          ]
        };
      }
      const listSummary = barberAppts.map(a => `• **${a.timeDisplay || a.startTime || 'Time'}** — **${a.customerName}** — ${a.serviceName} (${a.price} ETB · ${a.paymentStatus})`).join('\n');
      return {
        text: `💈 **${matchedBarber.name}** has **${barberAppts.length}** appointment${barberAppts.length === 1 ? '' : 's'} for ${periodLabel}:\n\n${listSummary}`,
        cardType: 'appointments_list',
        cardData: barberAppts,
        suggestions: [
          { label: "How much did he make?", prompt: `How much did ${matchedBarber.name} make this week?` },
          { label: "Today's Schedule", prompt: "today appointment?" }
        ]
      };
    }

    // Specific date barber question (e.g. "who was his barber yesterday?")
    if (q.includes('who was his barber') || q.includes('who was her barber') || q.includes('who was the barber') || (q.includes('barber') && (q.includes('yesterday') || q.includes('today') || q.includes('tomorrow')))) {
      if (stats.totalBookings === 0) {
        return {
          text: `There were no appointments recorded for ${periodLabel}.`,
          cardType: 'appointments_list',
          cardData: [],
          suggestions: [
            { label: "Today's Schedule", prompt: "today appointment?" },
            { label: "This Week Revenue", prompt: "How much did we make this week?" }
          ]
        };
      }
      if (stats.totalBookings === 1) {
        const appt = stats.appointments[0];
        return {
          text: `${periodLabel === 'today' ? 'Today' : periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1)}'s barber was **${appt.barberName}** (for customer **${appt.customerName}**).`,
          cardType: 'booking_card',
          cardData: appt,
          suggestions: [
            { label: "What service?", prompt: "What service did he book?" },
            { label: "Was payment verified?", prompt: "Was his payment verified?" }
          ]
        };
      }
      const barberNames = Array.from(new Set(stats.appointments.map(a => a.barberName))).join(', ');
      return {
        text: `${periodLabel === 'today' ? 'Today' : periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1)}'s appointments were with **${barberNames}** (${stats.totalBookings} total bookings).`,
        cardType: 'appointments_list',
        cardData: stats.appointments,
        suggestions: [
          { label: "View Appointments", prompt: `${periodLabel} appointment?` },
          { label: "Today's Schedule", prompt: "today appointment?" }
        ]
      };
    }

    // Compound queries (e.g. "yesterday appointment who was he and what service was that")
    if (q.includes('who was he') || q.includes('what service') || q.includes('who came')) {
      if (stats.totalBookings === 0) {
        return {
          text: `There were no appointments recorded for ${periodLabel}.`,
          cardType: 'appointments_list',
          cardData: [],
          suggestions: [
            { label: "Today's Schedule", prompt: "today appointment?" },
            { label: "This Week Revenue", prompt: "How much did we make this week?" }
          ]
        };
      }
      if (stats.totalBookings === 1) {
        const appt = stats.appointments[0];
        return {
          text: `${periodLabel === 'today' ? 'Today' : periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1)} you had 1 appointment. **${appt.customerName}** booked **${appt.serviceName}** with **${appt.barberName}** for **${appt.price} ETB**. Payment is currently **${appt.paymentStatus}**.`,
          cardType: 'booking_card',
          cardData: appt,
          suggestions: [
            { label: "Was payment verified?", prompt: "Was his payment verified?" },
            { label: "Customer Profile", prompt: `Show me ${appt.customerName}` }
          ]
        };
      }
    }

    // General Schedule Response
    if (stats.totalBookings === 0) {
      return {
        text: `There are no appointments booked for ${periodLabel} (0 appointments).`,
        cardType: 'appointments_list',
        cardData: [],
        suggestions: [
          { label: "Tomorrow's Schedule", prompt: "tomorrow appointment?" },
          { label: "Yesterday's Records", prompt: "yesterday appointments?" },
          { label: "This Month Revenue", prompt: "How much did we make this month?" }
        ]
      };
    }

    const apptList = stats.appointments.map(a => `• **${a.timeDisplay || a.startTime || 'Time'}** — **${a.customerName}** — ${a.serviceName} — ${a.barberName} (${a.price} ETB · ${a.paymentStatus})`).join('\n');

    return {
      text: `Yes — you have **${stats.totalBookings}** appointment${stats.totalBookings === 1 ? '' : 's'} scheduled for ${periodLabel} (${stats.verifiedCount} verified, ${stats.pendingCount} pending):\n\n${apptList}`,
      cardType: 'appointments_list',
      cardData: stats.appointments,
      suggestions: [
        ...(stats.pendingCount > 0 ? [{ label: "Pending Payments", prompt: "Which appointments are still pending verification?" }] : []),
        { label: "Revenue", prompt: `How much did we make ${periodLabel}?` },
        { label: "Daily Briefing", prompt: "Give me today's briefing" }
      ]
    };
  }

  // ── [PRIORITY 8] DATE + FINANCIAL / PAYMENT / REVENUE INTENT ──────────
  const isFinancialQuery = (
    !isCustomerContextFollowUp &&
    !isExplicitCustomerMatch &&
    (
      isFinancialKeyword ||
      (currentStaffContext.activeMetric === 'revenue' && 
        (q.includes('what about') || q.includes('how about') || q.startsWith('and ') || q === 'this month' || q === 'last month' || q === 'this week' || q === 'last week' || q === 'yesterday' || q === 'last 2 days' || q === 'pending') &&
        !q.includes('who') && 
        !q.includes('which') && 
        !q.includes('barber') && 
        !q.includes('completed')
      ) ||
      (q.includes('how much') && !q.includes('barber') && !q.includes('service') && (q.includes('today') || q.includes('week') || q.includes('month') || q.includes('yesterday') || q.includes('2 days') || q.includes('two days')))
    )
  );

  if (isFinancialQuery) {
    const period = timeframe.period;
    const periodLabel = timeframe.label;

    currentStaffContext.activeTimePeriod = period;
    currentStaffContext.activeMetric = 'revenue';

    const stats = calculateStaffMetrics(period, appointmentsList, refDate);

    // Verified payment filter query (e.g. "who has verified payment?", "which payments are verified?", "who is verified?")
    const isVerifiedFilterQuery = (q.includes('verified') && !q.includes('pending') && !q.includes('unverified')) || q.includes('who is verified') || q.includes('who has verified') || q.includes('which verified');
    if (isVerifiedFilterQuery) {
      const verifiedList = stats.appointments.filter(a => {
        const details = getPaymentVerificationDetails(a);
        return details.isFullyVerified;
      });
      const pendingList = stats.appointments.filter(a => {
        const details = getPaymentVerificationDetails(a);
        return !details.isFullyVerified && !a.status?.includes('Cancelled');
      });

      if (verifiedList.length === 0) {
        return {
          text: `💳 **0 verified payments** found for ${periodLabel}. All ${pendingList.length} scheduled bookings have payments awaiting verification.`,
          cardType: 'appointments_list',
          cardData: [],
          suggestions: [
            { label: "View Pending Payments", prompt: "Which appointments are still pending verification?" },
            { label: "Today's Schedule", prompt: "today appointment?" }
          ]
        };
      }

      const verifiedSummary = verifiedList.map(a => {
        const details = getPaymentVerificationDetails(a);
        return `• **${a.timeDisplay || a.startTime || 'Time'}** — **${a.customerName}** — ${a.serviceName} (**${details.price} ETB** · Verified ✓ via ${details.paymentMethod})`;
      }).join('\n');

      let text = `✅ **Verified Payments (${periodLabel}) — ${verifiedList.length} booking${verifiedList.length === 1 ? '' : 's'}**:\n\n${verifiedSummary}`;
      if (pendingList.length > 0) {
        text += `\n\n⏳ **Note**: There are still **${pendingList.length}** booking${pendingList.length === 1 ? '' : 's'} with payment verification pending (**${stats.pendingRevenue.toLocaleString()} ETB** pending).`;
      }

      return {
        text,
        cardType: 'appointments_list',
        cardData: verifiedList,
        suggestions: [
          { label: "Pending Payments", prompt: "Which appointments are still pending verification?" },
          { label: "Today's Revenue", prompt: "How much did we make today?" }
        ]
      };
    }

    // Pending payment filter query
    if (q.includes('pending') || q.includes('unverified')) {
      const pendingList = stats.appointments.filter(a => {
        const details = getPaymentVerificationDetails(a);
        return !details.isFullyVerified && !a.status?.includes('Cancelled');
      });

      if (pendingList.length === 0) {
        return {
          text: `✅ All payment receipts for ${periodLabel} are verified (0 pending).`,
          cardType: 'appointments_list',
          cardData: [],
          suggestions: [
            { label: "Today's Schedule", prompt: "today appointment?" },
            { label: "Today's Revenue", prompt: "How much did we make today?" }
          ]
        };
      }
      const listSummary = pendingList.map(a => {
        const details = getPaymentVerificationDetails(a);
        let note = `${details.price} ETB`;
        if (details.isUpgraded) {
          if (!details.isOrigVerified && details.isAddSubmitted) {
            note = `${details.price} ETB Total [UNVERIFIED: ${details.actualPaid} ETB Paid, +${details.addPrice} ETB Submitted, +${details.remainingDue} ETB Due]`;
          } else if (details.isOrigVerified && details.isAddSubmitted) {
            note = `${details.price} ETB Total [Original Verified: ${details.origPrice} ETB, Additional Pending: +${details.addPrice} ETB]`;
          }
        }
        return `• **${a.timeDisplay || a.startTime || 'Time'}** — **${a.customerName}** — ${a.serviceName} (${note} · ${details.paymentMethod})`;
      }).join('\n');

      return {
        text: `⏳ Found **${pendingList.length}** appointment${pendingList.length === 1 ? '' : 's'} with payment verification pending for ${periodLabel} (**${stats.pendingRevenue.toLocaleString()} ETB** pending):\n\n${listSummary}`,
        cardType: 'appointments_list',
        cardData: pendingList,
        suggestions: [
          { label: "Today's Briefing", prompt: "Give me today's briefing" },
          { label: "Today's Revenue", prompt: "How much did we make today?" }
        ]
      };
    }

    // Specific Barber Revenue check: e.g. "How much did Abebe make?" / "Abebe revenue?"
    if (matchedBarber) {
      const bStat = stats.barberRankings.find(b => b.id === matchedBarber.id) || { completedCount: 0, verifiedCount: 0, realizedRevenue: 0, pendingRevenue: 0, totalCount: 0 };
      
      let barberText = '';
      if (bStat.realizedRevenue === 0 && bStat.pendingRevenue > 0) {
        barberText = `💈 **${matchedBarber.name}** has **0 ETB** in realized revenue ${periodLabel}, with **${bStat.pendingRevenue.toLocaleString()} ETB** pending verification (${bStat.totalCount} booking${bStat.totalCount === 1 ? '' : 's'}).`;
      } else if (bStat.realizedRevenue > 0) {
        barberText = `💈 **${matchedBarber.name}** generated **${bStat.realizedRevenue.toLocaleString()} ETB** in finalized service revenue from **${bStat.completedCount || bStat.verifiedCount}** booking${(bStat.completedCount || bStat.verifiedCount) === 1 ? '' : 's'} ${periodLabel}${bStat.pendingRevenue > 0 ? ` (${bStat.pendingRevenue.toLocaleString()} ETB pending verification)` : ''}.`;
      } else {
        barberText = `💈 **${matchedBarber.name}** has generated **0 ETB** in revenue ${periodLabel} (0 completed bookings).`;
      }

      return {
        text: barberText,
        cardType: 'analytics_metric',
        cardData: {
          periodLabel,
          title: `${matchedBarber.name}'s Revenue (${periodLabel})`,
          revenue: bStat.realizedRevenue,
          pendingRevenue: bStat.pendingRevenue,
          completedCount: bStat.completedCount,
          barber: matchedBarber.name
        },
        suggestions: [
          { label: "Other Barbers' Revenue", prompt: `Which barber completed the most appointments ${periodLabel}?` },
          { label: "Overall Revenue", prompt: `How much did we make ${periodLabel}?` }
        ]
      };
    }

    // Payment / Paid Specific Query (e.g. "yesterday payment?", "last 2 days payment", "yesterday paid?")
    if (q.includes('payment') || q.includes('paid')) {
      if (stats.totalBookings === 0) {
        return {
          text: `💳 There were no payment transactions recorded for ${periodLabel} (0 appointments).`,
          cardType: 'analytics_metric',
          cardData: {
            periodLabel,
            title: `Payments (${periodLabel})`,
            revenue: 0,
            pendingRevenue: 0,
            completedCount: 0
          },
          suggestions: [
            { label: "Today's Payments", prompt: "What is today's payment?" },
            { label: "This Month Revenue", prompt: "How much did we make this month?" }
          ]
        };
      }

      let paymentText = '';
      if (stats.realizedRevenue === 0 && stats.pendingRevenue > 0) {
        paymentText = `${periodLabel === 'today' ? "Today's" : periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1) + "'s"} realized revenue was **0 ETB**, with **${stats.pendingRevenue.toLocaleString()} ETB** pending verification (${stats.pendingCount} booking${stats.pendingCount === 1 ? '' : 's'}).`;
      } else if (stats.realizedRevenue > 0 && stats.pendingRevenue === 0) {
        paymentText = `${periodLabel === 'today' ? "Today's" : periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1) + "'s"} finalized service payments total **${stats.realizedRevenue.toLocaleString()} ETB** (${stats.verifiedCount} verified booking${stats.verifiedCount === 1 ? '' : 's'}).`;
      } else {
        paymentText = `${periodLabel === 'today' ? "Today's" : periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1) + "'s"} realized revenue was **${stats.realizedRevenue.toLocaleString()} ETB**, with **${stats.pendingRevenue.toLocaleString()} ETB** pending verification (${stats.totalBookings} appointments total).`;
      }

      return {
        text: paymentText,
        cardType: 'analytics_metric',
        cardData: {
          periodLabel,
          title: `Payments Summary (${periodLabel})`,
          revenue: stats.realizedRevenue,
          pendingRevenue: stats.pendingRevenue,
          completedCount: stats.completedCount,
          verifiedCount: stats.verifiedCount,
          pendingCount: stats.pendingCount
        },
        suggestions: [
          { label: "Pending Payments", prompt: `${periodLabel} pending payment?` },
          { label: "View Appointments", prompt: `${periodLabel} appointment?` }
        ]
      };
    }

    // Revenue / Income / Earnings / Sales Query
    let summaryText = '';
    if (stats.realizedRevenue === 0 && stats.pendingRevenue === 0) {
      summaryText = `💰 **${periodLabel.toUpperCase()} REVENUE**: Nhatty Barber House generated **0 ETB** in realized revenue (${stats.totalBookings} appointments ${periodLabel}).`;
    } else if (stats.realizedRevenue === 0 && stats.pendingRevenue > 0) {
      summaryText = `${periodLabel === 'today' ? "Today's" : periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1) + "'s"} realized revenue was **0 ETB**, with **${stats.pendingRevenue.toLocaleString()} ETB** pending verification (${stats.pendingCount} appointment${stats.pendingCount === 1 ? '' : 's'}).`;
    } else if (stats.realizedRevenue > 0 && stats.pendingRevenue === 0) {
      summaryText = `💰 **${periodLabel.toUpperCase()} REVENUE**: Nhatty Barber House generated **${stats.realizedRevenue.toLocaleString()} ETB** in finalized service revenue (${stats.completedCount || stats.verifiedCount} verified booking${(stats.completedCount || stats.verifiedCount) === 1 ? '' : 's'}).`;
    } else {
      summaryText = `💰 **${periodLabel.toUpperCase()} REVENUE**: Nhatty Barber House has **${stats.realizedRevenue.toLocaleString()} ETB** in realized revenue, with **${stats.pendingRevenue.toLocaleString()} ETB** pending verification (${stats.totalBookings} total bookings).`;
    }

    return {
      text: summaryText,
      cardType: 'analytics_metric',
      cardData: {
        periodLabel,
        title: `${periodLabel.toUpperCase()} Revenue Summary`,
        revenue: stats.realizedRevenue,
        pendingRevenue: stats.pendingRevenue,
        completedCount: stats.completedCount,
        pendingCount: stats.pendingCount,
        cancelledCount: stats.cancelledCount,
        bookedValue: stats.bookedValue
      },
      suggestions: [
        period === 'this_month' ? { label: 'Compare to Last Month', prompt: 'What about last month?' } : { label: 'This Month Revenue', prompt: 'How much did we make this month?' },
        { label: 'Top Performing Barber', prompt: `Which barber made the most ${periodLabel}?` },
        { label: 'Pending Payments', prompt: `${periodLabel} pending payment?` }
      ]
    };
  }

  // ── [PRIORITY 9] DAILY BRIEFING INTENT ────────────────────────────────
  if (isBriefingKeyword) {
    const todayStats = calculateStaffMetrics('today', appointmentsList, refDate);
    currentStaffContext.activeTimePeriod = 'today';
    currentStaffContext.activeMetric = 'briefing';

    let attentionNote = todayStats.pendingCount > 0 
      ? `⚠️ Attention: ${todayStats.pendingCount} payment receipt${todayStats.pendingCount === 1 ? '' : 's'} still require verification.`
      : "✅ All today's payment receipts have been reviewed and verified.";

    return {
      text: `📋 **TODAY AT NHATTY BARBER HOUSE**\n\n• **${todayStats.totalBookings}** appointments scheduled\n• **${todayStats.verifiedCount}** payments verified · **${todayStats.pendingCount}** pending\n• **${todayStats.inChairCount}** in chair · **${todayStats.completedCount}** completed · **${todayStats.cancelledCount}** cancelled\n• **${todayStats.realizedRevenue.toLocaleString()} ETB** finalized revenue\n• Busiest Barber: **${todayStats.busiestBarber?.name || 'Abebe'}**\n\n${attentionNote}`,
      cardType: 'daily_briefing',
      cardData: todayStats,
      suggestions: [
        ...(todayStats.pendingCount > 0 ? [{ label: 'View Pending Payments', prompt: 'Which appointments are still pending verification?', action: 'filter_payment_pending' }] : []),
        { label: "Today's Appointments", prompt: "today appointment?" },
        { label: 'Weekly Revenue', prompt: 'How much did we make this week?' }
      ]
    };
  }

  // ── [PRIORITY 10] BARBER PERFORMANCE INTENT ───────────────────────────
  if (isBarberPerformanceKeyword) {
    const period = timeframe.period || 'this_month';
    const periodLabel = timeframe.label || 'this month';

    const stats = calculateStaffMetrics(period, appointmentsList, refDate);
    const topBarber = stats.busiestBarber;

    return {
      text: `🏆 **${topBarber?.name || 'Abebe'}** is the top performing barber ${periodLabel}, completing **${topBarber?.completedCount || 0}** appointments and generating **${(topBarber?.realizedRevenue || 0).toLocaleString()} ETB** in finalized revenue.`,
      cardType: 'barber_rankings',
      cardData: stats.barberRankings,
      suggestions: [
        { label: "View Appointments", prompt: `${periodLabel} appointment?` },
        { label: "Service Breakdown", prompt: "What is our most popular service?" }
      ]
    };
  }

  // ── [PRIORITY 11] SERVICE ANALYTICS INTENT ────────────────────────────
  if (isServiceAnalyticsKeyword) {
    const period = timeframe.period || 'this_month';
    const periodLabel = timeframe.label || 'this month';

    const stats = calculateStaffMetrics(period, null, refDate);
    const topService = stats.mostPopularService;

    if (q.includes('vip') || q.includes('royal')) {
      const vipService = stats.serviceRankings.find(s => s.name.toLowerCase().includes('vip') || s.id === 'srv-4') || { count: 0, revenue: 0 };
      return {
        text: `👑 We have recorded **${vipService.count}** VIP Royal Grooming bookings ${periodLabel}, generating **${vipService.revenue.toLocaleString()} ETB** in premium realized revenue.`,
        cardType: 'service_analytics',
        cardData: stats.serviceRankings,
        suggestions: [
          { label: "Most Popular Service", prompt: "What is our most popular service?" },
          { label: "Overall Revenue", prompt: `How much did we make ${periodLabel}?` }
        ]
      };
    }

    return {
      text: `✨ **${topService?.name || 'Hair Cut Only'}** was your most requested service ${periodLabel} with **${topService?.count || 0}** bookings (${topService?.completedCount || 0} completed, generating **${(topService?.revenue || 0).toLocaleString()} ETB**).`,
      cardType: 'service_analytics',
      cardData: stats.serviceRankings,
      suggestions: [
        { label: "VIP Bookings", prompt: "How many VIP Royal Grooming services did we sell?" },
        { label: "Barber Performance", prompt: "Which barber completed the most appointments?" }
      ]
    };
  }

  // ── [PRIORITY 12] REPEAT & HIGH-VALUE CUSTOMERS INTENT ────────────────
  if (isRepeatCustomerKeyword) {
    const allProfiles = getAllCustomerProfiles();
    const repeatCustomers = allProfiles.filter(p => p.totalCount > 1).sort((a, b) => b.totalSpend - a.totalSpend || b.totalCount - a.totalCount);
    const topCust = repeatCustomers[0];

    return {
      text: `🌟 **${topCust?.customerName || 'Mulugeta Tesfaye'}** is currently our highest-frequency customer with **${topCust?.totalCount || 4}** recorded visits (**${(topCust?.totalSpend || 1950).toLocaleString()} ETB** spent), favoring **${topCust?.favoriteBarber || 'Abebe'}**.`,
      cardType: 'repeat_customers',
      cardData: repeatCustomers,
      suggestions: [
        { label: "View Mulugeta's Profile", prompt: "Show me Mulugeta's appointment." },
        { label: "Today's Schedule", prompt: "today appointment?" }
      ]
    };
  }

  // ── [PRIORITY 13] BOOKING REFERENCE LOOKUP INTENT ─────────────────────
  const rawUpper = query.toUpperCase();
  const refMatch = rawUpper.match(/NHB-?\d{4,6}/);
  if (refMatch) {
    const refCode = refMatch[0].replace('-', '');
    const allAppts = getAuthoritativeAppointments(appointmentsList);
    const appt = allAppts.find(a => (a.ref || a.bookingReference || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().includes(refCode));

    if (appt) {
      currentStaffContext.activeAppointment = appt;
      const matchedProfiles = findCustomerProfiles(appt.customerName || appt.customerPhone, appointmentsList);
      if (matchedProfiles.length > 0) currentStaffContext.activeCustomer = matchedProfiles[0];

      return {
        text: `🎫 **Booking ${appt.ref || appt.bookingReference}**: **${appt.customerName}** (${appt.customerPhone || 'No phone'}) booked **${appt.serviceName}** with **${appt.barberName}** on **${formatAppointmentRelativeDate(appt.dateStr) || appt.dateStr}** at **${appt.timeDisplay || appt.startTime}**. Price: **${appt.price} ETB** (${appt.paymentStatus} via ${appt.paymentMethod?.toUpperCase() || 'Direct'}). Status: **${appt.status}**.`,
        cardType: 'booking_card',
        cardData: appt,
        suggestions: [
          { label: "Customer Profile", prompt: `Show me ${appt.customerName}` },
          { label: "Today's Schedule", prompt: "today appointment?" }
        ]
      };
    }
  }

  // ── [PRIORITY 14] PHONE NUMBER LOOKUP INTENT ─────────────────────────
  const digitsOnly = query.replace(/\D/g, '');
  if (digitsOnly.length >= 7) {
    const matchedProfiles = findCustomerProfiles(digitsOnly, appointmentsList);
    if (matchedProfiles.length >= 1) {
      const cust = matchedProfiles[0];
      currentStaffContext.activeCustomer = cust;
      const latest = cust.latestAppointment;
      const dateStr = latest ? (formatAppointmentRelativeDate(latest.dateStr) || latest.dateStr) : 'N/A';

      return {
        text: `📞 Found customer **${cust.customerName}** (${cust.customerPhone}): **${cust.totalCount}** recorded visit${cust.totalCount === 1 ? '' : 's'} (${cust.completedCount} completed, ${cust.activeCount} active). Latest: **${latest?.serviceName || 'Hair Cut'}** with **${latest?.barberName || 'Barber'}** on **${dateStr}** (${latest?.paymentStatus || 'Verified'}).`,
        cardType: 'customer_profile',
        cardData: cust,
        suggestions: [
          { label: "What did he book?", prompt: `Which service did ${cust.customerName} book?` },
          { label: "How much did he pay?", prompt: "How much did he pay?" }
        ]
      };
    }
  }

  // ── [PRIORITY 15] EXPLICIT CUSTOMER NAME SEARCH ──────────────────────
  if (candidateName && candidateName.length > 0) {
    const matchedProfiles = matchedCustomerProfiles.length > 0 ? matchedCustomerProfiles : findCustomerProfiles(candidateName, appointmentsList);

    if (matchedProfiles.length === 1) {
      const cust = matchedProfiles[0];
      currentStaffContext.activeCustomer = cust;
      const latest = cust.latestAppointment;
      currentStaffContext.activeAppointment = latest;
      const dateStr = latest ? (formatAppointmentRelativeDate(latest.dateStr) || latest.dateStr) : 'N/A';

      const details = getPaymentVerificationDetails(latest);
      const isUpgraded = details.isUpgraded;
      const upgradeNote = isUpgraded ? ` (Upgraded from ${latest?.originalServiceName || 'Original Service'} ${details.origPrice} ETB)` : '';
      let payNote = `${details.price} ETB · ${details.statusBadge}`;
      if (details.isFullyVerified) {
        payNote = `${details.price} ETB · Verified ✓`;
      } else if (details.isPartiallyVerified) {
        payNote = `${details.price} ETB Total [Original: ${details.origPrice} ETB Verified, Additional: ${details.addPrice} ETB Pending]`;
      } else if (details.isUpgraded && !details.isOrigVerified) {
        payNote = `${details.price} ETB Total [UNVERIFIED: ${details.actualPaid} ETB Paid, +${details.addPrice} ETB Additional Submitted, +${details.remainingDue} ETB Due — Action: Verify All]`;
      } else {
        payNote = `${details.price} ETB · Verification Pending`;
      }

      const statusDesc = cust.activeCount > 0 
        ? `${cust.activeCount} active booking (${latest?.ref || latest?.bookingReference || 'Active'}). **${latest?.serviceName}**${upgradeNote} with **${latest?.barberName}** on **${dateStr}** at **${latest?.timeDisplay || latest?.startTime || 'Scheduled'}** (${payNote} · ${latest?.status})`
        : `**${cust.totalCount}** recorded appointment${cust.totalCount === 1 ? '' : 's'} (${cust.completedCount} completed, ${cust.cancelledCount} cancelled). Latest: **${latest?.serviceName || 'Hair Cut'}** with **${latest?.barberName || 'Barber'}** on **${dateStr}** (${payNote})`;

      return {
        text: `👤 **${cust.customerName}** (${cust.customerPhone}): ${statusDesc}.`,
        cardType: 'customer_profile',
        cardData: cust,
        suggestions: [
          { label: "Which service did he book?", prompt: `Which service did ${cust.customerName} book?` },
          { label: "Is he in chair?", prompt: "Is he in the chair?" },
          { label: "Was his payment verified?", prompt: "Was his payment verified?" }
        ]
      };
    }

    if (matchedProfiles.length > 1) {
      const names = matchedProfiles.map(p => `• **${p.customerName}** (${p.customerPhone || 'No phone'})`).join('\n');
      return {
        text: `🔍 I found **${matchedProfiles.length}** customers matching "${candidateName}":\n\n${names}\n\nPlease specify the customer's full name or phone number.`,
        cardType: 'clarification',
        cardData: matchedProfiles,
        suggestions: matchedProfiles.slice(0, 3).map(p => ({
          label: p.customerName,
          prompt: `Show me ${p.customerName}'s appointment.`
        }))
      };
    }

    // 0 matches found for candidate name
    if (matchedBarber) {
      return {
        text: `💈 Found barber **${matchedBarber.name}** (${matchedBarber.role || 'Master Barber'}). You can ask for "${matchedBarber.name} appointments today?" or "How much did ${matchedBarber.name} make today?".`,
        cardType: 'appointments_list',
        cardData: [],
        suggestions: [
          { label: `${matchedBarber.name}'s Schedule`, prompt: `${matchedBarber.name} appointments today?` },
          { label: "Today's Schedule", prompt: "today appointment?" }
        ]
      };
    }

    return {
      text: `I couldn't find any records matching '${candidateName}'. You can search by customer name, phone number, booking reference, or ask for today's schedule.`,
      cardType: null,
      cardData: null,
      suggestions: [
        { label: "Today's Schedule", prompt: "today appointment?" },
        { label: "Today's Briefing", prompt: "Give me today's briefing" },
        { label: "Today's Revenue", prompt: "How much did we make today?" }
      ]
    };
  }

  // ── [PRIORITY 16] PROFESSIONAL OPERATIONS FALLBACK ───────────────────
  return {
    text: `I'm here to help with shop operations. You can ask me about:\n\n• **Daily schedule**: "today appointment?", "who is in chair?", "who is coming today?"\n• **Revenue & payments**: "yesterday payment?", "last 2 days revenue?", "who has pending payment?"\n• **Customer lookup**: "find Benjamin", "0911234567", "NHB-84920"\n• **Barber performance**: "top barber this week?", "who is Abebe serving?"`,
    cardType: null,
    cardData: null,
    suggestions: [
      { label: "Today's Schedule", prompt: "today appointment?" },
      { label: "Who is in chair?", prompt: "Who is currently in chair?" },
      { label: "Yesterday's Payment", prompt: "yesterday payment?" }
    ]
  };
}

export { 
  getAddisAbabaDateTime,
  getCurrentDateTime,
  getCurrentDate,
  getCurrentTime,
  formatDateKey,
  getDatePeriodRange,
  isAppointmentInPeriod,
  getDateRelationship,
  formatAppointmentRelativeDate,
  formatAppointmentDescription
};
