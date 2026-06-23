import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    type: { type: String, enum: ['page_view', 'click'], required: true, index: true },
    pageUrl: { type: String, required: true, index: true },
    timestamp: { type: Date, required: true, index: true },
    coordinates: {
      x: Number,
      y: Number,
      clientX: Number,
      clientY: Number
    },
    viewport: {
      width: Number,
      height: Number
    },
    document: {
      width: Number,
      height: Number
    },
    userAgent: String,
    referrer: String
  },
  { timestamps: true }
);

eventSchema.index({ sessionId: 1, timestamp: 1 });
eventSchema.index({ pageUrl: 1, type: 1, timestamp: -1 });

export const Event = mongoose.model('Event', eventSchema);
