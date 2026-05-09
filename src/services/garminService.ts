import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export class GarminService {
  async initiateAuth() {
    try {
      const response = await fetch('/api/auth/garmin/url');
      const { url } = await response.json();
      
      const authWindow = window.open(
        url,
        'garmin_oauth',
        'width=600,height=720'
      );

      if (!authWindow) {
        throw new Error('Popup blocked. Please enable popups for Synapse.');
      }
    } catch (error) {
      console.error('Garmin Auth Initiation Failed:', error);
      throw error;
    }
  }

  async syncActivities(userId: string) {
    // In a production environment, this would call /api/health/garmin/sync
    // which would use the stored tokens to fetch data from Garmin and update Firestore.
    console.log('Syncing Garmin activities for:', userId);
    
    // Simulating a data pull from Garmin
    const date = new Date().toISOString().split('T')[0];
    const docRef = doc(db, 'dailyStats', `${userId}_${date}`);
    
    // We add a mock delay to simulate actual API calls
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    await updateDoc(docRef, {
      garminSynced: true,
      lastUpdated: serverTimestamp()
    });
  }
}

export const garminService = new GarminService();
