const db = wx.cloud.database();
const _ = db.command;
const config = require('../../config');
const { COLLECTIONS, REVIEW_INTERVALS } = config;
const {
  getTodayLocalDate,
  getYesterdayLocalDate,
  normalizeWordId
} = require('../../utils/util');

function getOpenIdFromCallFunction(result) {
  return result && result.result && (result.result.openid || result.result.OPENID || result.result._openid) || '';
}

Page({
  data: {
    currentWord: null,
    currentProgress: null,
    wordPool: [],
    currentWordIndex: 0,
    loading: false,
    isLock: false,
    showDefinition: false,
    hasAnswered: false,
    feedbackType: '',
    feedbackText: '',
    sessionCount: 0,
    masteredCount: 0,
    reviewCount: 0,
    missionComplete: false,
    missionTitle: 'Mission Accomplished',
    missionSubtitle: '本轮任务已完成，返回首页领取下一段星图。',
    emptyMessage: '',
    isFetchingPool: false,
    isDataSyncing: false,
    userOpenId: '',
    categories: ['全部', '初中', '高中', 'CET4', 'CET6', '考研', '托福', 'SAT'],
    categoryIndex: 0,
    currentCategory: '全部',
    isReviewMode: false,
    isYesterdayReview: false,
    animationClass: 'fade-in'
  },

  onLoad(options) {
    console.log('[index] onLoad options:', options || {});

    this.advanceTimer = null;
    this.startTime = Date.now();

    const isYesterdayReview = options.mode === 'yesterday_review';
    this.setData({
      isYesterdayReview,
      isReviewMode: isYesterdayReview
    });

    this.ensureUserContext()
      .finally(() => this.loadWords(true));
  },

  onHide() {
    this.clearAdvanceTimer();
    this.flushStudyTime();
  },

  onUnload() {
    this.clearAdvanceTimer();
    this.flushStudyTime();
  },

  clearAdvanceTimer() {
    if (this.advanceTimer) {
      clearTimeout(this.advanceTimer);
      this.advanceTimer = null;
    }
  },

  async ensureUserContext() {
    const cachedOpenId = wx.getStorageSync('galaxy_vocab_openid');
    if (cachedOpenId) {
      this.setData({ userOpenId: cachedOpenId });
      return cachedOpenId;
    }

    try {
      const res = await wx.cloud.callFunction({ name: 'login' });
      const openid = getOpenIdFromCallFunction(res);
      if (openid) {
        wx.setStorageSync('galaxy_vocab_openid', openid);
        this.setData({ userOpenId: openid });
      }
      return openid;
    } catch (error) {
      console.warn('[index] login function unavailable, rely on CloudBase implicit _openid:', error);
      return '';
    }
  },

  async flushStudyTime() {
    if (!this.startTime) {
      return;
    }

    const now = Date.now();
    const studyTime = Math.max(0, Math.floor((now - this.startTime) / 1000));
    this.startTime = now;

    if (!studyTime) {
      return;
    }

    await this.syncStudyStats(studyTime);
  },

  async syncStudyStats(studyTime) {
    if (this.data.isDataSyncing || !studyTime) {
      return;
    }

    this.setData({ isDataSyncing: true });
    const today = getTodayLocalDate();

    try {
      const statsRes = await db.collection(COLLECTIONS.USER_STATS).where({ date_key: today }).get();
      const payload = {
        studyTime: _.inc(studyTime),
        syncTime: db.serverDate(),
        date_key: today
      };

      if (statsRes.data && statsRes.data.length > 0) {
        await db.collection(COLLECTIONS.USER_STATS).doc(statsRes.data[0]._id).update({ data: payload });
      } else {
        await db.collection(COLLECTIONS.USER_STATS).add({
          data: {
            studyTime,
            wordCount: 0,
            syncTime: db.serverDate(),
            date_key: today,
            user_openid: this.data.userOpenId || ''
          }
        });
      }
    } catch (error) {
      console.error('[index] syncStudyStats failed:', error);
    } finally {
      this.setData({ isDataSyncing: false });
    }
  },

  /**
   * 增加已学单词计数
   * 逻辑说明：
   * 1. 区分学习模式和复习模式。
   * 2. 在学习模式下，增加 last_vocab_index 以便“断点续学”。
   */
  async bumpWordCount() {
    const today = getTodayLocalDate();
    const isLearnMode = !this.data.isReviewMode && !this.data.isYesterdayReview;

    try {
      const statsRes = await db.collection(COLLECTIONS.USER_STATS).where({ date_key: today }).get();
      const updateData = {
        wordCount: _.inc(1),
        syncTime: db.serverDate(),
        date_key: today
      };

      if (isLearnMode) {
        updateData.last_vocab_index = _.inc(1);
      }

      if (statsRes.data && statsRes.data.length > 0) {
        await db.collection(COLLECTIONS.USER_STATS).doc(statsRes.data[0]._id).update({
          data: updateData
        });
      } else {
        const insertData = {
          studyTime: 0,
          wordCount: 1,
          syncTime: db.serverDate(),
          date_key: today,
          user_openid: this.data.userOpenId || ''
        };
        if (isLearnMode) {
          insertData.last_vocab_index = 1;
        }
        await db.collection(COLLECTIONS.USER_STATS).add({
          data: insertData
        });
      }
    } catch (error) {
      console.error('[index] bumpWordCount failed:', error);
    }
  },

  async loadWords(forceReload) {
    if (this.data.loading) {
      return;
    }

    this.clearAdvanceTimer();
    this.setData({
      loading: true,
      isLock: true,
      missionComplete: false,
      emptyMessage: '',
      currentWord: null,
      currentProgress: null,
      showDefinition: false,
      hasAnswered: false,
      feedbackType: '',
      feedbackText: '',
      wordPool: forceReload ? [] : this.data.wordPool,
      currentWordIndex: forceReload ? 0 : this.data.currentWordIndex
    });

    wx.showLoading({ title: 'Loading...', mask: true });

    try {
      if (forceReload) {
        await this.fillWordPool(true);
      } else if (!this.data.wordPool.length) {
        await this.fillWordPool(false);
      }

      this.loadNextWord(true);
    } catch (error) {
      console.error('[index] loadWords failed:', error);
      this.openMissionPanel('Mission Accomplished', '当前模式下没有可执行任务。');
    } finally {
      wx.hideLoading();
      this.setData({
        loading: false,
        isLock: false
      });
    }
  },

  async fillWordPool(resetPool) {
    if (this.data.isFetchingPool) {
      return;
    }

    this.setData({ isFetchingPool: true });

    try {
      const newWords = await this.fetchWordsForCurrentMode();
      const mergedPool = resetPool ? newWords : [...this.data.wordPool, ...newWords];
      const seen = {};
      const nextPool = mergedPool.filter((item) => {
        if (!item || !item._id || seen[item._id]) {
          return false;
        }
        seen[item._id] = true;
        return true;
      });

      this.setData({
        wordPool: nextPool,
        currentWordIndex: resetPool ? 0 : this.data.currentWordIndex
      });
    } catch (error) {
      console.error('[index] fillWordPool failed:', error);
      throw error;
    } finally {
      this.setData({ isFetchingPool: false });
    }
  },

  async fetchWordsForCurrentMode() {
    if (this.data.isYesterdayReview) {
      return this.fetchYesterdayReviewWords();
    }

    if (this.data.isReviewMode) {
      return this.fetchReviewWords();
    }

    return this.fetchLearnWords();
  },

  async fetchYesterdayReviewWords() {
    const yesterday = getYesterdayLocalDate();
    const reviewRes = await db.collection(COLLECTIONS.USER_WORDS)
      .where({ 
        learn_date: yesterday,
        status: _.neq('mastered')
      })
      .get();

    console.log('[index] yesterday review raw data:', reviewRes.data || []);
    console.log('[index] yesterday review raw length:', (reviewRes.data || []).length);

    return this.attachVocabularyToProgress(reviewRes.data || []);
  },

  async fetchReviewWords() {
    const reviewRes = await db.collection(COLLECTIONS.USER_WORDS)
      .where({ status: 'review' })
      .limit(20)
      .get();

    console.log('[index] review raw length:', (reviewRes.data || []).length);

    if (!reviewRes.data || !reviewRes.data.length) {
      return this.fetchYesterdayReviewWords();
    }

    return this.attachVocabularyToProgress(reviewRes.data || []);
  },

  /**
   * 断点续学核心逻辑：获取学习单词
   * Core logic for Breakpoint Resumption: Fetch words for learning
   * 
   * 原理说明 (Principle):
   * 1. 黑名单过滤 (Blacklist Filtering): 利用 user_words 的 word_id 列表作为排除项，确保不重复学习已掌握的单词。
   *    Use the word_id list from user_words as a blacklist to ensure previously learned words are not repeated.
   * 2. 差集查询 (Set Difference): 在获取 vocabulary 集合时，通过 _.nin 排除黑名单 ID。
   *    Perform a set difference query using _.nin to exclude blacklist IDs when fetching from the vocabulary collection.
   * 3. 偏移量控制 (Offset Control): 结合累计偏移量 (skip) 实现大数据量下的高效分页加载。
   *    Combine with cumulative offset (skip) for efficient paginated loading of large datasets.
   */
  async fetchLearnWords() {
    // 1. 获取已学名单 (限制最近 1000 条) / Get learned words list (limit to recent 1000)
    const learnedRes = await db.collection(COLLECTIONS.USER_WORDS)
      .field({ wordId: true, word_id: true })
      .limit(1000)
      .get();

    const learnedIds = Array.from(new Set(
      (learnedRes.data || []).map((item) => normalizeWordId(item)).filter(Boolean)
    ));

    // 2. 获取累计学习偏移量 / Get cumulative learning offset
    const statsRes = await db.collection(COLLECTIONS.USER_STATS).orderBy('date_key', 'desc').limit(1).get();
    let totalOffset = 0;
    if (statsRes.data && statsRes.data.length > 0) {
      const allStatsRes = await db.collection(COLLECTIONS.USER_STATS).field({ last_vocab_index: true }).get();
      totalOffset = (allStatsRes.data || []).reduce((acc, cur) => acc + (cur.last_vocab_index || 0), 0);
    }

    console.log('[index] learning offset:', totalOffset, 'learned count in memory:', learnedIds.length);

    const query = {};
    if (learnedIds.length) {
      // 3. 执行差集过滤 / Execute set difference filtering
      query._id = _.nin(learnedIds);
    }
    if (this.data.currentCategory !== '全部') {
      query.category = this.data.currentCategory;
    }

    const vocabularyRes = await db.collection(COLLECTIONS.VOCABULARY)
      .where(query)
      .skip(totalOffset)
      .limit(20)
      .get();

    return (vocabularyRes.data || []).map((item) => ({
      ...item,
      progress: null
    }));
  },

  async attachVocabularyToProgress(progressList) {
    const wordIds = Array.from(new Set((progressList || []).map((item) => normalizeWordId(item)).filter(Boolean)));
    if (!wordIds.length) {
      return [];
    }

    const vocabularyList = await Promise.all(
      wordIds.map((id) => db.collection(COLLECTIONS.VOCABULARY).doc(id).get()
        .then((res) => res.data)
        .catch((error) => {
          console.error('[index] vocabulary fetch failed:', id, error);
          return null;
        }))
    );

    const vocabularyMap = {};
    vocabularyList.filter(Boolean).forEach((item) => {
      vocabularyMap[item._id] = item;
    });

    return (progressList || [])
      .map((progress) => {
        const wordId = normalizeWordId(progress);
        const vocabulary = vocabularyMap[wordId];
        if (!vocabulary) {
          return null;
        }

        return {
          ...vocabulary,
          progress
        };
      })
      .filter(Boolean);
  },

  loadNextWord(forceLoad) {
    if ((this.data.loading || this.data.isLock) && !forceLoad) {
      return;
    }

    wx.hideLoading();
    this.clearAdvanceTimer();

    const { wordPool, currentWordIndex } = this.data;
    const nextWord = wordPool[currentWordIndex];

    if (!nextWord) {
      this.openMissionPanel('Mission Accomplished', '本轮任务已完成，返回首页继续探索。');
      return;
    }

    this.setData({
      currentWord: nextWord,
      currentProgress: nextWord.progress || null,
      currentWordIndex: currentWordIndex + 1,
      showDefinition: false,
      hasAnswered: false,
      feedbackType: '',
      feedbackText: '',
      emptyMessage: '',
      isLock: false,
      animationClass: 'fade-in'
    });

    if (wordPool.length - (currentWordIndex + 1) <= 3) {
      this.fillWordPool(false);
    }
  },

  playFeedback(answerType) {
    const hapticType = answerType === 'mastered' ? 'medium' : 'light';
    wx.vibrateShort({ type: hapticType });
  },

  getNextReviewTime(answerType, currentStage) {
    if (answerType !== 'mastered') {
      return Date.now() + (60 * 60 * 1000);
    }

    const nextStage = Math.min(currentStage + 1, REVIEW_INTERVALS.length);
    const intervalDays = REVIEW_INTERVALS[nextStage - 1];
    return Date.now() + (intervalDays * 24 * 60 * 60 * 1000);
  },

  buildWordPayload(answerType) {
    const today = getTodayLocalDate();
    const currentWord = this.data.currentWord || {};
    const progress = this.data.currentProgress || {};
    const wordId = currentWord._id;
    const currentStage = Number(progress.stage || 0);
    const nextStage = answerType === 'mastered' ? currentStage + 1 : 0;

    return {
      wordId,
      word_id: wordId,
      word: currentWord.word || '',
      category: currentWord.category || '',
      definition: currentWord.definition || '',
      status: answerType === 'mastered' ? 'mastered' : 'review',
      stage: answerType === 'mastered' ? Math.max(1, nextStage) : 0,
      learn_date: progress.learn_date || today,
      last_review_date: today,
      nextReviewTime: this.getNextReviewTime(answerType, currentStage),
      updatedAt: db.serverDate(),
      user_openid: this.data.userOpenId || ''
    };
  },

  async persistAnswer(answerType) {
    const currentWord = this.data.currentWord;
    if (!currentWord || !currentWord._id) {
      return Promise.resolve();
    }

    const payload = this.buildWordPayload(answerType);
    const wordId = currentWord._id;

    let existingRes = await db.collection(COLLECTIONS.USER_WORDS)
      .where({ wordId })
      .get();

    if (!existingRes.data || !existingRes.data.length) {
      existingRes = await db.collection(COLLECTIONS.USER_WORDS).where({ word_id: wordId }).get();
    }

    console.log('[index] persistAnswer raw length:', (existingRes.data || []).length);

    if (existingRes.data && existingRes.data.length > 0) {
      return db.collection(COLLECTIONS.USER_WORDS).doc(existingRes.data[0]._id).update({ data: payload });
    }

    return db.collection(COLLECTIONS.USER_WORDS).add({ data: payload });
  },

  async submitAnswer(answerType) {
    if (!this.data.currentWord || !this.data.currentWord._id) {
      return;
    }

    if (this.data.hasAnswered && !this.data.isLock) {
      this.loadNextWord(true);
      return;
    }

    if (this.data.isLock) {
      return;
    }

    const feedbackText = answerType === 'mastered' ? '已掌握' : '加入复习队列';
    const nextSessionCount = this.data.sessionCount + 1;
    const nextMasteredCount = this.data.masteredCount + (answerType === 'mastered' ? 1 : 0);
    const nextReviewCount = this.data.reviewCount + (answerType === 'review' ? 1 : 0);

    this.setData({
      isLock: true,
      hasAnswered: true,
      showDefinition: true,
      feedbackType: answerType,
      feedbackText,
      sessionCount: nextSessionCount,
      masteredCount: nextMasteredCount,
      reviewCount: nextReviewCount
    });

    this.playFeedback(answerType);
    
    // 如果是不认识，立即同步一次数据库
    if (answerType === 'review') {
      wx.showLoading({ title: 'Syncing Review...', mask: true });
      try {
        await this.persistAnswer('review');
        console.log('[index] Review status persisted immediately');
      } catch (err) {
        console.error('[index] Immediate persist failed:', err);
      } finally {
        wx.hideLoading();
      }
    } else {
      wx.showLoading({
        title: 'Saving...',
        mask: true
      });
      try {
        await this.persistAnswer(answerType);
        await this.bumpWordCount();
      } catch (error) {
        console.error('[index] submitAnswer failed:', error);
        wx.showToast({
          title: '保存失败，已跳过',
          icon: 'none'
        });
      } finally {
        wx.hideLoading();
      }
    }

    this.setData({ isLock: false });
    this.advanceTimer = setTimeout(() => {
      this.loadNextWord(true);
    }, 800);
  },

  onMastered() {
    this.submitAnswer('mastered');
  },

  onUncertain() {
    this.submitAnswer('review');
  },

  onCategoryChange(e) {
    const categoryIndex = Number(e.detail.value || 0);
    const currentCategory = this.data.categories[categoryIndex] || '全部';

    this.setData({
      categoryIndex,
      currentCategory,
      isReviewMode: false,
      isYesterdayReview: false
    });

    this.loadWords(true);
  },

  toggleReviewMode() {
    this.setData({
      isReviewMode: !this.data.isReviewMode,
      isYesterdayReview: false
    });

    this.loadWords(true);
  },

  openMissionPanel(title, subtitle) {
    wx.hideLoading();
    this.clearAdvanceTimer();
    this.setData({
      currentWord: null,
      currentProgress: null,
      missionComplete: true,
      missionTitle: title,
      missionSubtitle: subtitle,
      emptyMessage: 'Mission Accomplished',
      showDefinition: false,
      hasAnswered: false,
      feedbackType: '',
      feedbackText: '',
      isLock: false,
      loading: false
    });
  },

  async returnHome() {
    // 确保学习时长和状态同步完成后再返回 / Ensure study time and status are synced before returning
    wx.showLoading({ title: 'Final Syncing...', mask: true });
    
    try {
      // 强制执行时长统计同步 / Force sync study statistics
      await this.flushStudyTime(); 
      
      wx.hideLoading();
      wx.navigateBack({
        fail: () => {
          wx.switchTab({
            url: '/pages/home/home'
          });
        }
      });
    } catch (err) {
      console.error('[index] returnHome sync failed:', err);
      wx.hideLoading();
      wx.navigateBack({
        fail: () => {
          wx.switchTab({ url: '/pages/home/home' });
        }
      });
    }
  }
});

