App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      /**
       * 云开发初始化环境配置 / CloudBase Initialization
       * 注意：上传 GitHub 前已进行脱敏处理 / Desensitized before uploading to GitHub
       * 开发者请在此处替换为您自己的腾讯云开发环境 ID (在 envConfig.js 中维护)
       * Developers, please replace your own Environment ID in envConfig.js
       */
      const envConfig = require('./envConfig');
      wx.cloud.init({
        env: envConfig.envId,
        traceUser: true,
      });
    }
    this.globalData = {};
  }
});
