import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const PROJECT_ID = 'nano-banana-d0fe0';
const ADMIN_UID = '8jD6GqU7D4P7FZ0P05xrtUUK2qJ2';
const APP_NAME = 'nanobanana-admin';

export async function requireAdmin(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const authorization = req.headers?.authorization;
  const match = typeof authorization === 'string'
    ? authorization.match(/^Bearer\s+(\S+)$/i)
    : null;

  if (!match) {
    res.status(401).json({ success: false, error: '请先登录管理员账户' });
    return null;
  }

  // Auth Emulator tokens do not have production signatures.
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    res.status(500).json({ success: false, error: '管理员认证服务配置错误' });
    return null;
  }

  let decodedToken;
  try {
    // Public-key verification only; Firestore requests retain the user's token.
    const app = getApps().find((item) => item.name === APP_NAME)
      || initializeApp({ projectId: PROJECT_ID }, APP_NAME);
    decodedToken = await getAuth(app).verifyIdToken(match[1]);
  } catch (error) {
    console.error('Admin token verification failed:', error.code);
    const invalidToken = [
      'auth/argument-error',
      'auth/invalid-argument',
      'auth/invalid-id-token',
      'auth/id-token-expired'
    ].includes(error.code);
    res.status(invalidToken ? 401 : 503).json({
      success: false,
      error: invalidToken ? '无法验证登录凭证，请稍后重试或重新登录' : '认证服务暂时不可用，请稍后重试'
    });
    return null;
  }

  if (decodedToken.uid !== ADMIN_UID) {
    res.status(403).json({ success: false, error: '仅管理员可以执行此操作' });
    return null;
  }

  return match[1];
}
