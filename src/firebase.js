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

// 管理�?UID（硬编码�?
const ADMIN_UID = "8jD6GqU7D4P7FZ0P05xrtUUK2qJ2";

export const submitPrompt = async (promptData) => {
  try {
    const docRef = await addDoc(collection(db, "pending_submissions"), {
      ...promptData,
      status: "pending",
      createdAt: serverTimestamp(),
      processedAt: null
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("提交失败:", error);
    return { success: false, error: error.message };
  }
};

export const getPendingSubmissions = async () => {
  try {
    const q = query(
      collection(db, "pending_submissions"),
      where("status", "==", "pending")
    );
    const querySnapshot = await getDocs(q);
    const submissions = [];
    querySnapshot.forEach((doc) => {
      submissions.push({ id: doc.id, ...doc.data() });
    });
    // 在客户端排序
    submissions.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });
    return { success: true, data: submissions };
  } catch (error) {
    console.error("获取投稿失败:", error);
    return { success: false, error: error.message };
  }
};

export const approveSubmission = async (submissionId) => {
  try {
    const docRef = doc(db, "pending_submissions", submissionId);
    await updateDoc(docRef, {
      status: "approved",
      processedAt: serverTimestamp()
    });
    return { success: true };
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

// Authentication 函数
export const loginWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const isAdmin = user.uid === ADMIN_UID;
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

export const checkIsAdmin = (user) => {
  return user?.uid === ADMIN_UID;
};

export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, (user) => {
    const isAdmin = user ? checkIsAdmin(user) : false;
    callback(user, isAdmin);
  });
};

export { db, storage, auth };
