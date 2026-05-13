import { db } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.body.read https://www.googleapis.com/auth/fitness.heart_rate.read https://www.googleapis.com/auth/fitness.sleep.read';

export interface GoogleFitData {
  steps: number;
  calories: number;
  distance: number;
  heartRate: number;
  sleepScore: number;
}

class GoogleFitService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  async authorize(): Promise<boolean> {
    if (!CLIENT_ID) {
      console.error('VITE_GOOGLE_CLIENT_ID is not defined');
      return false;
    }

    if (!(window as any).google?.accounts?.oauth2) {
      console.error('Google Identity Services script not loaded');
      return false;
    }

    return new Promise((resolve) => {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response: any) => {
          if (response.access_token) {
            this.accessToken = response.access_token;
            this.tokenExpiry = Date.now() + (response.expires_in * 1000);
            localStorage.setItem('synapse_google_token', this.accessToken);
            localStorage.setItem('synapse_google_token_expiry', this.tokenExpiry.toString());
            resolve(true);
          } else {
            console.warn('Google Auth completed without token:', response);
            resolve(false);
          }
        },
        error_callback: (err: any) => {
          if (err.type === 'popup_closed') {
            console.info('Synapse Sync: User closed the authorization window.');
          } else {
            console.error('Synapse Sync: GSI Client Error:', err);
          }
          resolve(false);
        }
      });

      // Show consent prompt to ensure user can select account if they were previously blocked
      client.requestAccessToken({ prompt: 'consent' });
    });
  }

  private async getValidToken(): Promise<string | null> {
    const savedToken = localStorage.getItem('synapse_google_token');
    const savedExpiry = localStorage.getItem('synapse_google_token_expiry');

    if (savedToken && savedExpiry && Date.now() < parseInt(savedExpiry)) {
      this.accessToken = savedToken;
      return savedToken;
    }

    return null; // Don't auto-authorize to avoid unexpected popups
  }

  async fetchHealthData(startTimeMillis: number, endTimeMillis: number): Promise<Partial<GoogleFitData>> {
    const token = await this.getValidToken();
    if (!token) return {};

    try {
      const response = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aggregateBy: [
            { dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps' },
            { dataSourceId: 'derived:com.google.calories.burned:com.google.android.gms:merge_calories_burned' },
            { dataSourceId: 'derived:com.google.distance.delta:com.google.android.gms:merge_distance_delta' },
            { dataSourceId: 'derived:com.google.heart_rate.bpm:com.google.android.gms:merge_heart_rate_bpm' },
            { dataTypeName: 'com.google.sleep.segment' }
          ],
          bucketByTime: { durationMillis: endTimeMillis - startTimeMillis },
          startTimeMillis,
          endTimeMillis,
        }),
      });

      if (!response.ok) throw new Error(`Google Fit API error: ${response.statusText}`);

      const data = await response.json();
      const bucket = data.bucket?.[0];
      if (!bucket) return {};

      const stats: any = {};

      bucket.dataset.forEach((ds: any) => {
        const points = ds.point || [];
        if (points.length === 0) return;

        // For activity counters, we sum up. For state metrics (HR), we average or take last.
        if (ds.dataSourceId?.includes('step_count')) {
          stats.steps = points[0].value[0].intVal;
        } else if (ds.dataSourceId?.includes('calories')) {
          stats.calories = points[0].value[0].fpVal;
        } else if (ds.dataSourceId?.includes('distance')) {
          stats.distance = (points[0].value[0].fpVal || 0) / 1000;
        } else if (ds.dataSourceId?.includes('heart_rate')) {
          stats.restingHeartRate = points[0].value[0].fpVal;
        }
      });

      // Special handling for sleep (simplified for demo: count hours in range)
      const sleepDs = bucket.dataset.find((ds: any) => ds.dataTypeName === 'com.google.sleep.segment');
      if (sleepDs?.point?.length > 0) {
        let totalSleepMillis = 0;
        sleepDs.point.forEach((p: any) => {
          totalSleepMillis += (p.endTimeNanos - p.startTimeNanos) / 1000000;
        });
        // Convert to a 0-100 score based on 8h goal
        const hours = totalSleepMillis / (1000 * 60 * 60);
        stats.sleepScore = Math.min(100, Math.round((hours / 8) * 100));
      }

      return stats;
    } catch (error) {
      console.error('Error fetching Google Fit data:', error);
      return {};
    }
  }

  async syncToFirestore(userId: string) {
    const now = Date.now();
    const startOfDay = new Date().setHours(0, 0, 0, 0);
    
    const data = await this.fetchHealthData(startOfDay, now);
    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) return;

    const date = new Date().toISOString().split('T')[0];
    const docId = `${userId}_${date}`;
    const docRef = doc(db, 'dailyStats', docId);

    await updateDoc(docRef, {
      ...data,
      lastUpdated: serverTimestamp()
    });
  }
}

export const googleFitService = new GoogleFitService();
