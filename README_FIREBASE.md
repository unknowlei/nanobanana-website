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
1. 切换到管理员模式（点击5次锁图标）
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

1. **Firebase 安全规则**：需要在 Firebase 控制台配置适当的安全规则
2. **图片存储**：当前使用 ImgBB，可选择迁移到 Firebase Storage
3. **数据持久化**：审核通过的数据存储在本地 localStorage，建议定期导出备份

## Firebase 安全规则建议

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /pending_submissions/{document} {
      // 允许所有人创建投稿
      allow create: if true;
      // 只允许读取和删除（管理员操作）
      allow read, update, delete: if request.auth != null;
    }
  }
}
```

## 下一步优化建议

1. 添加管理员身份验证（Firebase Authentication）
2. 实现图片上传到 Firebase Storage
3. 添加投稿通知功能
4. 实现批量审核功能
5. 添加审核历史记录
