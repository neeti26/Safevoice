const express = require('express');
const router = express.Router();
const bot = require('../../bot');

// Webhook endpoint suitable for Vercel/serverless
router.post('/webhook', (req, res) => {
    try {
        bot.handleUpdate(req.body, req.res);
        // Explicitly send a response to avoid hanging requests if Telegraf fails to handle
        if (!res.headersSent) {
            res.sendStatus(200);
        }
    } catch (e) {
        console.error('Webhook error:', e);
        if (!res.headersSent) {
            res.sendStatus(500);
        }
    }
});

module.exports = router;
