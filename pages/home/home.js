﻿const db = wx.cloud.database();
const { getTodayLocalDate, fetchDashboardStats } = require('../../utils/util');

Page({
  data: {
    day: '',
    month: '',
    hasCheckedIn: false,
    learnCount: 0,
    reviewCount: 0
  },

  onLoad() {
    this.updateDate();
  },

  onShow() {
    this.loadTaskCounts();
    this.checkStatus();
  },

  updateDate() {
    const now = new Date();
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    this.setData({
      day: String(now.getDate()).padStart(2, '0'),
      month: months[now.getMonth()]
    });
  },

  /**
   * 加载任务计数
   * 逻辑说明：
   * 1. 调用 fetchDashboardStats 统一获取今日进度和待复习数。
   * 2. learnCount: 展示形式为 "已学/目标" (如 12/50)。
   * 3. reviewCount: 包含 (历史遗留未掌握) + (标记为需复习) 的总数。
   */
  async loadTaskCounts() {
    try {
      const stats = await fetchDashboardStats(db, db.command);
      this.setData({
        learnCount: stats.learnProgress,
        reviewCount: stats.reviewDueCount
      });
    } catch (error) {
      console.error('[home] loadTaskCounts failed:', error);
      this.setData({
        learnCount: 0,
        reviewCount: 0
      });
    }
  },

  checkStatus() {
    const lastCheckIn = wx.getStorageSync('last_checkin_date');
    const today = getTodayLocalDate();

    this.setData({
      hasCheckedIn: lastCheckIn === today
    });
  },

  handleCheckIn() {
    if (this.data.hasCheckedIn) {
      return;
    }

    const today = getTodayLocalDate();
    wx.setStorageSync('last_checkin_date', today);
    this.setData({ hasCheckedIn: true });
    wx.showToast({ title: '签到成功', icon: 'success' });
  },

  startLearn() {
    console.log('[home] navigate -> /pkg/index/index?mode=learn');
    wx.navigateTo({
      url: '/pkg/index/index?mode=learn'
    });
  },

  startReview() {
    console.log('[home] navigate -> /pkg/index/index?mode=yesterday_review');
    wx.navigateTo({
      url: '/pkg/index/index?mode=yesterday_review'
    });
  }
});
