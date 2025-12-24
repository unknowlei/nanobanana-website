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
    
    // 使用 Firebase REST API 查询 Firestore
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;

    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: 'pending_submissions' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'status' },
            op: 'EQUAL',
            value: { stringValue: 'pending' }
          }
        },
        orderBy: [
          {
            field: { fieldPath: 'createdAt' },
            direction: 'DESCENDING'
          }
        ]
      }
    };

    const response = await fetch(firestoreUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(queryBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Firestore error:', errorText);
      return res.status(500).json({ success: false, error: '获取投稿失败' });
    }

    const results = await response.json();
    
    // 解析 Firestore 返回的数据格式
    const submissions = results
      .filter(item => item.document) // 过滤空结果
      .map(item => {
        const doc = item.document;
        const docId = doc.name.split('/').pop();
        const fields = doc.fields;
        
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
      });

    return res.status(200).json({ success: true, data: submissions });
  } catch (error) {
    console.error('Get submissions error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
