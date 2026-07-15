const express = require('express');
const cors = require('cors');

// Configure timezone
const DEFAULT_TIMEZONE = 'Europe/Berlin';
const TIMEZONE = process.env.TIMEZONE || DEFAULT_TIMEZONE;

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration: read allowed origins from env var
// Example: CORS_ALLOWED_ORIGINS=https://wmf.home-ts.com,https://api.wmf.home-ts.com,http://localhost:3000
const rawAllowed = process.env.CORS_ALLOWED_ORIGINS || '';
const allowedOrigins = rawAllowed.split(',').map(s => s.trim()).filter(Boolean);
const allowCredentials = (process.env.CORS_ALLOW_CREDENTIALS || 'false').toLowerCase() === 'true';

let corsOptions;
if (allowedOrigins.length > 0) {
  corsOptions = {
    origin: (origin, callback) => {
      // Allow non-browser tools / same-origin requests without Origin header
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: allowCredentials
  };
} else {
  // Default to allowing any origin (legacy behavior)
  corsOptions = { origin: true, credentials: allowCredentials };
}

app.use(cors(corsOptions));
// Preflight handling for all routes
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return cors(corsOptions)(req, res, next);
  }
  next();
});
app.use(express.json());

const getTimezoneParts = () => {
  const parts = new Intl.DateTimeFormat('de-DE', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(new Date());

  const map = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  return map; // { year, month, day, hour, minute, second }
};

const calculateServicePin = () => {
  const parts = getTimezoneParts();
  const month = parts.month || '00';
  const day = parts.day || '00';
  const hours = parts.hour || '00';

  const reversedMonth = month.split('').reverse().join('');
  const reversedDay = day.split('').reverse().join('');
  const reversedHours = hours.split('').reverse().join('');

  return reversedMonth + reversedDay + reversedHours;
};

const getTimeUntilNextHour = () => {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(now.getHours() + 1, 0, 0, 0);
  
  const diffMs = nextHour - now;
  const minutes = Math.floor(diffMs / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

app.get('/api/pin', (req, res) => {
  try {
    const pin = calculateServicePin();
    const timeRemaining = getTimeUntilNextHour();
    
    res.json({
      pin: pin,
      timeRemaining: timeRemaining,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate PIN' });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`WMF Service PIN API running on port ${PORT}`);
});
