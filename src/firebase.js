import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBxkZhzbilg15YFUHdEix2DrXQLEa4rpoQ",
  authDomain: "nano-banana-d0fe0.firebaseapp.com",
  projectId: "nano-banana-d0fe0",
  storageBucket: "nano-banana-d0fe0.firebasestorage.app",
  messagingSenderId: "160420619518",
  appId: "1:160420619518:web:b9be2d60190a6bfb47b1af",
  measurementId: "G-HJD6W7M0V0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// 管理员 UID
const ADMIN_UID = "8jD6GqU7D4P7FZ0P05xrtUUK2qJ2";

// 使用 API 路由提交投稿（绕过 CORS）
export const submitPrompt = async (promptData) => {
  try {
    const response = await fetch('/api/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(promptData)
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("提交失败:", error);
    return { success: false, error: error.message };
  }
};

// 使用 API 路由获取待处理投稿（绕过 CORS）
export const getPendingSubmissions = async () => {
  try {
    const response = await fetch('/api/get-submissions', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("获取投稿失败:", error);
    return { success: false, error: error.message };
  }
};

// 使用 API 路由批准投稿（绕过 CORS）
export const approveSubmission = async (submissionId) => {
  try {
    const response = await fetch('/api/approve-submission', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ submissionId })
    });
    
    const result = await response.json();
    if (!result.success) {
      console.error("批准失败:", result.error);
    }
    return result;
  } catch (error) {
    console.error("批准失败:", error);
    return { success: false, error: error.message };
  }
};

export const rejectSubmission = async (submissionId) => {
  try {
    const docRef = doc(db, "pending_submissions", submissionId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error("删除失败:", error);
    return { success: false, error: error.message };
  }
};

export const uploadImageToFirebase = async (file, path = "submissions") => {
  try {
    const timestamp = Date.now();
    const fileName = `${path}/${timestamp}_${file.name}`;
    const storageRef = ref(storage, fileName);
    
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    
    return { success: true, url: downloadURL };
  } catch (error) {
    console.error("图片上传失败:", error);
    return { success: false, error: error.message };
  }
};

// 认证相关函数
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const isAdmin = user.uid === ADMIN_UID;
    console.log("登录用户 UID:", user.uid, "是否管理员:", isAdmin);
    return { success: true, user, isAdmin };
  } catch (error) {
    console.error("登录失败:", error);
    return { success: false, error: error.message };
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error("登出失败:", error);
    return { success: false, error: error.message };
  }
};

export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      const isAdmin = user.uid === ADMIN_UID;
      callback(user, isAdmin);
    } else {
      callback(null, false);
    }
  });
};

export { db, storage, auth, ADMIN_UID };