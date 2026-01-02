// Vercel Serverless Function: 批准投稿
// 使用 Firebase REST API 删除已批准的投稿，绕过 CORS 问题

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持 POST 请求' });
  }

  try {
    const { submissionId } = req.body;

    if (!submissionId) {
      return res.status(400).json({ error: '缺少 submissionId 参数' });
    }

    // Firebase 配置
    const projectId = 'nano-banana-d0fe0';
    const apiKey = 'AIzaSyBxkZhzbilg15YFUHdEix2DrXQLEa4rpoQ';
    const collection = 'pending_submissions';
    
    // 使用 Firebase REST API 删除文档（批准后从待处理分区移除）
    const deleteUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${submissionId}?key=${apiKey}`;

    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Firebase 删除失败:', errorText);
      return res.status(500).json({
        error: '删除投稿失败',
        details: errorText
      });
    }

    console.log('投稿已批准并从待处理分区删除:', submissionId);

    return res.status(200).json({
      success: true,
      message: '投稿已批准并从待处理分区删除',
      submissionId
    });

  } catch (error) {
    console.error('批准投稿时出错:', error);
    return res.status(500).json({
      error: '服务器内部错误',
      details: error.message
    });
  }
}
