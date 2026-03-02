// Vercel Serverless Function - get submissions (with pagination and status filter)
export default async function handler(req, res) {
  // CORS
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
    const statusFilter = (req.query?.status || 'pending').toString();
    const projectId = 'nano-banana-d0fe0';
    const apiKey = 'AIzaSyBxkZhzbilg15YFUHdEix2DrXQLEa4rpoQ';

    const allDocuments = [];
    let nextPageToken = '';

    do {
      const pageTokenQuery = nextPageToken ? `&pageToken=${encodeURIComponent(nextPageToken)}` : '';
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/pending_submissions?key=${apiKey}${pageTokenQuery}`;

      const response = await fetch(firestoreUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Firestore error:', errorText);
        return res.status(500).json({ success: false, error: `获取投稿失败: ${errorText}` });
      }

      const result = await response.json();
      allDocuments.push(...(result.documents || []));
      nextPageToken = result.nextPageToken || '';
    } while (nextPageToken);

    const submissions = allDocuments
      .map((doc) => {
        const docId = doc.name.split('/').pop();
        const fields = doc.fields || {};

        return {
          id: docId,
          title: fields.title?.stringValue || '',
          content: fields.content?.stringValue || '',
          tags: fields.tags?.arrayValue?.values?.map((v) => v.stringValue) || [],
          images: fields.images?.arrayValue?.values?.map((v) => v.stringValue) || [],
          contributor: fields.contributor?.stringValue || '',
          notes: fields.notes?.stringValue || '',
          action: fields.action?.stringValue || 'create',
          targetId: fields.targetId?.stringValue || null,
          variantIndex: fields.variantIndex?.integerValue !== undefined ? parseInt(fields.variantIndex.integerValue, 10) : null,
          originalTitle: fields.originalTitle?.stringValue || null,
          submissionType: fields.submissionType?.stringValue || '全新投稿',
          status: fields.status?.stringValue || 'pending',
          createdAt: fields.createdAt?.timestampValue || null,
          processedAt: fields.processedAt?.timestampValue || null
        };
      })
      .filter((sub) => statusFilter === 'all' ? true : sub.status === statusFilter)
      .sort((a, b) => {
        const aSortTime = a.processedAt || a.createdAt;
        const bSortTime = b.processedAt || b.createdAt;
        const timeA = aSortTime ? new Date(aSortTime).getTime() : 0;
        const timeB = bSortTime ? new Date(bSortTime).getTime() : 0;
        return timeB - timeA;
      });

    return res.status(200).json({ success: true, data: submissions });
  } catch (error) {
    console.error('Get submissions error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

