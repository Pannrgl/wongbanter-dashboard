const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Serve static frontend from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Setup Token & Chat ID
// Using env variables is best practice for Vercel, with fallback to hardcoded for local testing
const TELEGRAM_API_TOKEN = process.env.TELEGRAM_API_TOKEN || '7408852623:AAHJ_sresG7ItyBExmzpHxDZokqJGMQKBCg';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '6470089932';

app.post('/webhook', (req, res) => {
    const alert = req.body || {};
    let message = '';

    const text = alert.text || '';
    const price = alert.price || '-';

    if (text.includes('BUY')) {
        message = `📈 BUY Signal: Sinyal Beli terdeteksi.\n💰 Harga saat ini: ${price}`;
    } else if (text.includes('SELL')) {
        message = `📉 SELL Signal: Sinyal Jual terdeteksi.\n💰 Harga saat ini: ${price}`;
    } else {
        message = `🔔 Alert: ${text}\n💰 Harga: ${price}`;
    }

    axios.post(`https://api.telegram.org/bot${TELEGRAM_API_TOKEN}/sendMessage`, {
        chat_id: TELEGRAM_CHAT_ID,
        text: message
    }).then(response => {
        console.log('Message sent to Telegram:', response.data.ok);
        res.status(200).send('Alert received and processed');
    }).catch(error => {
        console.error('Error sending message to Telegram:', error.message);
        res.status(500).send('Error processing alert');
    });
});

// Fallback route to serve index.html for any other requests (SPA behavior)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Export the Express API for Vercel Serverless Functions
module.exports = app;

// Start server if running locally (not on Vercel)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}
