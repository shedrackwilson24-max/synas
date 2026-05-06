import { doc, setDoc, updateDoc, collection, query, where, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export interface OTPRecord {
  email: string;
  code: string;
  createdAt: any;
  expiresAt: any;
  used: boolean;
}

export async function generateOTP(email: string): Promise<string | { code: string; simulated: true; warning?: string }> {
  const path = 'otps';
  try {
    // 1. Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 2. Set expiration (e.g., 10 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // 3. Save to Firestore
    const otpRef = doc(collection(db, path));
    try {
      await setDoc(otpRef, {
        email,
        code,
        createdAt: serverTimestamp(),
        expiresAt: expiresAt.toISOString(),
        used: false
      });
    } catch (fsError) {
      handleFirestoreError(fsError, OperationType.CREATE, path);
      throw fsError;
    }

    // 4. Trigger Real Email via Backend
    const response = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });

    const text = await response.text();
    let result: any;
    try {
      result = JSON.parse(text);
    } catch (e) {
      throw new Error(JSON.stringify({
        error: 'Neural broadcast failed',
        details: `Invalid server response format (HTML detected). Status: ${response.status}`,
        isApiError: true
      }));
    }

    if (!response.ok) {
      throw new Error(JSON.stringify({ 
        error: result.error || 'Neural broadcast failed',
        details: result.details,
        isApiError: true 
      }));
    }

    console.log(`[DISPATCHED] Synapse code sent to ${email}`);
    
    if (result.simulated) {
      return { 
        code, 
        simulated: true, 
        warning: result.warning 
      };
    }
    
    return code;
  } catch (error: any) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed.isApiError) throw error;
    } catch (e: any) {
      if (e === error) throw e;
    }
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function verifyOTP(email: string, code: string): Promise<boolean> {
  const path = 'otps';
  try {
    const q = query(
      collection(db, path),
      where('email', '==', email),
      where('code', '==', code),
      where('used', '==', false)
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) return false;

    const otpDoc = querySnapshot.docs[0];
    const data = otpDoc.data() as OTPRecord;
    
    // Check expiration
    const expiresAt = new Date(data.expiresAt);
    if (new Date() > expiresAt) {
      await updateDoc(otpDoc.ref, { used: true });
      return false;
    }

    // Mark as used
    await updateDoc(otpDoc.ref, { used: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    throw error;
  }
}

export async function cleanupOldOTPs(email: string) {
  const path = 'otps';
  try {
    const q = query(
      collection(db, path),
      where('email', '==', email)
    );
    
    const querySnapshot = await getDocs(q);
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}
