// 这是一个 Vercel 云函数，专门用来中转图片到 Catbox
// 它运行在服务器端，可以绕过浏览器的跨域限制
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body; // 获取前端发来的 Base64 图片数据 (不带 data:image/... 前缀)

    if (!image) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // 构造 Catbox 需要的表单数据
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    
    // 将 Base64 转换为 Buffer，再转为 Blob
    const buffer = Buffer.from(image, 'base64');
    const blob = new Blob([buffer], { type: 'image/jpeg' });
    
    formData.append('fileToUpload', blob, 'upload.jpg');

    // 发送给 Catbox 官方接口
    const response = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Catbox API responded with ${response.status}`);
    }

    const url = await response.text(); // Catbox 直接返回 URL 文本

    if (url.startsWith('http')) {
      return res.status(200).json({ success: true, url: url });
    } else {
      return res.status(500).json({ success: false, error: url });
    }

  } catch (error) {
    console.error('Upload Error:', error);
    return res.status(500).json({ error: 'Failed to upload to Catbox', details: error.message });
  }
}
