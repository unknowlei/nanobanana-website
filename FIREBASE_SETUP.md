# Firebase 配置步骤（必须完成才能使用投稿功能）

## ⚠️ 重要：必须配置安全规则

普通投稿需要允许创建待审核记录；投稿的读取、更新和删除仅限指定管理员 UID。

## 🔧 配置步骤

### 1. 配置 Firestore 安全规则

1. 访问 [Firebase Console](https://console.firebase.google.com/)
2. 选择项目：`nano-banana-d0fe0`
3. 左侧菜单选择 **Firestore Database**
4. 点击顶部 **规则** 标签
5. 将规则替换为仓库根目录 [firestore.rules](./firestore.rules) 的完整内容，这是规则的唯一部署来源
6. 点击 **发布** 按钮
7. 等待几秒钟让规则生效

先部署包含新前端和 API 的 Vercel 版本，再立即发布此规则。Vercel 不会自动发布 Firestore 规则。完整部署配置见 [AUTH_SETUP.md](./AUTH_SETUP.md)。

### 2. 创建 Firestore 索引（可选，但推荐）

1. 在 Firestore Database 页面
2. 点击 **索引** 标签
3. 点击 **创建索引**
4. 配置：
   - 集合ID: `pending_submissions`
   - 字段1: `status` (升序)
   - 字段2: `createdAt` (降序)
   - 查询范围: Collection
5. 点击 **创建**
6. 等待索引构建完成（通常1-5分钟）

### 3. 验证配置

配置完成后：
1. 刷新网站
2. 尝试投稿
3. 应该能看到 "🎉 投稿成功！" 的提示

## 🔒 权限说明

- 项目：`nano-banana-d0fe0`。
- 普通投稿无需登录，创建时必须为 `status: 'pending'`、`processedAt: null`。
- 读取、更新和删除 `pending_submissions` 仅允许已验证的管理员 UID `8jD6GqU7D4P7FZ0P05xrtUUK2qJ2`。
- 其他集合默认拒绝访问；公开浏览继续使用现有公开数据。

## 📝 测试投稿功能

### 方法1：使用 Vercel Dev（当前）
```bash
vercel dev
```
访问 http://localhost:3000

### 仅预览前端：使用 Vite Dev Server
```bash
npm run dev
```
访问 http://localhost:5173

此方式不执行 `/api/*`，投稿和管理接口需要使用上面的 `vercel dev` 或 Vercel 部署环境。

### 方法3：部署到 Vercel 预览环境
```bash
vercel
```
会生成一个预览链接，可以在线测试

## ❓ 常见问题

### Q: 投稿一直显示"投稿中"
**A:** 检查浏览器控制台（F12），如果看到 "permission-denied" 错误，说明安全规则未配置。

### Q: 显示 "The query requires an index"
**A:** 需要创建索引（见上方步骤2），或者代码已改为客户端排序，可以忽略。

### Q: 管理员看不到投稿
**A:** 确保：
1. 已刷新页面并使用指定管理员的 Google 账号登录
2. 点击了时钟图标打开待审核面板
3. Firebase 中确实有数据（可在 Firebase Console 查看）

## 🚀 部署后的使用

部署到 Vercel 后，投稿功能会正常工作，只要：
1. ✅ 新前端和 API 已部署，并已在正确项目发布 `firestore.rules`
2. ✅ Firebase 索引已创建（可选）
3. ✅ 网站能访问 Firebase API

管理员接口运行环境和现有 GitHub 配置见 [AUTH_SETUP.md](./AUTH_SETUP.md)。
