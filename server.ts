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
      // In this environment, initializeApp() without arguments is the most reliable
      // as it uses the environment's project and service account identity.
      admin.initializeApp();
      console.log("Synapse: Firebase Admin Initialized (Environment Default)");
    } catch (e: any) {
      console.error("Synapse: Error initializing Admin SDK:", e.message);
      // Fallback with config if default fails
      admin.initializeApp({
        projectId: firebaseConfig.projectId
      });
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
  
  const resend = new Resend(process.env.RESEND_API_KEY);

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

  // API Routes
  // Note: Standard auth is handled on the client via Firebase SDK.
  // We keep the diag route for health checks.
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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
