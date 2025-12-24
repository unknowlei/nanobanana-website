// Vercel Serverless Function - 获取待处理投稿（绕过 CORS）
export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const projectId = 'nano-banana-d0fe0';
    const apiKey = 'AIzaSyBxkZhzbilg15YFUHdEix2DrXQLEa4rpoQ';
    
    // 获取所有文档，然后在服务端过滤
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/pending_submissions?key=${apiKey}`;

    const response = await fetch(firestoreUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Firestore error:', errorText);
      return res.status(500).json({ success: false, error: '获取投稿失败: ' + errorText });
    }

    const result = await response.json();
    
    // 解析 Firestore 返回的数据格式
    const submissions = (result.documents || [])
      .map(doc => {
        const docId = doc.name.split('/').pop();
        const fields = doc.fields || {};
        
        return {
          id: docId,
          title: fields.title?.stringValue || '',
          content: fields.content?.stringValue || '',
          tags: fields.tags?.arrayValue?.values?.map(v => v.stringValue) || [],
          images: fields.images?.arrayValue?.values?.map(v => v.stringValue) || [],
          contributor: fields.contributor?.stringValue || '',
          action: fields.action?.stringValue || 'create',
          targetId: fields.targetId?.stringValue || null,
          originalTitle: fields.originalTitle?.stringValue || null,
          submissionType: fields.submissionType?.stringValue || '全新投稿',
          status: fields.status?.stringValue || 'pending',
          createdAt: fields.createdAt?.timestampValue || null
        };
      })
      .filter(sub => sub.status === 'pending') // 只返回待处理的
      .sort((a, b) => {
        // 按创建时间降序排序
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

    return res.status(200).json({ success: true, data: submissions });
  } catch (error) {
    console.error('Get submissions error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
