# 大香蕉提示词网站 - Firebase 投稿系统使用说明

## 功能概述

本次更新将投稿系统从邮件提交改为 Firebase 云数据库存储，实现了完整的管理员审核流程。

## 主要功能

### 1. 用户投稿功能
- **投稿方式**：用户点击"投稿"按钮，填写表单后直接提交到 Firebase 数据库
- **支持的投稿类型**：
  - 新建提示词
  - 修改现有提示词
  - 提交变体提示词
- **投稿内容**：标题、Prompt内容、配图、标签、投稿人ID

### 2. 管理员审核功能
- **待处理面板**：管理员模式下，点击顶部橙色时钟图标打开待审核面板
- **查看投稿详情**：
  - 显示投稿标题、类型、投稿人
  - 显示完整的 Prompt 内容
  - 预览所有配图（清晰的提示词例图）
  - 显示标签信息
- **审核操作**：
  - **批准**：直接批准投稿，自动添加到相应分区
  - **编辑后批准**：先编辑内容再批准
  - **拒绝**：删除投稿

### 3. 智能分区分配
- **新建投稿**：默认添加到第一个分区
- **修改投稿**：更新原提示词内容
- **变体投稿**：自动添加到原提示词的 similar 数组，保持在原分区

## Firebase 配置

已配置的 Firebase 服务：
- **Firestore Database**：存储待审核投稿
- **Storage**：存储上传的图片（可选）

数据库集合：`pending_submissions`

## 使用流程

### 用户端
1. 访问网站
2. 点击右上角"投稿"按钮
3. 填写表单（标题、内容、上传图片、选择标签）
4. 点击"立即投稿"
5. 等待管理员审核

### 管理员端
1. 使用指定管理员的 Google 账号登录
2. 点击顶部橙色时钟图标打开待审核面板
3. 查看投稿列表，点击"查看详情"展开
4. 查看完整的 Prompt 内容和配图预览
5. 选择操作：
   - **批准**：投稿直接生效
   - **编辑后批准**：修改内容后批准
   - **拒绝**：删除投稿

## 技术实现

### 文件结构
```
src/
├── firebase.js          # Firebase 配置和 API 函数
├── App.jsx             # 主应用组件（已集成审核功能）
└── ...
```

### 核心函数
- `submitPrompt()` - 提交投稿到 Firebase
- `getPendingSubmissions()` - 获取待审核投稿列表
- `approveSubmission()` - 批准投稿
- `rejectSubmission()` - 拒绝投稿

### 新增组件
- `PendingSubmissionsPanel` - 待审核面板组件
- 修改了 `SubmissionModal` - 使用 Firebase 代替邮件

## 注意事项

1. **Firebase 安全规则**：在 Firebase 控制台发布仓库根目录 `firestore.rules`，部署步骤见 [AUTH_SETUP.md](./AUTH_SETUP.md)
2. **图片存储**：当前使用 ImgBB，可选择迁移到 Firebase Storage
3. **数据持久化**：审核通过的数据存储在本地 localStorage，建议定期导出备份

## Firebase 安全规则

以 [firestore.rules](./firestore.rules) 为唯一部署来源，发布到项目 `nano-banana-d0fe0`：

- 普通投稿无需登录，创建状态必须为 `pending`，`processedAt` 必须为 `null`。
- 投稿的读取、更新和删除仅限管理员 UID `8jD6GqU7D4P7FZ0P05xrtUUK2qJ2`。
- 管理 API 接收 Firebase ID token，由后端验证所属项目及管理员 UID 后执行操作。
- 公开浏览保持现有流程。

## 下一步优化建议

1. 实现图片上传到 Firebase Storage
2. 添加投稿通知功能
3. 实现批量审核功能
4. 添加审核历史记录
