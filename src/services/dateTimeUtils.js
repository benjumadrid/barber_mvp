/**
 * Nhatty Barber House — Centralized Date & Time Utility
 * Timezone: Africa/Addis_Ababa (Ethiopia, UTC+3, EAT)
 * 
 * CORE ARCHITECTURE:
 * 1. Single Source of Truth for runtime Date & Time across Customer AI, Staff AI,
 *    Booking Store, Barber Dashboard, and Customer Appointment pages.
 * 2. Strict timezone-aware calculations for Africa/Addis_Ababa (UTC+3).
 * 3. Dynamic Relative Date Computation (Today, Tomorrow, Yesterday, This Week, Last Week, This Month, Last Month, Future, Past).
 * 4. Temporal State Classification (Before, During, After, In-Chair, Completed, Cancelled, Refunded).
 * 5. Zero Hardcoding: All relative labels are calculated dynamically from current real datetime.
 * 6. Preserves actual booked date strings ('YYYY-MM-DD') without timezone reinterpretation shifts.
 * 7. Testable & Deterministic: Supports setSystemNow() / resetSystemNow().
 */

let systemNowOverride = null;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_NAMES_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * Set an override datetime for automated testing or simulation
 * @param {Date|string|number|null} dateOrIso 
 */
export function setSystemNow(dateOrIso) {
  if (!dateOrIso) {
    systemNowOverride = null;
    return;
  }
  systemNowOverride = dateOrIso instanceof Date ? dateOrIso : new Date(dateOrIso);
}

/**
 * Reset override to real system clock
 */
export function resetSystemNow() {
  systemNowOverride = null;
}

/**
 * Get current system Date (or override if set)
 * @returns {Date}
 */
export function getSystemNow() {
  return systemNowOverride ? new Date(systemNowOverride) : new Date();
}

/**
 * Gets decomposed date/time parts in Africa/Addis_Ababa timezone (UTC+3)
 * @param {Date|string|number|null} referenceDate 
 */
export function getAddisAbabaDateTime(referenceDate = null) {
  const baseDate = referenceDate 
    ? (referenceDate instanceof Date ? referenceDate : new Date(referenceDate))
    : getSystemNow();

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Addis_Ababa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(baseDate);
  const partMap = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  const year = parseInt(partMap.year, 10);
  const month = parseInt(partMap.month, 10);
  const day = parseInt(partMap.day, 10);
  const hour = parseInt(partMap.hour === '24' ? '0' : partMap.hour, 10);
  const minute = parseInt(partMap.minute, 10);
  const second = parseInt(partMap.second, 10);

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const totalMinutes = hour * 60 + minute;

  const ampm = hour >= 12 ? 'PM' : 'AM';
  let h12 = hour % 12;
  if (h12 === 0) h12 = 12;
  const timeStr = `${h12}:${String(minute).padStart(2, '0')} ${ampm}`;

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    dateStr,
    totalMinutes,
    timeStr,
    rawDate: baseDate
  };
}

/**
 * Get current date & time object in Africa/Addis_Ababa
 */
export function getCurrentDateTime(referenceDate = null) {
  return getAddisAbabaDateTime(referenceDate);
}

/**
 * Get current date string 'YYYY-MM-DD' in Africa/Addis_Ababa
 */
export function getCurrentDate(referenceDate = null) {
  return getAddisAbabaDateTime(referenceDate).dateStr;
}

/**
 * Get current time string 'h:mm AM/PM' in Africa/Addis_Ababa
 */
export function getCurrentTime(referenceDate = null) {
  return getAddisAbabaDateTime(referenceDate).timeStr;
}

/**
 * Formats a Date object or date string into 'YYYY-MM-DD' key
 * @param {Date|string|null} date 
 */
export function formatDateKey(date = null) {
  if (!date) return getCurrentDate();
  if (typeof date === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(date)) {
      return date.split('T')[0];
    }
    return getAddisAbabaDateTime(date).dateStr;
  }
  if (date instanceof Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return getCurrentDate();
}

/**
 * Format display date for booking date picker
 */
export function formatDisplayDate(date, referenceDate = null) {
  const cur = getAddisAbabaDateTime(referenceDate);
  const targetKey = formatDateKey(date);
  const isTodayDate = (targetKey === cur.dateStr);

  let dObj = date instanceof Date ? date : new Date(date);
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split('-').map(Number);
    dObj = new Date(y, m - 1, d);
  }

  return {
    dayName: isTodayDate ? 'TODAY' : DAY_NAMES_SHORT[dObj.getDay()],
    month: MONTH_NAMES[dObj.getMonth()],
    day: dObj.getDate(),
    isToday: isTodayDate,
    year: dObj.getFullYear(),
  };
}

/**
 * Check if a date is today relative to Africa/Addis_Ababa
 */
export function isToday(date, referenceDate = null) {
  const cur = getAddisAbabaDateTime(referenceDate);
  const key = formatDateKey(date);
  return key === cur.dateStr;
}

/**
 * Check if a date is tomorrow relative to Africa/Addis_Ababa
 */
export function isTomorrow(date, referenceDate = null) {
  const cur = getAddisAbabaDateTime(referenceDate);
  const tom = new Date(cur.year, cur.month - 1, cur.day + 1);
  const tomKey = formatDateKey(tom);
  return formatDateKey(date) === tomKey;
}

/**
 * Check if a date is yesterday relative to Africa/Addis_Ababa
 */
export function isYesterday(date, referenceDate = null) {
  const cur = getAddisAbabaDateTime(referenceDate);
  const yest = new Date(cur.year, cur.month - 1, cur.day - 1);
  const yestKey = formatDateKey(yest);
  return formatDateKey(date) === yestKey;
}

/**
 * Generates an array of upcoming Date objects starting from today in Africa/Addis_Ababa
 */
export function getUpcomingDates(count = 14, referenceDate = null) {
  const cur = getAddisAbabaDateTime(referenceDate);
  const dates = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(cur.year, cur.month - 1, cur.day + i);
    dates.push(d);
  }
  return dates;
}

/**
 * Convert time string like '14:00' or '2:00 PM' to minutes from midnight
 */
export function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const clean = String(timeStr).trim().toUpperCase();

  // Format 'HH:MM' (24-hour)
  if (/^\d{1,2}:\d{2}$/.test(clean)) {
    const [h, m] = clean.split(':').map(Number);
    return h * 60 + m;
  }

  // Format 'H:MM AM' or 'H:MM PM'
  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === 'PM' && h < 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }

  return 0;
}

/**
 * Calculate dynamic date relationship between current Addis Ababa datetime and appointment
 * 
 * @param {Object|string} appointmentOrDateStr - Appointment object or dateStr ('YYYY-MM-DD')
 * @param {Date|string|null} referenceDate - Optional reference date
 */
export function getDateRelationship(appointmentOrDateStr, referenceDate = null) {
  const current = getAddisAbabaDateTime(referenceDate);

  let apptDateStr = '';
  let apptTimeId = '10:00';
  let apptStartTime = '10:00 AM';
  let apptEndTime = '11:00 AM';
  let apptTimeDisplay = '10:00 AM – 11:00 AM';
  let status = 'Confirmed';
  let refundStatus = 'None';
  let paymentStatus = 'Verification Pending';

  if (typeof appointmentOrDateStr === 'string') {
    apptDateStr = appointmentOrDateStr.split('T')[0];
  } else if (appointmentOrDateStr && typeof appointmentOrDateStr === 'object') {
    apptDateStr = appointmentOrDateStr.dateStr || (appointmentOrDateStr.date ? String(appointmentOrDateStr.date).split('T')[0] : '');
    apptTimeId = appointmentOrDateStr.timeId || '10:00';
    apptStartTime = appointmentOrDateStr.startTime || '10:00 AM';
    apptEndTime = appointmentOrDateStr.endTime || '11:00 AM';
    apptTimeDisplay = appointmentOrDateStr.timeDisplay || `${apptStartTime} – ${apptEndTime}`;
    status = appointmentOrDateStr.status || appointmentOrDateStr.bookingStatus || 'Confirmed';
    refundStatus = appointmentOrDateStr.refundStatus || 'None';
    paymentStatus = appointmentOrDateStr.paymentStatus || 'Verification Pending';
  }

  if (!apptDateStr) {
    return {
      dayRelation: 'UNKNOWN',
      diffDays: 0,
      timeRelation: 'UNKNOWN',
      temporalState: 'UNKNOWN',
      isToday: false,
      isTomorrow: false,
      isYesterday: false,
      isPast: false,
      isFuture: false,
      isInProgress: false,
      isCompleted: false,
      isCancelled: false,
      formattedDate: '',
      formattedRelativeDate: '',
      formattedDateWithPrefix: '',
      timeDisplay: apptTimeDisplay,
      startTime: apptStartTime,
      endTime: apptEndTime,
      verb: 'is',
      dateStr: ''
    };
  }

  // Parse appointment date parts directly without timezone offset shifts
  const [aYear, aMonth, aDay] = apptDateStr.split('-').map(Number);
  const apptUtc = Date.UTC(aYear, aMonth - 1, aDay);
  const currentUtc = Date.UTC(current.year, current.month - 1, current.day);
  const diffDays = Math.round((apptUtc - currentUtc) / (86400 * 1000));

  const apptDateObj = new Date(aYear, aMonth - 1, aDay);
  const monthName = MONTH_NAMES[aMonth - 1];
  const dayName = DAY_NAMES[apptDateObj.getDay()];

  // Day relationship classification
  let dayRelation = 'FUTURE';
  if (diffDays === 0) dayRelation = 'TODAY';
  else if (diffDays === 1) dayRelation = 'TOMORROW';
  else if (diffDays === -1) dayRelation = 'YESTERDAY';
  else if (diffDays < -1) dayRelation = 'PAST';
  else if (diffDays > 1) dayRelation = 'FUTURE';

  // Time relationship classification
  const startMinutes = parseTimeToMinutes(apptTimeId || apptStartTime);
  const endMinutes = parseTimeToMinutes(apptEndTime) || (startMinutes + 60);
  const currentMinutes = current.totalMinutes;

  let timeRelation = 'BEFORE';
  if (diffDays === 0) {
    if (currentMinutes < startMinutes) {
      timeRelation = 'BEFORE';
    } else if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      timeRelation = 'DURING';
    } else {
      timeRelation = 'AFTER';
    }
  } else if (diffDays < 0) {
    timeRelation = 'AFTER';
  } else {
    timeRelation = 'BEFORE';
  }

  // Status checks
  const isCancelled = status === 'Customer Cancelled' || status === 'Cancelled' || (status && status.includes('Cancelled'));
  const isRefundCompleted = refundStatus === 'Completed' || (status && status.includes('Refund Completed'));
  const isCompleted = status === 'Completed' || status === 'completed';
  const isInChairStatus = status === 'In-Chair' || status === 'In Chair' || status === 'in_chair';
  const isInProgress = isInChairStatus || (diffDays === 0 && timeRelation === 'DURING' && !isCompleted && !isCancelled);

  const isPast = diffDays < 0 || (diffDays === 0 && timeRelation === 'AFTER' && isCompleted);
  const isTodayBool = diffDays === 0;
  const isTomorrowBool = diffDays === 1;
  const isYesterdayBool = diffDays === -1;
  const isFutureBool = diffDays > 0;

  // Temporal state
  let temporalState = 'UPCOMING';
  if (isRefundCompleted) {
    temporalState = 'REFUNDED';
  } else if (isCancelled) {
    temporalState = 'CANCELLED';
  } else if (isCompleted) {
    temporalState = 'COMPLETED';
  } else if (isInProgress) {
    temporalState = 'CURRENTLY_IN_PROGRESS';
  } else if (diffDays === 0) {
    if (timeRelation === 'BEFORE') temporalState = 'TODAY';
    else if (timeRelation === 'DURING') temporalState = 'CURRENTLY_IN_PROGRESS';
    else temporalState = 'AWAITING_COMPLETION';
  } else if (diffDays === 1) {
    temporalState = 'TOMORROW';
  } else if (diffDays === -1) {
    temporalState = 'YESTERDAY';
  } else if (diffDays > 1) {
    temporalState = 'FUTURE';
  } else {
    temporalState = 'PAST';
  }

  // Human-readable formatted relative date strings
  let formattedRelativeDate = '';
  let formattedDateWithPrefix = '';

  if (diffDays === 0) {
    formattedRelativeDate = `Today, ${monthName} ${aDay}, ${aYear}`;
    formattedDateWithPrefix = `today, ${monthName} ${aDay}, ${aYear}`;
  } else if (diffDays === 1) {
    formattedRelativeDate = `Tomorrow, ${monthName} ${aDay}, ${aYear}`;
    formattedDateWithPrefix = `tomorrow, ${monthName} ${aDay}, ${aYear}`;
  } else if (diffDays === -1) {
    formattedRelativeDate = `Yesterday, ${monthName} ${aDay}, ${aYear}`;
    formattedDateWithPrefix = `yesterday, ${monthName} ${aDay}, ${aYear}`;
  } else if (diffDays > 1) {
    formattedRelativeDate = `${dayName}, ${monthName} ${aDay}, ${aYear}`;
    formattedDateWithPrefix = `on ${dayName}, ${monthName} ${aDay}, ${aYear}`;
  } else {
    formattedRelativeDate = `${dayName}, ${monthName} ${aDay}, ${aYear}`;
    formattedDateWithPrefix = `on ${dayName}, ${monthName} ${aDay}, ${aYear}`;
  }

  // Verb selection (was vs is)
  let verb = 'is';
  if (isCompleted || isCancelled || diffDays < 0 || (diffDays === 0 && timeRelation === 'AFTER')) {
    verb = 'was';
  } else if (isInProgress) {
    verb = 'is currently';
  }

  return {
    dayRelation,
    diffDays,
    timeRelation,
    temporalState,
    isToday: isTodayBool,
    isTomorrow: isTomorrowBool,
    isYesterday: isYesterdayBool,
    isPast,
    isFuture: isFutureBool,
    isInProgress,
    isCompleted,
    isCancelled,
    isRefundCompleted,
    formattedRelativeDate,
    formattedDateWithPrefix,
    formattedDate: formattedRelativeDate,
    dayName,
    monthName,
    dayNum: aDay,
    yearNum: aYear,
    dateStr: apptDateStr,
    timeDisplay: apptTimeDisplay,
    startTime: apptStartTime,
    endTime: apptEndTime,
    startMinutes,
    endMinutes,
    status,
    paymentStatus,
    refundStatus,
    verb
  };
}

/**
 * Formats an appointment date relative to the reference date.
 * Examples:
 * - If today: "Today, Aug 31, 2026"
 * - If tomorrow: "Tomorrow, Sep 1, 2026"
 * - If yesterday: "Yesterday, Aug 30, 2026"
 * - Older or future: "Friday, Aug 28, 2026"
 */
export function formatAppointmentRelativeDate(dateStr, referenceDate = null) {
  if (!dateStr) return '';
  const rel = getDateRelationship(dateStr, referenceDate);
  return rel.formattedRelativeDate || dateStr;
}

/**
 * Format a comprehensive, natural human response for an appointment query
 * taking into account temporal state, date relationship, time of day, and status.
 */
export function formatAppointmentDescription(appt, options = {}) {
  if (!appt) return "You don't currently have an active appointment.";
  const refDate = options.referenceDate || null;
  const rel = getDateRelationship(appt, refDate);
  const sName = appt.serviceName || 'Grooming Service';
  const bName = appt.barberName || 'your barber';
  const ref = appt.ref || appt.bookingReference || '';
  const price = appt.price || appt.amountPaid || 0;
  const payStatus = appt.paymentStatus || 'Verification Pending';
  const apptStatus = appt.status || appt.bookingStatus || 'Confirmed';

  const refPrefix = ref ? `**${ref}** ` : '';

  // 1. In-Chair / In Progress
  if (rel.isInProgress) {
    return `Your appointment ${refPrefix}for **${sName}** with **${bName}** is **currently in progress** (${rel.timeDisplay}) 💈.`;
  }

  // 2. Completed appointment
  if (rel.isCompleted) {
    if (rel.isToday) {
      return `Your appointment ${refPrefix}for **${sName}** with **${bName}** was **completed today**, ${rel.monthName} ${rel.dayNum}, ${rel.yearNum}, from **${rel.timeDisplay}** ✅.`;
    }
    if (rel.isYesterday) {
      return `Your appointment ${refPrefix}was **yesterday, ${rel.monthName} ${rel.dayNum}, ${rel.yearNum}**, from **${rel.timeDisplay}** with **${bName}** for **${sName}**, and was **Completed** ✅.`;
    }
    return `Your appointment ${refPrefix}was ${rel.formattedDateWithPrefix}, from **${rel.timeDisplay}** with **${bName}** for **${sName}**, and was **Completed** ✅.`;
  }

  // 3. Cancelled appointment
  if (rel.isCancelled) {
    const refTxt = appt.refundStatus ? `Refund status: **${appt.refundStatus}**.` : '';
    if (rel.isToday) {
      return `Your appointment ${refPrefix}was scheduled for **today, ${rel.monthName} ${rel.dayNum}, ${rel.yearNum}** (${rel.timeDisplay}), but was **Cancelled**. ${refTxt}`;
    }
    if (rel.isYesterday) {
      return `Your appointment ${refPrefix}was scheduled for **yesterday, ${rel.monthName} ${rel.dayNum}, ${rel.yearNum}** (${rel.timeDisplay}), but was **Cancelled**. ${refTxt}`;
    }
    return `Your appointment ${refPrefix}was scheduled for ${rel.formattedDateWithPrefix} (${rel.timeDisplay}), but was **Cancelled**. ${refTxt}`;
  }

  // 4. Today — Before scheduled time
  if (rel.isToday && rel.timeRelation === 'BEFORE') {
    return `Your appointment ${refPrefix}is **today, ${rel.monthName} ${rel.dayNum}, ${rel.yearNum}** at **${rel.startTime}** (${rel.timeDisplay}) with **${bName}** for **${sName}** (${price} ETB · ${payStatus} · ${apptStatus}).`;
  }

  // 5. Today — After scheduled time but not yet completed
  if (rel.isToday && rel.timeRelation === 'AFTER') {
    return `Your appointment ${refPrefix}was scheduled for **today, ${rel.monthName} ${rel.dayNum}, ${rel.yearNum}** from **${rel.timeDisplay}** with **${bName}** for **${sName}** and is currently awaiting completion (${payStatus}).`;
  }

  // 6. Tomorrow
  if (rel.isTomorrow) {
    return `Your appointment ${refPrefix}is **tomorrow, ${rel.monthName} ${rel.dayNum}, ${rel.yearNum}** at **${rel.startTime}** (${rel.timeDisplay}) with **${bName}** for **${sName}** (${price} ETB · ${payStatus} · ${apptStatus}).`;
  }

  // 7. Yesterday
  if (rel.isYesterday) {
    return `Your appointment ${refPrefix}was **yesterday, ${rel.monthName} ${rel.dayNum}, ${rel.yearNum}**, from **${rel.timeDisplay}** with **${bName}** for **${sName}** (${price} ETB · ${payStatus}).`;
  }

  // 8. Other Past
  if (rel.diffDays < -1) {
    return `Your appointment ${refPrefix}was ${rel.formattedDateWithPrefix}, from **${rel.timeDisplay}** with **${bName}** for **${sName}** (${price} ETB · ${payStatus}).`;
  }

  // 9. Other Future
  return `Your appointment ${refPrefix}is ${rel.formattedDateWithPrefix} at **${rel.startTime}** (${rel.timeDisplay}) with **${bName}** for **${sName}** (${price} ETB · ${payStatus} · ${apptStatus}).`;
}

/**
 * Centralized Period Date Range Calculator for Staff AI & Analytics
 * @param {string} period - 'today' | 'tomorrow' | 'yesterday' | 'last_2_days' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'all'
 * @param {Date|string|null} referenceDate - Base reference date in Africa/Addis_Ababa
 */
export function getDatePeriodRange(period = 'today', referenceDate = null) {
  const current = getAddisAbabaDateTime(referenceDate);
  const { year, month, day } = current;

  // Exact calendar dates in Africa/Addis_Ababa
  const todayRef = new Date(year, month - 1, day);
  const todayKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const tomorrowRef = new Date(year, month - 1, day + 1);
  const tomorrowKey = `${tomorrowRef.getFullYear()}-${String(tomorrowRef.getMonth() + 1).padStart(2, '0')}-${String(tomorrowRef.getDate()).padStart(2, '0')}`;

  const yesterdayRef = new Date(year, month - 1, day - 1);
  const yesterdayKey = `${yesterdayRef.getFullYear()}-${String(yesterdayRef.getMonth() + 1).padStart(2, '0')}-${String(yesterdayRef.getDate()).padStart(2, '0')}`;

  // Last 2 Days (Today + Yesterday)
  const last2DaysStart = new Date(yesterdayRef);
  const last2DaysEnd = new Date(todayRef);

  // This Week (last 7 days through today)
  const thisWeekStart = new Date(year, month - 1, day - 6);
  const thisWeekEnd = new Date(todayRef);

  // Last Week (7 to 13 days ago)
  const lastWeekStart = new Date(year, month - 1, day - 13);
  const lastWeekEnd = new Date(year, month - 1, day - 7);

  // This Month (current calendar month 1st through today)
  const thisMonthStart = new Date(year, month - 1, 1);
  const thisMonthEnd = new Date(todayRef);

  // Last Month (previous calendar month full)
  const lastMonthStart = new Date(year, month - 2, 1);
  const lastMonthEnd = new Date(year, month - 1, 0);

  return {
    todayKey,
    tomorrowKey,
    yesterdayKey,
    last2DaysStart,
    last2DaysEnd,
    thisWeekStart,
    thisWeekEnd,
    lastWeekStart,
    lastWeekEnd,
    thisMonthStart,
    thisMonthEnd,
    lastMonthStart,
    lastMonthEnd,
    currentAddisAbaba: current
  };
}

/**
 * Checks if an appointment's dateStr falls within the requested period
 */
export function isAppointmentInPeriod(appt, period, referenceDate = null) {
  if (!appt || !appt.dateStr) return false;
  if (!period || period === 'all') return true;
  const periods = getDatePeriodRange(period, referenceDate);
  const parts = appt.dateStr.split('-').map(Number);
  if (parts.length !== 3) return false;
  const apptDate = new Date(parts[0], parts[1] - 1, parts[2]);
  apptDate.setHours(0, 0, 0, 0);

  if (period === 'today') return appt.dateStr === periods.todayKey;
  if (period === 'tomorrow') return appt.dateStr === periods.tomorrowKey;
  if (period === 'yesterday') return appt.dateStr === periods.yesterdayKey;
  if (period === 'last_2_days') {
    return (appt.dateStr === periods.todayKey || appt.dateStr === periods.yesterdayKey) ||
           (apptDate >= periods.last2DaysStart && apptDate <= periods.last2DaysEnd);
  }
  if (period === 'this_week') return apptDate >= periods.thisWeekStart && apptDate <= periods.thisWeekEnd;
  if (period === 'last_week') return apptDate >= periods.lastWeekStart && apptDate <= periods.lastWeekEnd;
  if (period === 'this_month') return apptDate >= periods.thisMonthStart && apptDate <= periods.thisMonthEnd;
  if (period === 'last_month') return apptDate >= periods.lastMonthStart && apptDate <= periods.lastMonthEnd;
  return true;
}
