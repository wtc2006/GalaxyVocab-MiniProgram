/**
 * Galaxy Vocab 项目全局配置
 */
module.exports = {
  // 数据库集合名称
  COLLECTIONS: {
    VOCABULARY: 'vocabulary',
    USER_WORDS: 'user_words',
    USER_STATS: 'user_stats'
  },

  // 学习目标配置
  LEARN_GOAL: 50,

  // 艾宾浩斯复习间隔 (天)
  REVIEW_INTERVALS: [1, 2, 4, 7, 15, 30, 60, 180]
};
