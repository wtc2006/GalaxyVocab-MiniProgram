﻿const db = wx.cloud.database();
const { fetchDashboardStats } = require('../../utils/util');

Page({
  data: {
    learnCount: 0,
    reviewCount: 0,
    todayTime: 0,
    totalTime: 0
  },

  onShow() {
    this.loadStats();
  },

  async loadStats() {
    try {
      const stats = await fetchDashboardStats(db, db.command);

      this.setData({
        learnCount: stats.todayWords, // 今日已学总数
        reviewCount: stats.todayReviews, // 今日已完成复习数
        todayTime: Math.round(stats.todayStudyTime / 60),
        totalTime: Math.round(stats.totalStudyTime / 60)
      });
    } catch (error) {
      console.error('[stats] loadStats failed:', error);
      this.setData({
        learnCount: 0,
        reviewCount: 0,
        todayTime: 0,
        totalTime: 0
      });
    }
  }
});
