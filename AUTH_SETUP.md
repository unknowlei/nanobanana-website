# 🔐 Firebase 登录 + GitHub 自动同步配置指南

## 📋 概述

本指南将帮助你完成：
1. **Firebase Authentication 配置**（Google 登录）
2. **GitHub Personal Access Token 生成**
3. **Vercel 环境变量配置**

---

## 第一步：配置 Firebase Authentication

### 1. 启用 Google 登录

1. 访问 [Firebase Console](https://console.firebase.google.com/)
2. 选择你的项目：`nano-banana-d0fe0`
3. 左侧菜单 → **Authentication** → **Sign-in method**
4. 点击 **Google** → **启用**
5. 选择一个支持电子邮件（例如你的 Gmail）
6. 点击**保存**

### 2. 添加授权域名

在 **Authentication** → **Settings** → **Authorized domains**：
- 确保包含：
  - `localhost`（本地测试）
  - 你的 Vercel 域名（例如：`your-site.vercel.app`）

---

## 第二步：生成 GitHub Personal Access Token

### 1. 访问 GitHub Settings

1. 登录 GitHub
2. 点击右上角头像 → **Settings**
3. 左侧菜单最底部 → **Developer settings**
4. 点击 **Personal access tokens** → **Tokens (classic)**
5. 点击 **Generate new token** → **Generate new token (classic)**

### 2. 配置 Token

- **Note（备注）**：`Nanobanana Website Sync`
- **Expiration（过期时间）**：选择 `No expiration`（永不过期）或自定义
- **Select scopes（权限）**：
  - ✅ **repo**（完整的仓库访问权限）
    - 这会自动勾选所有子选项

### 3. 生成并保存 Token

1. 点击底部的 **Generate token**
2. **重要**：复制生成的 Token（类似：`ghp_xxxxxxxxxxxxxxxxxxxx`）
3. **保存到安全的地方**（只会显示一次！）

---

## 第三步：配置 Vercel 环境变量

### 1. 访问 Vercel 项目设置

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目（nanobanana-website）
3. 点击 **Settings** → **Environment Variables**

### 2. 添加环境变量

添加以下 3 个环境变量：

#### 变量 1：GITHUB_TOKEN
- **Key**: `GITHUB_TOKEN`
- **Value**: 你刚才生成的 GitHub Token（`ghp_xxxxxxxxxxxxxxxxxxxx`）
- **Environment**: 勾选 `Production`, `Preview`, `Development`
- 点击 **Save**

#### 变量 2：GITHUB_REPO
- **Key**: `GITHUB_REPO`
- **Value**: `unknowlei/nanobanana-data`
- **Environment**: 勾选 `Production`, `Preview`, `Development`
- 点击 **Save**

#### 变量 3：GITHUB_FILE_PATH
- **Key**: `GITHUB_FILE_PATH`
- **Value**: `data%20(84).json`
- **Environment**: 勾选 `Production`, `Preview`, `Development`
- 点击 **Save**

### 3. 重新部署

配置完环境变量后：
1. 回到 **Deployments** 页面
2. 点击最新的部署 → **Redeploy**
3. 或者推送新的代码到 GitHub 触发自动部署

---

## 第四步：本地测试

### 1. 创建本地环境变量文件

在项目根目录创建 `.env.local` 文件：

```env
GITHUB_TOKEN=ghp_你的GitHub_Token
GITHUB_REPO=unknowlei/nanobanana-data
GITHUB_FILE_PATH=data%20(84).json
```

**重要**：`.env.local` 已在 `.gitignore` 中，不会被提交到 Git

### 2. 启动开发服务器

```bash
npm run dev
# 或
vercel dev
```

### 3. 测试功能

1. **测试登录**：
   - 点击右上角"登录"按钮
   - 使用 Google 账号登录（`1049573774@qq.com`）
   - 应该显示"管理员登录成功"

2. **测试同步到 GitHub**：
   - 登录后，右上角会出现绿色的"上传"按钮
   - 点击按钮
   - 确认同步
   - 等待提示"同步成功"
   - 访问你的 GitHub 仓库确认文件已更新

---

## 🎯 功能说明

### 登录系统

- **未登录**：显示"登录"按钮
- **已登录（管理员）**：显示"管理员"按钮，可以访问所有管理功能
- **已登录（非管理员）**：显示邮箱，但无法访问管理功能（会自动登出）

### 同步到 GitHub

- **触发方式**：点击右上角绿色"上传"按钮
- **同步内容**：
  - 所有分区数据（`sections`）
  - 通用标签（`commonTags`）
  - 网站公告（`siteNotes`）
  - 更新时间戳
- **同步结果**：
  - 自动创建 Git commit
  - Commit 信息：`更新数据 - 2025-12-23 19:30:00`
  - 可在 GitHub 仓库查看提交历史

---

## 🔒 安全说明

### GitHub Token 安全

- ✅ Token 存储在 Vercel 环境变量中（服务器端）
- ✅ 前端代码无法访问 Token
- ✅ Token 不会出现在浏览器中
- ⚠️ 不要将 Token 提交到 Git 仓库
- ⚠️ 不要在前端代码中硬编码 Token

### 管理员验证

- ✅ 使用 Firebase UID 验证（`kt3i3s8SdibmJ81DNGONE6YZUHZ2`）
- ✅ UID 无法伪造
- ✅ 只有你的 Google 账号可以成为管理员
- ✅ 其他人登录会被自动登出

---

## 🐛 常见问题

### Q1: 登录后提示"您不是管理员账户"

**原因**：你使用的 Google 账号不是 `1049573774@qq.com`

**解决**：
1. 确保使用正确的 Google 账号登录
2. 如果需要更换管理员账号，修改 `src/firebase.js` 中的 `ADMIN_UID`

### Q2: 同步失败，提示"GitHub token not configured"

**原因**：Vercel 环境变量未配置或未生效

**解决**：
1. 检查 Vercel 环境变量是否正确添加
2. 重新部署项目
3. 等待几分钟让环境变量生效

### Q3: 同步失败，提示"Failed to update GitHub"

**原因**：GitHub Token 权限不足或已过期

**解决**：
1. 重新生成 GitHub Token
2. 确保勾选了 `repo` 权限
3. 更新 Vercel 环境变量

### Q4: 本地测试时同步失败

**原因**：本地环境变量未配置

**解决**：
1. 创建 `.env.local` 文件
2. 添加 `GITHUB_TOKEN` 等变量
3. 重启开发服务器

---

## 📚 相关文档

- [Firebase Authentication 文档](https://firebase.google.com/docs/auth)
- [GitHub Personal Access Tokens 文档](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [Vercel 环境变量文档](https://vercel.com/docs/concepts/projects/environment-variables)

---

## ✅ 完成检查清单

- [ ] Firebase Authentication 已启用 Google 登录
- [ ] 授权域名已添加
- [ ] GitHub Personal Access Token 已生成
- [ ] Vercel 环境变量已配置（3个）
- [ ] 项目已重新部署
- [ ] 本地 `.env.local` 已创建（可选）
- [ ] 登录功能测试通过
- [ ] 同步到 GitHub 功能测试通过

---

🎉 配置完成后，你就可以：
1. 使用 Google 账号安全登录
2. 一键同步数据到 GitHub
3. 不再需要手动导出/上传 JSON 文件
