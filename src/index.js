const express = require('express');
const bot = require('./bot');
const telegramRoutes = require('./routes/api/telegram');
require('dotenv').config();

const app = express();
app.use(express.json());

app.use('/api/telegram', telegramRoutes);

app.get('/', (req, res) => {
    res.send('POSH Telegram Bot Server Running.');
});

const PORT = process.env.PORT || 3000;

// Set webhook if required, or start pooling for local development
if (process.env.NODE_ENV === 'production' && process.env.WEBHOOK_URL) {
    bot.telegram.setWebhook(`${process.env.WEBHOOK_URL}/api/telegram/webhook`);
    console.log(`Webhook set to ${process.env.WEBHOOK_URL}/api/telegram/webhook`);
} else {
    console.log('Starting bot in long-polling mode (local dev)...');
    bot.launch();
}

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
