// Vercel Serverless Function - 投稿提交（绕过 CORS）
export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { title, content, tags, images, contact } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, error: '标题和内容不能为空' });
    }

    const projectId = 'nano-banana-d0fe0';
    const apiKey = 'AIzaSyBxkZhzbilg15YFUHdEix2DrXQLEa4rpoQ';
    
    // 使用 Firebase REST API 写入 Firestore
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/pending_submissions?key=${apiKey}`;

    const document = {
      fields: {
        title: { stringValue: title },
        content: { stringValue: Array.isArray(content) ? content.join('\n') : content },
        tags: { arrayValue: { values: (tags || []).map(t => ({ stringValue: t })) } },
        images: { arrayValue: { values: (images || []).map(i => ({ stringValue: i })) } },
        contact: { stringValue: contact || '' },
        status: { stringValue: 'pending' },
        createdAt: { timestampValue: new Date().toISOString() },
        processedAt: { nullValue: null }
      }
    };

    const response = await fetch(firestoreUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(document)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Firestore error:', errorText);
      return res.status(500).json({ success: false, error: '提交失败，请稍后重试' });
    }

    const result = await response.json();
    const docId = result.name.split('/').pop();

    return res.status(200).json({ success: true, id: docId });
  } catch (error) {
    console.error('Submit error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
