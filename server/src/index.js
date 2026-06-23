import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import morgan from 'morgan';
import { Event } from './models/Event.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 4000;
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: '128kb' }));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/demo', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'demo.html'));
});

const normalizeEvent = (payload) => {
  const timestamp = payload.timestamp ? new Date(payload.timestamp) : new Date();

  return {
    sessionId: String(payload.session_id || payload.sessionId || '').trim(),
    type: payload.type,
    pageUrl: String(payload.page_url || payload.pageUrl || '').trim(),
    timestamp: Number.isNaN(timestamp.getTime()) ? new Date() : timestamp,
    coordinates:
      payload.type === 'click'
        ? {
            x: Number(payload.x ?? payload.coordinates?.x),
            y: Number(payload.y ?? payload.coordinates?.y),
            clientX: Number(payload.clientX ?? payload.coordinates?.clientX),
            clientY: Number(payload.clientY ?? payload.coordinates?.clientY)
          }
        : undefined,
    viewport: {
      width: Number(payload.viewport?.width ?? payload.viewportWidth),
      height: Number(payload.viewport?.height ?? payload.viewportHeight)
    },
    document: {
      width: Number(payload.document?.width ?? payload.documentWidth),
      height: Number(payload.document?.height ?? payload.documentHeight)
    },
    userAgent: payload.userAgent,
    referrer: payload.referrer
  };
};

app.get('/health', (_req, res) => {
  res.json({ ok: true, database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

app.post('/api/events', async (req, res, next) => {
  try {
    const event = normalizeEvent(req.body);

    if (!event.sessionId || !event.type || !event.pageUrl) {
      return res.status(400).json({ error: 'session_id, type, and page_url are required' });
    }

    if (!['page_view', 'click'].includes(event.type)) {
      return res.status(400).json({ error: 'type must be page_view or click' });
    }

    if (event.type === 'click' && (!Number.isFinite(event.coordinates.x) || !Number.isFinite(event.coordinates.y))) {
      return res.status(400).json({ error: 'click events require numeric x and y coordinates' });
    }

    const saved = await Event.create(event);
    res.status(201).json({ id: saved._id });
  } catch (error) {
    next(error);
  }
});

app.get('/api/sessions', async (_req, res, next) => {
  try {
    const sessions = await Event.aggregate([
      {
        $group: {
          _id: '$sessionId',
          eventCount: { $sum: 1 },
          firstSeen: { $min: '$timestamp' },
          lastSeen: { $max: '$timestamp' },
          pageCount: { $addToSet: '$pageUrl' },
          clickCount: { $sum: { $cond: [{ $eq: ['$type', 'click'] }, 1, 0] } }
        }
      },
      { $sort: { lastSeen: -1 } },
      {
        $project: {
          _id: 0,
          sessionId: '$_id',
          eventCount: 1,
          clickCount: 1,
          firstSeen: 1,
          lastSeen: 1,
          pageCount: { $size: '$pageCount' }
        }
      }
    ]);

    res.json(sessions);
  } catch (error) {
    next(error);
  }
});

app.get('/api/sessions/:sessionId/events', async (req, res, next) => {
  try {
    const events = await Event.find({ sessionId: req.params.sessionId }).sort({ timestamp: 1 }).lean();
    res.json(events);
  } catch (error) {
    next(error);
  }
});

app.get('/api/pages', async (_req, res, next) => {
  try {
    const pages = await Event.aggregate([
      {
        $group: {
          _id: '$pageUrl',
          eventCount: { $sum: 1 },
          clickCount: { $sum: { $cond: [{ $eq: ['$type', 'click'] }, 1, 0] } },
          lastSeen: { $max: '$timestamp' }
        }
      },
      { $sort: { lastSeen: -1 } },
      { $project: { _id: 0, pageUrl: '$_id', eventCount: 1, clickCount: 1, lastSeen: 1 } }
    ]);

    res.json(pages);
  } catch (error) {
    next(error);
  }
});

app.get('/api/heatmap', async (req, res, next) => {
  try {
    const pageUrl = String(req.query.url || '').trim();
    if (!pageUrl) {
      return res.status(400).json({ error: 'url query parameter is required' });
    }

    const events = await Event.find({ pageUrl, type: 'click' })
      .sort({ timestamp: -1 })
      .select('sessionId timestamp coordinates viewport document pageUrl')
      .lean();

    res.json(events);
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Something went wrong' });
});

const start = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/causalfunnel_analytics';
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  app.listen(port, () => {
    console.log(`Analytics API running on http://localhost:${port}`);
    console.log(`Demo page available at http://localhost:${port}/demo`);
    console.log(`Dashboard origin configured as ${clientOrigin}`);
  });
};

start().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
