const { reportWizard } = require('./src/lib/poshScenes');
const { encryptData, hashData } = require('./src/crypto');
const db = require('./src/db');
const redisClient = require('./src/redis');
const fs = require('fs');
const path = require('path');

// MOCK the context
const ctx = {
    session: { lang: 'en' },
    wizard: {
        state: {
            reportData: {
                date: '2024-01-01',
                location: 'Office',
                incidentCategory: 'Verbal',
                description: 'Test incident',
                accusedDept: 'IT',
                accusedDesignation: 'Manager',
                accusedInfo: 'IT - Manager',
                frequency: 'First time',
                witnesses: 'None',
                requestedAction: 'Formal Inquiry'
            },
            evidenceHashes: []
        }
    },
    message: {
        text: 'SKIP'
    },
    chat: {
        id: 123456
    },
    reply: async (text, markup) => {
        console.log("REPLY:", text);
        return { message_id: 999 };
    },
    telegram: {
        sendMessage: async (group, text) => {
            console.log("SENDMESSAGE:", group, text);
        },
        editMessageText: async (chat, msgId, inlineMsgId, text) => {
            console.log("EDITMESSAGE:", chat, msgId, inlineMsgId, text);
        }
    },
    scene: {
        leave: () => console.log("Scene left.")
    }
};

(async () => {
    try {
        console.log("Testing Step 11...");
        // the last step is index 10 in an 11-step wizard
        const finalStep = reportWizard.steps[10];
        await finalStep(ctx);
        console.log("Success! No crashes.");
    } catch (err) {
        console.error("CRASH IN SCRIPT:", err.message);
        console.error(err.stack);
    }
})();
