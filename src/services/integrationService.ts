import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export interface IntegrationState {
  googleFit: boolean;
  appleHealth: boolean;
  garmin: boolean;
  lastSynced: any;
}

export class IntegrationService {
  async getIntegrationState(userId: string): Promise<IntegrationState> {
    const docRef = doc(db, 'user_integrations', userId);
    try {
      const snap = await getDoc(docRef);
      
      if (!snap.exists()) {
        const initialState: IntegrationState = {
          googleFit: false,
          appleHealth: false,
          garmin: false,
          lastSynced: null
        };
        await setDoc(docRef, initialState);
        return initialState;
      }
      
      return snap.data() as IntegrationState;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `user_integrations/${userId}`);
      throw error;
    }
  }

  subscribeToIntegrations(userId: string, callback: (state: IntegrationState) => void) {
    const path = `user_integrations/${userId}`;
    return onSnapshot(doc(db, 'user_integrations', userId), (snap) => {
      if (snap.exists()) {
        callback(snap.data() as IntegrationState);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  }

  async updateIntegration(userId: string, provider: keyof Omit<IntegrationState, 'lastSynced'>, enabled: boolean) {
    const docRef = doc(db, 'user_integrations', userId);
    await updateDoc(docRef, {
      [provider]: enabled,
      lastSynced: serverTimestamp()
    });
  }

  async syncAll(userId: string, integrations: IntegrationState) {
    const promises = [];
    
    // Lazy imports to avoid circular dependencies if any
    const { googleFitService } = await import('./googleFitService');
    const { appleHealthService } = await import('./appleHealthService');
    const { garminService } = await import('./garminService');

    if (integrations.googleFit) {
      promises.push(googleFitService.syncToFirestore(userId));
    }
    if (integrations.appleHealth) {
      promises.push(appleHealthService.syncData(userId));
    }
    if (integrations.garmin) {
      promises.push(garminService.syncActivities(userId));
    }

    if (promises.length > 0) {
      await Promise.all(promises);
      const docRef = doc(db, 'user_integrations', userId);
      await updateDoc(docRef, { lastSynced: serverTimestamp() });
    }
  }
}

export const integrationService = new IntegrationService();
