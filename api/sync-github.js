// Vercel Serverless Function - 同步数据�?GitHub
export default async function handler(req, res) {
  // 只允�?POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { sections, commonTags, siteNotes } = req.body;

    // 验证数据
    if (!sections || !Array.isArray(sections)) {
      return res.status(400).json({ success: false, error: 'Invalid data format' });
    }

    // 从环境变量获�?GitHub Token
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO || 'unknowlei/nanobanana-data';
    const GITHUB_FILE_PATH = process.env.GITHUB_FILE_PATH || 'data%20(84).json';

    if (!GITHUB_TOKEN) {
      return res.status(500).json({ success: false, error: 'GitHub token not configured' });
    }

    // 准备要上传的数据
    const dataToUpload = {
      sections,
      commonTags,
      siteNotes,
      lastUpdated: new Date().toISOString()
    };

    // 1. 先获取文件的当前 SHA（GitHub API 要求�?
    const getFileUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;
    const getFileResponse = await fetch(getFileUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    let sha = null;
    if (getFileResponse.ok) {
      const fileData = await getFileResponse.json();
      sha = fileData.sha;
    }

    // 2. 将数据转换为 Base64
    const content = Buffer.from(JSON.stringify(dataToUpload, null, 2)).toString('base64');

    // 3. 更新或创建文�?
    const updateFileUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;
    const updatePayload = {
      message: `更新数据 - ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
      content: content,
      ...(sha && { sha }) // 如果文件存在，需要提�?SHA
    };

    const updateResponse = await fetch(updateFileUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      console.error('GitHub API Error:', errorData);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update GitHub',
        details: errorData.message 
      });
    }

    const result = await updateResponse.json();
    
    return res.status(200).json({ 
      success: true, 
      message: '同步成功',
      commit: result.commit
    });

  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
