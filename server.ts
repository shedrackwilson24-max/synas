import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'node:fs';
import { Resend } from 'resend';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  
  if (resendApiKey) {
    console.log(`RESEND_API_KEY detected. Dispatched via Resend from: ${resendFrom}`);
  } else {
    console.warn('RESEND_API_KEY missing. Authentication will run in Neural Simulation mode.');
  }

  const resend = resendApiKey ? new Resend(resendApiKey) : null;

  app.use(express.json());
  app.use(cors());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'active', node: process.version, env: process.env.NODE_ENV });
  });

  app.post('/api/send-otp', async (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    if (!resend) {
      console.log(`[SIMULATION] Neural Verification dispatched to ${email}: ${code}`);
      return res.json({ success: true, simulated: true, code });
    }

    try {
      const { data, error } = await resend.emails.send({
        from: `Synapse Protocol <${resendFrom}>`,
        to: [email],
        subject: 'Neural Sync: Your Verification Code',
        html: `
          <div style="font-family: sans-serif; background: #000; color: #fff; padding: 40px; border-radius: 20px; border: 1px solid #333; max-width: 500px; margin: 0 auto;">
            <div style="margin-bottom: 30px; text-align: center;">
               <h1 style="font-style: italic; font-weight: 900; letter-spacing: -0.05em; margin: 0; color: #fff; font-size: 32px;">SYNAPSE<span style="color: #00ff88;">PROTOCOL</span></h1>
            </div>
            <p style="text-transform: uppercase; font-size: 10px; font-weight: 900; letter-spacing: 0.3em; color: #666; text-align: center; margin-bottom: 30px;">Security Access Token Dispatched</p>
            <div style="background: #111; padding: 30px; border-radius: 24px; margin-bottom: 30px; border: 1px solid #222; text-align: center;">
              <p style="font-size: 11px; font-weight: 900; color: #999; margin-bottom: 20px; letter-spacing: 0.1em; text-transform: uppercase;">Your Neural Verification Code</p>
              <h2 style="font-size: 56px; color: #00ff88; font-style: italic; margin: 0; letter-spacing: 0.15em; font-weight: 900;">${code}</h2>
            </div>
            <p style="font-size: 12px; line-height: 1.6; color: #888; text-align: center;">This code will expire in 10 minutes. If you did not initiate this protocol, your neural profile may be compromised.</p>
            <div style="margin-top: 40px; border-top: 1px solid #222; padding-top: 20px; text-align: center;">
               <p style="font-size: 9px; color: #444; text-transform: uppercase; letter-spacing: 0.1em; font-weight: bold;">© 2026 SYNAPSE BIOMETRICS CORE</p>
            </div>
          </div>
        `,
      });

      if (error) {
        console.error('Broadcast Error:', error);
        return res.status(500).json({ error: 'Neural broadcast failed' });
      }

      res.json({ success: true, data });
    } catch (err: any) {
      console.error('Core Logic Failure:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  const distPath = path.resolve(__dirname, 'dist');
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    console.log('Production Environment Detected. Syncing Static Core...');
    if (!fs.existsSync(distPath)) {
      console.error(`Dist directory missing at ${distPath}. Build artifacts not found.`);
      process.exit(1);
    }
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Synapse OS: Core files missing. Please rebuild.');
      }
    });
  } else {
    console.log('Development Environment Detected. Initializing Vite HMR...');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Synapse System Active: http://0.0.0.0:${PORT}`);
    console.log(`Node Version: ${process.version}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Current Working Directory: ${process.cwd()}`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

startServer().catch(err => {
  console.error("Neural Lockdown: Critical Startup Error", err);
  process.exit(1);
});
