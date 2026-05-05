import { GoogleGenAI, Type } from "@google/genai";
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';

let genAI: any = null;

function getAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined');
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

export async function generateWorkoutPlan(userId: string) {
  const userPath = `users/${userId}`;
  const planPath = `workoutPlans/${userId}`;
  try {
    const ai = getAI();
    // 1. Get user profile
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('User profile not found');
    }
    const profile = userDoc.data();

    // 2. Prepare prompt for Gemini
    const systemInstruction = `You are an elite fitness coach and synapse optimization expert. 
    Create a concise 7-day workout plan strictly following the provided schema. 
    Do not include preamble or unnecessary text. 
    Each day must have 3-5 high-impact exercises.`;

const prompt = `Create a 7-day workout plan for:
    - Name: ${profile.name || 'Athlete'}
    - Age: ${profile.age || 'Not specified'}
    - Fitness Goal: ${profile.goal || 'General Fitness'}
    - Activity Level: ${profile.activity_level || 'Moderate'}`;

    // 3. Call Gemini API with Robust Retry Logic
    console.log('Initiating synapse sync with biometrics...');
    
    let response;
    let retries = 3;
    let delay = 3000;
    while (retries >= 0) {
      try {
        response = await ai.models.generateContent({
          model: "gemini-3-flash-preview", // Flash is more resilient to load and fast
          contents: prompt,
          config: {
            systemInstruction: systemInstruction + " MANDATORY: Response must be valid JSON only. Do not truncate the JSON. Full 7-day schedule required.",
            responseMimeType: "application/json",
            maxOutputTokens: 2500, // Increased buffer
            temperature: 0.1, // Near-zero for highest consistency
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                week_schedule: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      day: { type: Type.STRING },
                      focus: { type: Type.STRING },
                      exercises: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            name: { type: Type.STRING },
                            sets: { type: Type.NUMBER },
                            reps: { type: Type.STRING },
                            rest: { type: Type.STRING }
                          },
                          required: ["name", "sets", "reps", "rest"]
                        }
                      }
                    },
                    required: ["day", "focus", "exercises"]
                  }
                }
              },
              required: ["week_schedule"]
            }
          }
        });
        break; // Success
      } catch (err: any) {
        const errorMsg = err.message || '';
        const isRateLimit = errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED');
        
        if (retries > 0 && isRateLimit) {
          console.warn(`Synapse core saturated. Retrying in ${delay}ms... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retries--;
          delay *= 2; // Exponential backoff
          continue;
        }
        throw err;
      }
    }

    if (!response) {
      throw new Error('Connection to synapse core lost.');
    }

    const text = response.text;
    if (!text) {
      console.error('Gemini returned an empty response object:', response);
      throw new Error('Synapse core returned an empty response. Re-initiating sync...');
    }

    // Advanced sanitize: remove potential markdown markers and leading/trailing whitespace
    const sanitizedText = text.replace(/```json\n?|```/g, '').trim();
    
    let planData;
    try {
      planData = JSON.parse(sanitizedText);
    } catch (parseError) {
      console.error('Failed to parse synapse plan. RAW TEXT:', sanitizedText);
      throw new Error(`Synapse sync corruption detected: Malformed data received from core.`);
    }

    if (!planData.week_schedule || !Array.isArray(planData.week_schedule)) {
      throw new Error('Synapse sync corruption: Invalid data structure received.');
    }

    // 4. Store in Firestore
    const workoutPlan = {
      userId,
      generated_at: serverTimestamp(),
      week_schedule: planData.week_schedule
    };

    await setDoc(doc(db, 'workoutPlans', userId), workoutPlan);
    return workoutPlan;
  } catch (error) {
    if (error instanceof Error && (
      error.message.includes('User profile not found') || 
      error.message.includes('Synapse sync') || 
      error.message.includes('Synapse core') ||
      error.message.includes('RESOURCE_EXHAUSTED') ||
      error.message.includes('429')
    )) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, planPath);
  }
}
