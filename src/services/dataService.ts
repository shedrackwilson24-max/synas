import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';

export async function exportUserData(userId: string) {
  const data: any = {
    profile: {},
    workouts: [],
    dailyStats: [],
    habits: [],
    personalBests: {}
  };

  // Profile
  const profileSnap = await getDocs(query(collection(db, 'users'), where('__name__', '==', userId)));
  if (!profileSnap.empty) {
    data.profile = profileSnap.docs[0].data();
  }

  // Workouts
  const workoutsSnap = await getDocs(query(collection(db, 'workouts'), where('userId', '==', userId)));
  data.workouts = workoutsSnap.docs.map(doc => doc.data());

  // Daily Stats
  const dailyStatsSnap = await getDocs(query(collection(db, 'dailyStats'), where('userId', '==', userId)));
  data.dailyStats = dailyStatsSnap.docs.map(doc => doc.data());

  // Habits
  const habitsSnap = await getDocs(query(collection(db, 'habits'), where('userId', '==', userId)));
  data.habits = habitsSnap.docs.map(doc => doc.data());

  // Personal Bests
  const pbSnap = await getDocs(query(collection(db, 'personalBests'), where('userId', '==', userId)));
  if (!pbSnap.empty) {
    data.personalBests = pbSnap.docs[0].data();
  }

  return data;
}

export function downloadAsFile(data: any, filename: string, type: 'json' | 'csv' = 'json') {
  let content = '';
  if (type === 'json') {
    content = JSON.stringify(data, null, 2);
  } else {
    // Basic CSV conversion for workouts
    const workouts = data.workouts || [];
    if (workouts.length > 0) {
      const headers = ['Date', 'Duration', 'Exercises'];
      content = headers.join(',') + '\n';
      workouts.forEach((w: any) => {
        const date = w.timestamp?.toDate ? w.timestamp.toDate().toISOString() : new Date().toISOString();
        const row = [
          date,
          w.duration,
          `"${(w.exercises || []).map((e: any) => e.name).join('; ')}"`
        ];
        content += row.join(',') + '\n';
      });
    } else {
      content = 'No workout data available for CSV export.';
    }
  }

  const blob = new Blob([content], { type: type === 'json' ? 'application/json' : 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function importSampleData(userId: string) {
  const batch = writeBatch(db);
  
  // Seed Workouts for last 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const workoutId = `sample_${userId}_${i}`;
    
    batch.set(doc(db, 'workouts', workoutId), {
      userId,
      duration: 1800 + Math.random() * 1800,
      timestamp: date,
      exercises: [
        { name: 'Bench Press', sets: [{ weight: 60 + i * 2, reps: 10 }, { weight: 60 + i * 2, reps: 8 }] },
        { name: 'Squats', sets: [{ weight: 80 + i * 5, reps: 12 }, { weight: 80 + i * 5, reps: 10 }] }
      ]
    });

    const dateStr = date.toISOString().split('T')[0];
    batch.set(doc(db, 'dailyStats', `${userId}_${dateStr}`), {
      userId,
      date: dateStr,
      steps: 5000 + Math.random() * 10000,
      calories: 2000 + Math.random() * 1000,
      distance: 3 + Math.random() * 7,
      restingHeartRate: 55 + Math.random() * 15,
      sleepScore: 60 + Math.random() * 40,
      lastUpdated: serverTimestamp()
    });
  }

  await batch.commit();
}
