const config = require('../config');
const { COLLECTIONS, LEARN_GOAL } = config;

/**
 * 格式化日期为 YYYY-MM-DD
 */
function padNumber(value) {
  return String(value).padStart(2, '0');
}

function formatLocalDate(date) {
  return [
    date.getFullYear(),
    padNumber(date.getMonth() + 1),
    padNumber(date.getDate())
  ].join('-');
}

/**
 * 获取偏移日期字符串
 */
function getDateOffsetString(offsetDays, baseDate) {
  const seed = baseDate ? new Date(baseDate) : new Date();
  seed.setHours(12, 0, 0, 0);
  seed.setDate(seed.getDate() + offsetDays);
  return formatLocalDate(seed);
}

function getTodayLocalDate(baseDate) {
  return getDateOffsetString(0, baseDate);
}

function getYesterdayLocalDate(baseDate) {
  return getDateOffsetString(-1, baseDate);
}

/**
 * 规范化单词记录的 ID 字段 (兼容不同来源的数据结构)
 */
function normalizeWordId(record) {
  if (!record) {
    return '';
  }
  return record.wordId || record.word_id || record.vocabulary_id || record._id || '';
}

/**
 * 从统计记录中提取日期 Key
 */
function getStatDateKey(stat) {
  if (!stat) {
    return '';
  }
  if (stat.date_key) {
    return stat.date_key;
  }
  if (!stat.syncTime) {
    return '';
  }

  const syncDate = stat.syncTime instanceof Date ? stat.syncTime : new Date(stat.syncTime);
  if (Number.isNaN(syncDate.getTime())) {
    return '';
  }

  return formatLocalDate(syncDate);
}

/**
 * 仪表盘核心统计函数
 * 逻辑说明：
 * 1. 今日已学总数：从 USER_WORDS 获取 learn_date 为今天的记录。
 * 2. 今日待学新词：今日已学中 status 非 mastered 的记录。
 * 3. 待复习任务：(日期早于今天且未掌握) OR (状态为 review) 的所有记录。
 * 4. 今日已复习总数：last_review_date 为今天，但 learn_date 非今天的记录。
 */
async function fetchDashboardStats(db, command) {
  const _ = command || db.command;
  const today = getTodayLocalDate();

  const [todayWordsRes, todayLearnDueRes, reviewDueRes, todayReviewRes, statsRes] = await Promise.all([
    db.collection(COLLECTIONS.USER_WORDS).where({ learn_date: today }).get(),
    db.collection(COLLECTIONS.USER_WORDS).where({
      learn_date: today,
      status: _.neq('mastered')
    }).get(),
    db.collection(COLLECTIONS.USER_WORDS).where(
      _.or([
        {
          learn_date: _.lt(today),
          status: _.neq('mastered')
        },
        {
          status: 'review'
        }
      ])
    ).get(),
    db.collection(COLLECTIONS.USER_WORDS).where({
      last_review_date: today,
      learn_date: _.neq(today)
    }).get(),
    db.collection(COLLECTIONS.USER_STATS).get()
  ]);

  const userStats = statsRes.data[0] || {};
  const lastVocabIndex = userStats.last_vocab_index || 0;

  console.log('[dashboard] 当前待复习原始记录：', reviewDueRes.data || []);
  console.log('[dashboard] last learned index:', lastVocabIndex);

  let totalStudyTime = 0;
  let todayStudyTime = 0;

  (statsRes.data || []).forEach((stat) => {
    const seconds = Number(stat.studyTime || 0);
    totalStudyTime += seconds;

    if (getStatDateKey(stat) === today) {
      todayStudyTime += seconds;
    }
  });

  const todayFinished = (todayWordsRes.data || []).length;
  const learnProgress = `${todayFinished}/${LEARN_GOAL}`;

  return {
    today,
    todayWords: todayFinished,
    todayLearnDue: (todayLearnDueRes.data || []).length,
    reviewDueCount: (reviewDueRes.data || []).length,
    todayReviews: (todayReviewRes.data || []).length,
    todayStudyTime,
    totalStudyTime,
    lastVocabIndex,
    learnProgress,
    isGoalReached: todayFinished >= LEARN_GOAL
  };
}

module.exports = {
  formatLocalDate,
  getDateOffsetString,
  getTodayLocalDate,
  getYesterdayLocalDate,
  normalizeWordId,
  getStatDateKey,
  fetchDashboardStats
};
