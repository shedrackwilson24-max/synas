import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Resend } from "resend";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import cors from "cors";
import dotenv from "dotenv";
import firebaseConfig from "./firebase-applet-config.json";

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Firebase Admin
  if (!admin.apps.length) {
    try {
      admin.initializeApp();
      console.log("Synapse: Firebase Admin Initialized (Environment Default)");
    } catch (e: any) {
      console.warn("Synapse: Default Admin SDK init failed, trying fallback:", e.message);
      try {
        admin.initializeApp({
          projectId: firebaseConfig.projectId
        });
        console.log("Synapse: Firebase Admin Initialized (Fallback Config)");
      } catch (fallbackError: any) {
        console.error("Synapse: FATAL: Firebase Admin fallback also failed:", fallbackError.message);
      }
    }
  }

  // Use the firestoreDatabaseId from the config, fallback to (default)
  const dbId = firebaseConfig.firestoreDatabaseId || "(default)";
  let db: admin.firestore.Firestore;
  
  try {
    // Get the firestore instance for the specific database ID
    db = getFirestore(dbId);
    console.log(`Synapse: Connected to Firestore Database [${dbId}]`);
    
    // Test write permission on start (optional, but good for diagnosis)
    const testDoc = db.collection("_diag").doc("init");
    testDoc.set({ lastInit: admin.firestore.FieldValue.serverTimestamp() })
      .then(() => console.log("Synapse: Firestore write test SUCCESS"))
      .catch(e => console.error("Synapse: Firestore write test FAILURE:", e.message));

  } catch (e: any) {
    console.error(`Synapse: Error connecting to database [${dbId}]:`, e.message);
    db = getFirestore();
  }
  
  // Lazy-ish Resend initialization to avoid crash on startup if key is missing
  let resend: Resend | null = null;
  if (process.env.RESEND_API_KEY) {
    try {
      resend = new Resend(process.env.RESEND_API_KEY);
      console.log("Synapse: Resend API initialized");
    } catch (e: any) {
      console.error("Synapse: Failed to initialize Resend:", e.message);
    }
  } else {
    console.warn("Synapse: RESEND_API_KEY missing - email features will be disabled");
  }

  app.use(cors());
  app.use(express.json());

  // Diagnosis Route
  app.get("/api/diag", async (req, res) => {
    try {
      const app = admin.app();
      const options = app.options;
      
      let collections: string[] = [];
      let writeTest = "untested";
      
      try {
        const collectionsSnap = await db.listCollections();
        collections = collectionsSnap.map(c => c.id);
      } catch (e: any) {
        console.error("Synapse Diag: listCollections failed:", e.message);
      }

      try {
        await db.collection("_diag").doc("test").set({ 
          ping: Date.now(),
          worker: "server" 
        });
        writeTest = "success";
      } catch (e: any) {
        writeTest = `failed: ${e.message}`;
      }

      res.json({ 
        status: "online", 
        databaseId: dbId,
        projectId: options.projectId || "auto",
        writeTest,
        collections,
        env: process.env.NODE_ENV
      });
    } catch (err: any) {
      console.error("Synapse: Diag Failure:", err);
      res.status(500).json({ error: err.message, code: err.code });
    }
  });

  // Health Integration Routes
  app.get("/api/auth/garmin/url", (req, res) => {
    // Construct the OAuth provider's authorization URL
    // Garmin typically uses OAuth 1.0a or 2.0. We'll implement 2.0 pattern as it's modern.
    const params = new URLSearchParams({
      client_id: process.env.GARMIN_CLIENT_ID || "DEMO_ID",
      redirect_uri: `${req.protocol}://${req.get("host")}/api/auth/garmin/callback`,
      response_type: "code",
      scope: "read,activity:read,daily:read",
    });

    const authUrl = `https://connect.garmin.com/oauth2-service/oauth2/auth?${params}`;
    res.json({ url: authUrl });
  });

  app.get("/api/auth/garmin/callback", async (req, res) => {
    const { code } = req.query;
    // In a real app, we would exchange the code for tokens here.
    // For this context, we'll demonstrate the callback success pattern.
    
    res.send(`
      <html>
        <body style="background: #000; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh;">
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'garmin' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <div style="text-align: center;">
            <h1 style="color: #4338CA;">Synapse Linked</h1>
            <p>Garmin data stream established. Closing window...</p>
          </div>
        </body>
      </html>
    `);
  });

  // Apple Health Bridge (Simulated for Web)
  app.post("/api/health/apple/sync", async (req, res) => {
    const { userId, data } = req.body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    try {
      const date = new Date().toISOString().split("T")[0];
      const statsRef = db.collection("dailyStats").doc(`${userId}_${date}`);
      
      // Merge Apple Health data into current stats
      await statsRef.set({
        ...data,
        appleHealthSynced: true,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      res.json({ success: true, message: "Apple Health data ingested" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
