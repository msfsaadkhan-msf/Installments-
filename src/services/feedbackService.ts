import { db } from './firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export interface Suggestion {
  userId: string;
  userName: string;
  userPhone: string;
  text: string;
  createdAt: any;
  status: 'pending' | 'reviewed' | 'implemented';
}

export const submitSuggestion = async (text: string, userName: string, userPhone: string) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    const suggestionData = {
      userId: user?.uid || 'anonymous',
      userName: userName || 'Unknown',
      userPhone: userPhone || 'N/A',
      text: text,
      status: 'pending',
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'suggestions'), suggestionData);
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('Error submitting suggestion:', error);
    return { success: false, error: error.message };
  }
};
