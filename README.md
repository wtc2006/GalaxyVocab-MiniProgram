# 🌌 极光星舰词库 (GalaxyVocab)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-WeChat%20MiniProgram-green.svg)
![Language](https://img.shields.io/badge/language-JavaScript%20%7C%20Python-orange.svg)
![Algorithm](https://img.shields.io/badge/algorithm-Ebbinghaus-red.svg)

> **学子的星际学习终端 —— 穿梭于记忆星云的高效背词引擎。**

GalaxyVocab 是一款基于微信小程序原生框架与云开发（CloudBase）构建的现代化背词应用。它不仅提供了极具科幻感的“极光玻璃拟态”交互界面，更在底层集成了科学的记忆算法与强大的自动化数据处理流。

---

## 🚀 核心技术特色

### 1. 智能复习引擎 (Ebbinghaus Core)
- **艾宾浩斯记忆算法**：根据用户对单词的掌握程度（认识/不认识），自动计算复习周期（1, 2, 4, 7...天），实现科学的时间窗口复习。
- **即时反馈系统**：点击“认识”触发绿色微光与触感反馈，点击“不认识”触发红色呼吸灯，通过多维度感官加强记忆锚点。

### 2. 断点续学与差集查询
- **高效续航**：通过 `last_vocab_index` 偏移量标记，确保用户每次进入学习模式都能无缝衔接，不再重复已学单词。
- **云端差集计算**：利用云数据库 `_.nin` 指令，实现词库与已学名单的实时差集过滤，确保学习流的唯一性与连贯性。

### 3. Python 自动化预处理流
- **词库清洗与格式化**：在 `scripts/` 目录下集成了一套完整的 Python 处理工具，负责从原始文本中提取数据并转换为规范化的 JSON 格式，为小程序提供高质量的数据源。
- **相对路径设计**：脚本支持开箱即用，无需复杂的环境配置。

### 4. 视觉交互：极光玻璃拟态 (Galaxy Glassmorphism)
- **科幻 UI**：基于 CSS 变量与 Backdrop Filter 实现的毛玻璃效果，配合动态背景粒子，营造沉浸式的星际学习氛围。

---

## 📂 项目目录树

```text
MiniProgramProject/
├── pages/                  # 核心业务页面
│   ├── home/               # 首页：任务仪表盘、学习/复习入口
│   └── stats/              # 统计页：学习进度与时长可视化
├── pkg/                    # 分包逻辑
│   └── index/              # 背词核心交互页面
├── scripts/                # Python 词库预处理工具集
│   ├── README.md           # 脚本使用说明文档
│   ├── process_json.py     # 词库整合工具
│   └── extractor.py        # 文本/PDF 提取工具
├── utils/                  # 通用工具函数 (日期处理、云开发封装)
├── app.js                  # 小程序入口与云开发初始化
├── app.json                # 全局配置与 TabBar 设置
├── config.js               # 全局业务常量配置
├── envConfig.js.example    # 环境 ID 配置模板
└── project.config.json.example # 项目配置文件模板
```

---

## 🛠️ 快速开始

1. **环境准备**：
   - 克隆本仓库。
   - 复制 `envConfig.js.example` 为 `envConfig.js` 并填入您的腾讯云环境 ID。
   - 复制 `project.config.json.example` 为 `project.config.json` 并填入您的 AppID。

2. **词库导入**：
   - 将原始词库放入 `json/` 目录。
   - 运行 `python scripts/process_json.py` 进行数据整合。
   - 通过微信开发者工具将生成的 JSON 导入云数据库 `vocabulary` 集合。

3. **开启航行**：
   - 在开发者工具中点击“编译”，即可进入极光星舰。

---

## 📜 开源协议
本项目采用 [MIT License](LICENSE) 开源。欢迎各位航行者提交 PR 或反馈建议。

---
*May the vocab be with you.*
