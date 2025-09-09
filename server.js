const express = require('express');
const cors = require('cors');

const DEFAULT_TIMEZONE = 'Europe/Berlin';
const TIMEZONE = process.env.TIMEZONE || DEFAULT_TIMEZONE;

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const getTimezoneDate = () => {
  const dateStr = new Date().toLocaleString('de-DE', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  return new Date(dateStr);
};

const calculateServicePin = () => {
  const now = getTimezoneDate();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  
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