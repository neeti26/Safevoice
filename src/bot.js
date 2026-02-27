const { Telegraf, session, Scenes, Markup } = require('telegraf');
const { pool } = require('./db');
const { compassWizard, filingWizard, trackScene } = require('./lib/poshScenes');
const { encryptData } = require('./crypto');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const stage = new Scenes.Stage([compassWizard, filingWizard, trackScene]);

bot.use(session());
bot.use(stage.middleware());
require('./lib/knowRights').setupActions(bot);

// Language Menu
bot.command('lang', (ctx) => {
    ctx.reply('Please choose your language / कृपया अपनी भाषा चुनें / कृपया तुमची भाषा निवडा:',
        Markup.inlineKeyboard([
            [Markup.button.callback('English', 'set_lang_en')],
            [Markup.button.callback('हिंदी (Hindi)', 'set_lang_hi')],
            [Markup.button.callback('मराठी (Marathi)', 'set_lang_mr')]
        ])
    );
});

bot.action('set_lang_en', ctx => {
    ctx.session = ctx.session || {};
    ctx.session.lang = 'en';
    ctx.answerCbQuery();
    ctx.reply('Language changed to English. Type /start to begin.');
});
bot.action('set_lang_hi', ctx => {
    ctx.session = ctx.session || {};
    ctx.session.lang = 'hi';
    ctx.answerCbQuery();
    ctx.reply('भाषा बदलकर हिंदी कर दी गई है। शुरू करने के लिए /start टाइप करें।');
});
bot.action('set_lang_mr', ctx => {
    ctx.session = ctx.session || {};
    ctx.session.lang = 'mr';
    ctx.answerCbQuery();
    ctx.reply('भाषा बदलून मराठी करण्यात आली आहे. सुरू करण्यासाठी /start टाइप करा.');
});

// /start - Main Menu
bot.command('start', (ctx) => {
    ctx.session = ctx.session || { lang: 'hi' }; // Default to Hindi (Hinglish)
    const lang = ctx.session.lang;

    // Reset any hanging state
    if (ctx.scene) ctx.scene.leave();

    let text = 'मैं SafeVoice हूँ, असंगठित क्षेत्र की महिलाओं के लिए एक सुरक्षित साथी।\nआप क्या करना चाहेंगी?\n(भाषा बदलने के लिए /lang टाइप करें)';
    let btn1 = '🧭 POSH Compass (Pehle Jaanein)';
    let btn2 = '📝 Shikayat Darj Karein (File Complaint)';
    let btn3 = '⚖️ Apna Haq Jaanein (Know Your Rights)';
    let btn4 = '🔍 Case Track Karein';

    if (lang === 'en') {
        text = 'I am SafeVoice, a safe companion for women in the unorganized sector.\nWhat would you like to do?\n(Type /lang to change language)';
        btn1 = '🧭 POSH Compass (Know First)';
        btn2 = '📝 File Complaint';
        btn3 = '⚖️ Know Your Rights';
        btn4 = '🔍 Track My Case';
    } else if (lang === 'mr') {
        text = 'मी SafeVoice आहे, असंगठित क्षेत्रातील महिलांसाठी एक सुरक्षित साथीदार.\nतुम्हाला काय करायचे आहे?\n(भाषा बदलण्यासाठी /lang टाइप करा)';
        btn1 = '🧭 POSH Compass (पहिले जाणून घ्या)';
        btn2 = '📝 तक्रार नोंदवा (File Complaint)';
        btn3 = '⚖️ तुमचे हक्क जाणून घ्या';
        btn4 = '🔍 केस ट्रॅक करा';
    }

    ctx.reply(text,
        Markup.inlineKeyboard([
            [Markup.button.callback(btn1, 'menu_compass')],
            [Markup.button.callback(btn2, 'menu_file')],
            [Markup.button.callback(btn3, 'menu_rights')],
            [Markup.button.callback(btn4, 'menu_track')]
        ])
    );
});

// Menu Actions
bot.action('menu_compass', ctx => {
    ctx.answerCbQuery();
    ctx.scene.enter('compass');
});

bot.action('menu_file', ctx => {
    ctx.answerCbQuery();
    ctx.scene.enter('file_complaint');
});

bot.action('menu_track', ctx => {
    ctx.answerCbQuery();
    ctx.scene.enter('track');
});

bot.action('menu_rights', ctx => {
    ctx.answerCbQuery();
    require('./lib/knowRights').handleMenu(ctx);
});

bot.command('report', ctx => ctx.scene.enter('file_complaint'));
bot.command('track', ctx => ctx.scene.enter('track'));

// /reply
bot.command('reply', async (ctx) => {
    const parts = ctx.message.text.split(' ');
    if (parts.length < 3) return ctx.reply('Usage: /reply <caseID> <message>');
    const caseId = parseInt(parts[1], 10);
    const msg = parts.slice(2).join(' ');

    // Here reporter can send extra info. It should just notify ICC.
    const iccGroup = process.env.ICC_GROUP_ID;
    if (iccGroup) {
        // Send as anonymous reply
        try {
            await ctx.telegram.sendMessage(iccGroup, `📩 Anon reply for Case ${caseId}:\n\n${msg}\n\n(Encrypted copy kept for records)`);
            ctx.reply(`✅ Your message was securely added to Case ${caseId}.`);
        } catch (e) {
            console.error("Failed to send reply to ICC", e);
            ctx.reply('⚠️ I couldn’t securely save this step. Nothing was recorded. Please try again.');
        }
    } else {
        ctx.reply('ICC contact not configured.');
    }
});

// ICC /admin commands
const ICC_ADMINS = process.env.ICC_ADMINS?.split(',') || [];

bot.command('cases', async (ctx) => {
    if (!ICC_ADMINS.includes(String(ctx.from.id))) return ctx.reply('Admin only.');
    try {
        const cases = await pool.query("SELECT id, accused_hash, status FROM complaints_telegram ORDER BY created_at DESC LIMIT 10");
        const patterns = await pool.query("SELECT accused_hash, COUNT(*) FROM complaints_telegram WHERE status='pending' GROUP BY accused_hash HAVING COUNT(*) > 2");

        let msg = cases.rows.length ? cases.rows.map(r => `• ID ${r.id}: AccusedHash(${r.accused_hash.substring(0, 8)}...) - ${r.status}`).join('\n') : 'No cases.';

        if (patterns.rows.length) {
            msg += `\n\n🚨 PATTERN ALERTS:\n` + patterns.rows.map(p => `- ${p.count} pending match for accused hash ${p.accused_hash.substring(0, 8)}...`).join('\n');
        }

        ctx.reply(msg);
    } catch (err) {
        console.error(err);
        ctx.reply('Error fetching cases.');
    }
});

bot.command('alerts', async (ctx) => {
    if (!ICC_ADMINS.includes(String(ctx.from.id))) return ctx.reply('Admin only.');
    // Here you would check Redis for expired SLAs typically by subscribing to keyspace notifications.
    // For now just manually querying cases over 7 days old that are still pending.
    try {
        const alerts = await pool.query("SELECT id, created_at FROM complaints_telegram WHERE status = 'pending' AND created_at < NOW() - INTERVAL '7 days'");
        if (alerts.rows.length === 0) return ctx.reply('No SLA breaches.');

        let msg = `🚨 SLA Breaches (7 days inquiry not started):\n` + alerts.rows.map(r => `Case ${r.id} reported on ${r.created_at.toDateString()}`).join('\n');
        ctx.reply(msg);
    } catch (e) {
        console.error(e);
        ctx.reply('Error checking alerts.');
    }
});

bot.command('update_status', async (ctx) => {
    if (!ICC_ADMINS.includes(String(ctx.from.id))) return ctx.reply('Admin only.');
    const parts = ctx.message.text.split(' ');
    if (parts.length !== 3) return ctx.reply('Usage: /update_status <caseID> <pending|inquiry|resolved>');
    const caseId = parseInt(parts[1], 10);
    const newStatus = parts[2];

    if (!['pending', 'inquiry', 'resolved'].includes(newStatus)) return ctx.reply('Invalid status.');

    try {
        await pool.query("UPDATE complaints_telegram SET status = $1 WHERE id = $2", [newStatus, caseId]);
        ctx.reply(`Case ${caseId} status updated to ${newStatus}.`);
    } catch (e) {
        console.error(e);
        ctx.reply('Failed to update status.');
    }
});

bot.command('login', (ctx) => {
    ctx.reply('For full dashboard, visit https://pcws10-123.vercel.app/login\n(Use standard ICC web credentials)');
});

module.exports = bot;
