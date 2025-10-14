const express = require("express");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Serve the HTML GUI =====
app.use(express.static(path.join(__dirname)));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ===== Telegram & Monitoring setup =====
const BASE_URL = "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT";
const BOT_TOKEN = "7786466116:AAFjGR6LLuPFRdXp22WafwRMSWi_kyk36Jc";
const CHAT_ID = "1722505498";

let upTarget = 0;
let downTarget = 0;
let wasAboveUp = false;
let wasBelowDown = false;
let intervalSec = 10000; // default 10s

// Function to get price
async function getPrice() {
  try {
    const res = await fetch(BASE_URL);
    const data = await res.json();
    return parseFloat(data.price);
  } catch (err) {
    console.error("❌ Error fetching price:", err);
    return null;
  }
}

// Function to send Telegram message
function sendTelegram(text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `chat_id=${CHAT_ID}&text=${encodeURIComponent(text)}`
  });
}

// Function to send alert multiple times
function sendAlertMessage(message) {
  const alertCount = 8;
  const alertInterval = 60; // milliseconds (~0.06s)
  for (let i = 0; i < alertCount; i++) {
    setTimeout(() => sendTelegram(message), i * alertInterval);
  }
  console.log(`📢 Alert sent: ${message}`);
}

// ===== Start monitoring loop =====
function startMonitoring(up, down, interval) {
  upTarget = up;
  downTarget = down;
  intervalSec = interval * 1000;

  console.log(`✅ Monitoring started. UP: ${upTarget}, DOWN: ${downTarget}`);

  setInterval(async () => {
    const price = await getPrice();
    if (!price) return;
    console.log(`💰 BTCUSDT: $${price}`);

    if (price >= upTarget && !wasAboveUp) {
      sendAlertMessage(`🚀 BTCUSDT hit UP target! Current price: ${price}`);
      wasAboveUp = true;
    } else if (price < upTarget) wasAboveUp = false;

    if (price <= downTarget && !wasBelowDown) {
      sendAlertMessage(`📉 BTCUSDT hit DOWN target! Current price: ${price}`);
      wasBelowDown = true;
    } else if (price > downTarget) wasBelowDown = false;

  }, intervalSec);
}

// ===== Endpoint to start monitoring from GUI =====
app.get("/start", (req, res) => {
  const up = parseFloat(req.query.up);
  const down = parseFloat(req.query.down);
  const interval = parseFloat(req.query.interval) || 10;

  if (!up || !down) {
    return res.send("❌ Please provide up and down targets");
  }

  startMonitoring(up, down, interval);
  res.send(`✅ Monitoring started. UP: ${up}, DOWN: ${down}, Interval: ${interval}s`);
});

// ===== Simple ping endpoint for UptimeRobot =====
app.get("/ping", (req, res) => res.send("Alive"));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
