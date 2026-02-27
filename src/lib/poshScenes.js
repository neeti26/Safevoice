const { Scenes, Markup } = require('telegraf');
const crypto = require('crypto');
const { pool } = require('../db');
const redisClient = require('../redis');
const { encryptData, hashData } = require('../crypto');
const { saveToCsv } = require('./excelWriter');

// Helper for 12 digit generation
function generate12DigitCode() {
    let code = '';
    for (let i = 0; i < 12; i++) {
        code += crypto.randomInt(0, 10);
    }
    // Format nicely like 1234-5678-9012 for the user, but store as digits
    return code;
}

const DEPARTMENTS = [
    ['💻 IT / Engineering', '🤝 HR / People'],
    ['💰 Finance / Accounts', '📈 Sales / BD'],
    ['📢 Marketing / PR', '⚙️ Operations'],
    ['⚖️ Legal / Compliance', '🛡️ Admin / Security'],
    ['📦 Product / Design', '🧑‍💼 Customer Support'],
    ['🏢 Executive / C-Suite', '🏭 Factory / Field'],
    ['🌟 Other']
];

const DESIGNATIONS = [
    ['🎓 Intern / Trainee', '🌱 Junior Staff'],
    ['🚀 Mid-Level', '💼 Senior Staff'],
    ['👔 Manager / Team Lead', '👑 Director / VP'],
    ['🏛️ C-Level Executive', '🌟 Other']
];

const LOCATIONS = [
    ['🏢 In-Office', '💻 Virtual / Remote'],
    ['🌍 Offsite / Event', '🚕 Client Visit / Travel'],
    ['🌟 Other Space']
];

const compassWizard = new Scenes.WizardScene(
    'compass',
    // QC1: Jurisdiction Check
    async (ctx) => {
        ctx.wizard.state.compass = {};
        const hindi = ctx.session?.lang === 'hi';
        await ctx.reply(hindi
            ? "🔍 **POSH कंपास (पहला चरण)**\n\nक्यू 1: क्या यह घटना आपके काम की जगह पर या काम के सिलसिले में हुई थी?"
            : "🔍 **POSH Compass (Phase 1)**\n\nQ1: Did this incident happen at your workplace or during work-related activities?",
            Markup.keyboard([
                ['🔘 हाँ — ऑफिस, दुकान, या घर जहाँ मैं काम करती हूँ'],
                ['🔘 हाँ — काम के लिए गए तब हुआ'],
                ['🔘 नहीं — काम से कोई रिश्ता नहीं था'],
                ['🔘 पक्का पता नहीं']
            ]).oneTime().resize()
        );
        return ctx.wizard.next();
    },
    // QC2: Accused Identity
    async (ctx) => {
        const hindi = ctx.session?.lang === 'hi';
        const ans = ctx.message.text || '';

        if (ans.includes('नहीं — काम से')) {
            await ctx.reply(hindi
                ? "⚠️ यह मामला POSH एक्ट के दायरे में नहीं आता है। कृपया पुलिस या अन्य कानूनी मदद लें। मदद के लिए मुख्य मेनू से 'अपना हक जानें' देखें।"
                : "⚠️ This incident does not fall under the POSH Act. Please seek police or cyber help. Check 'Know Your Rights' from the main menu for alternatives.",
                Markup.removeKeyboard()
            );
            return ctx.scene.leave();
        }

        await ctx.reply(hindi
            ? "क्यू 2: यह कौन था जिसने यह किया?"
            : "Q2: Who was the person that did this?",
            Markup.keyboard([
                ['🔘 मेरा मालिक / एम्प्लॉयर'],
                ['🔘 मेरा मैनेजर या कोई बड़ा'],
                ['🔘 मेरे साथ काम करने वाला'],
                ['🔘 कस्टमर / क्लाइंट / बाहर का कोई'],
                ['🔘 कोई और']
            ]).oneTime().resize()
        );
        return ctx.wizard.next();
    },
    // QC3: Sexual Nature Check
    async (ctx) => {
        const hindi = ctx.session?.lang === 'hi';
        const ans = ctx.message.text || '';

        if (ans.includes('मालिक')) {
            ctx.wizard.state.compass.employerAccused = true;
            ctx.wizard.state.compass.route = 'LCC';
        }

        await ctx.reply(hindi
            ? "क्यू 3: जो हुआ — क्या वह यौन (sexual) प्रकृति का था? (छूना, बात करना, या दबाव डालना?)"
            : "Q3: Was the incident of a sexual nature? (Touching, talking, showing, or pressure?)",
            Markup.keyboard([
                ['🔘 हाँ, सेक्सुअल था'],
                ['🔘 नहीं — तंग किया, बुरा बोला, पर सेक्सुअल नहीं था'],
                ['🔘 पक्का नहीं — कुछ अजीब था']
            ]).oneTime().resize()
        );
        return ctx.wizard.next();
    },
    // QC4: Time Check
    async (ctx) => {
        const hindi = ctx.session?.lang === 'hi';
        const ans = ctx.message.text || '';

        if (ans.includes('नहीं — तंग किया')) {
            await ctx.reply(hindi
                ? "⚠️ यदि यह सेक्सुअल नहीं था, तो यह कार्यस्थल उत्पीड़न है लेकिन POSH के तहत नहीं। कृपया 'अपना हक जानें' सेक्शन देखें।"
                : "⚠️ If it was not sexual, it is workplace bullying but not covered under POSH. Check 'Know Your Rights'.",
                Markup.removeKeyboard()
            );
            return ctx.scene.leave();
        }

        await ctx.reply(hindi
            ? "क्यू 4: सबसे आखिरी बार यह कब हुआ था?"
            : "Q4: When was the very last time this happened?",
            Markup.keyboard([
                ['🔘 3 महीने के अंदर'],
                ['🔘 3 से 6 महीने पहले'],
                ['🔘 6 महीने से ज्यादा पहले']
            ]).oneTime().resize()
        );
        return ctx.wizard.next();
    },
    // QC5: Incident Classification (Multi-select simplified for bot)
    async (ctx) => {
        const hindi = ctx.session?.lang === 'hi';
        const ans = ctx.message.text || '';

        if (ans.includes('6 महीने से ज्यादा')) {
            ctx.wizard.state.compass.timeBarred = true;
        }

        await ctx.reply(hindi
            ? "क्यू 5: नीचे जो हुआ है वह सब बताएं (एक बार भी हुआ हो तो भी):"
            : "Q5: What all happened from the below list?",
            Markup.keyboard([
                ['☑️ अनचाहा छूना (Unwanted touch)'],
                ['☑️ सेक्स के लिए दबाव (Sexual pressure)'],
                ['☑️ गंदे भद्दे मज़ाक या कमेंट्स'],
                ['☑️ फोटो, वीडियो या मैसेज भेजना'],
                ['☑️ प्रमोशन/नौकरी का लालच या धमकी'],
                ['☑️ कुछ और (लिखें)']
            ]).oneTime().resize()
        );
        return ctx.wizard.next();
    },
    // QC6: Frequency Check
    async (ctx) => {
        const hindi = ctx.session?.lang === 'hi';
        const ans = ctx.message.text || '';
        ctx.wizard.state.compass.poshTypes = [ans];

        await ctx.reply(hindi
            ? "क्यू 6: यह कितनी बार हुआ है?"
            : "Q6: How often has this happened?",
            Markup.keyboard([
                ['🔘 एक बार'],
                ['🔘 2 से 5 बार'],
                ['🔘 5 से ज्यादा या अभी भी हो रहा है']
            ]).oneTime().resize()
        );
        return ctx.wizard.next();
    },
    // QC7: Resistance Check & Outcome
    async (ctx) => {
        const hindi = ctx.session?.lang === 'hi';
        const ans = ctx.message.text || '';
        if (ans.includes('एक बार')) ctx.wizard.state.compass.severity = 'single';
        else ctx.wizard.state.compass.severity = 'repeated';

        await ctx.reply(hindi
            ? "क्यू 7: क्या तुमने कभी क्लियरली मना किया था — या वहाँ से चली गई थीं?"
            : "Q7: Did you clearly say no, or walk away?",
            Markup.keyboard([
                ['🔘 हाँ, मैंने क्लियरली मना किया'],
                ['🔘 नहीं — डर गई, सहमी रही, कुछ बोल नहीं पाई'],
                ['🔘 नहीं — नौकरी जाने का डर था']
            ]).oneTime().resize()
        );
        return ctx.wizard.next();
    },
    // Outcome Calculation & Route to Complaint
    async (ctx) => {
        const hindi = ctx.session?.lang === 'hi';
        const ans = ctx.message.text || '';

        if (ans.includes('नौकरी जाने का डर')) {
            ctx.wizard.state.compass.powerDynamic = true;
        }

        let outcomeMsg = "";
        ctx.wizard.state.compass.outcome = 'STRONG_POSH'; // Default

        if (ctx.wizard.state.compass.timeBarred) {
            outcomeMsg = hindi
                ? "⏰ 3 महीने की लिमिट है, पर अच्छी वजह बताओ तो LCC समय बढ़ा सकती है। फाइलिंग करो।"
                : "⏰ Time limit is usually 3 months, but the committee can extend it. Please continue filing.";
            ctx.wizard.state.compass.outcome = 'TIME_BARRED';
        } else if (ctx.wizard.state.compass.employerAccused) {
            outcomeMsg = hindi
                ? "🔵 एम्प्लॉयर के खिलाफ मामला सीधा डिस्ट्रिक्ट LCC को जाएगा, कंपनी ICC को नहीं।"
                : "🔵 Cases against the employer go directly to the Government LCC.";
            ctx.wizard.state.compass.outcome = 'LCC_ROUTE';
        } else {
            outcomeMsg = hindi
                ? "✅ **तेरा केस POSH में आता है। अब सीधा कंप्लेंट दर्ज करते हैं।**"
                : "✅ **Your case qualifies under POSH. Let's file the complaint directly now.**";
        }

        if (ans.includes('डर गई')) {
            await ctx.reply(hindi
                ? "ऐसे सिचुएशन में डरना बहुत नॉर्मल है। POSH में 'ना' कहना ज़रूरी नहीं — तेरी बात सुनी जाएगी।"
                : "It's normal to freeze up. POSH doesn't require a 'no' — you will be heard.");
        }

        await ctx.reply(outcomeMsg, Markup.removeKeyboard());

        // Save compass state to session so filing wizard can read it later
        ctx.session.compassResult = ctx.wizard.state.compass;

        // Auto-transition into the filing flow!
        return ctx.scene.enter('file_complaint');
    }
);

const filingWizard = new Scenes.WizardScene(
    'file_complaint',
    // F1: Work Location & District
    async (ctx) => {
        ctx.wizard.state.reportData = {};
        // Bring in Compass data if available
        if (ctx.session?.compassResult) {
            ctx.wizard.state.reportData.compass_outcome = ctx.session.compassResult.outcome;
            ctx.wizard.state.reportData.employer_accused = ctx.session.compassResult.employerAccused || false;
            ctx.wizard.state.reportData.time_barred = ctx.session.compassResult.timeBarred || false;
        }

        const hindi = ctx.session?.lang === 'hi';
        await ctx.reply(hindi
            ? "📝 **शुरुआत करते हैं**\n\nक्यू 1: तुम कहाँ काम करती हो? (नाम या जगह — अगर बताना नहीं चाहती तो 'नहीं बताना' लिखो)"
            : "📝 **Let's Start**\n\nQ1: Where do you work? (Name or area — if you don't want to say, type 'Withheld')",
            Markup.removeKeyboard()
        );
        return ctx.wizard.next();
    },
    // F2: Work Type 
    async (ctx) => {
        const hindi = ctx.session?.lang === 'hi';
        const ans = ctx.message.text || '';
        ctx.wizard.state.reportData.location = ans;

        if (ans.includes('नहीं बताना') || ans.includes('Withheld')) {
            await ctx.reply(hindi ? "ठीक है, अपना ज़िला (district) बताओ — LCC के लिए ज़रूरी है:" : "Okay, please provide your district (needed for LCC routing):");
            return; // Wait for district input on this same step
        }

        ctx.wizard.state.reportData.district = ans; // Will be properly refined later, assigning location text as district for now

        await ctx.reply(hindi
            ? "क्यू 2: काम क्या करती हो वहाँ?"
            : "Q2: What kind of work do you do there?",
            Markup.keyboard([
                ['🔘 घर में काम (Domestic Worker)'],
                ['🔘 दुकान / Shop में'],
                ['🔘 फैक्ट्री / Construction'],
                ['🔘 खेती / Farm'],
                ['🔘 दिहाड़ी / Daily wage'],
                ['🔘 कुछ और (बताओ)']
            ]).oneTime().resize()
        );
        return ctx.wizard.next();
    },
    // F3: Date
    async (ctx) => {
        const hindi = ctx.session?.lang === 'hi';
        ctx.wizard.state.reportData.work_type = ctx.message.text;

        await ctx.reply(hindi
            ? "क्यू 3: यह कब हुआ — या कब से हो रहा है?\n(जैसे: नवम्बर या पिछले हफ्ते — बिल्कुल सही तारीख नहीं है तो भी चलेगा)"
            : "Q3: When did this happen, or since when?\n(e.g., November or last week — exact dates aren't strictly required)",
            Markup.removeKeyboard()
        );
        return ctx.wizard.next();
    },
    // F4: Description
    async (ctx) => {
        const hindi = ctx.session?.lang === 'hi';
        ctx.wizard.state.reportData.incident_date = ctx.message.text;

        await ctx.reply(hindi
            ? "तेरी बात बिल्कुल safe है — सिर्फ LCC देखेगी, कोई और नहीं।\n\nक्यू 4: अब अपनी बात लिखो — जो भी हुआ, अपने शब्दों में। कोई भी चीज़ छोटी नहीं होती।"
            : "Your words are completely safe — only LCC will see them.\n\nQ4: Describe what happened in your own words. Nothing is too small to mention.");
        return ctx.wizard.next();
    },
    // F5: Evidence Prompt
    async (ctx) => {
        const hindi = ctx.session?.lang === 'hi';

        // Handle voice note edge case
        if (ctx.message.voice) {
            await ctx.reply(hindi
                ? "🎙️ वॉयस नोट मिला, पर LCC के लिए टाइप करना पड़ेगा — दो-तीन लाइन भी काफी है।"
                : "🎙️ Voice note received, but we need text — even 2-3 lines is enough.");
            return; // Stay on step
        }

        const msg = ctx.message.text || "";
        if (msg.length < 15) {
            await ctx.reply(hindi ? "कृपया थोड़ा और विस्तार से बताएं (कम से कम 15 अक्षर):" : "Please provide a bit more detail (at least 15 characters):");
            return; // Stay on step
        }

        ctx.wizard.state.reportData.description = msg;

        await ctx.reply(hindi
            ? "क्यू 5: क्या कोई चीज़ है जो प्रूव करे — फोटो, स्क्रीनशॉट, मैसेज?"
            : "Q5: Do you have anything to prove this — photos, screenshots, messages?",
            Markup.keyboard([
                ['🔘 हाँ — भेजना चाहती हूँ'],
                ['🔘 नहीं है मेरे पास'],
                ['🔘 है पर भेजने में दिक्कत है']
            ]).oneTime().resize()
        );
        return ctx.wizard.next();
    },
    // F6: Accused Role
    async (ctx) => {
        const hindi = ctx.session?.lang === 'hi';
        const ans = ctx.message.text || '';

        if (ans.includes('हाँ — भेजना')) {
            await ctx.reply(hindi ? "📸 कृपया अभी वह फोटो या फाइल भेजें (अधिकतम 3):" : "📸 Please send the photo or file now:");
            ctx.wizard.state.waiting_for_files = true;
            return;
        }

        // Check if user uploaded file instead of clicking button
        if (ctx.wizard.state.waiting_for_files || ctx.message.photo || ctx.message.document) {
            let fileId;
            if (ctx.message.photo) fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
            else if (ctx.message.document) fileId = ctx.message.document.file_id;

            if (fileId) {
                ctx.wizard.state.reportData.evidence_hashes = ctx.wizard.state.reportData.evidence_hashes || [];
                ctx.wizard.state.reportData.evidence_hashes.push(hashData(fileId));
                const fPrint = hashData(fileId).substring(0, 8);
                await ctx.reply(hindi ? `✅ फाइल मिल गई। फिंगरप्रिंट: ${fPrint}` : `✅ File received. Fingerprint: ${fPrint}`);
            }
        }

        await ctx.reply(hindi
            ? "क्यू 6: वह इंसान काम की जगह में तुम्हारा कौन है?"
            : "Q6: Who is this person to you at the workplace?",
            Markup.keyboard([
                ['🔘 मालिक / घर वाले जहाँ काम करती हूँ'],
                ['🔘 मैनेजर / बड़ा कोई'],
                ['🔘 साथ काम करने वाला'],
                ['🔘 कस्टमर / क्लाइंट'],
                ['🔘 कोई और']
            ]).oneTime().resize()
        );
        return ctx.wizard.next();
    },
    // F7: Accused Details
    async (ctx) => {
        const hindi = ctx.session?.lang === 'hi';
        const ans = ctx.message.text || '';
        ctx.wizard.state.reportData.accused_relation = ans;

        if (ans.includes('मालिक')) {
            ctx.wizard.state.reportData.employer_accused = true;
            await ctx.reply(hindi
                ? "समझ आया — तेरी कंप्लेंट सीधा LCC जाएगी। ICC इन्वॉल्व नहीं होगी।"
                : "Understood — your complaint goes directly to the Govt LCC. Company ICC won't be involved.");
        }

        await ctx.reply(hindi
            ? "क्यू 7: उनका नाम या हुलिया? (अगर नहीं बताना तो छोड़ सकती हो)"
            : "Q7: Their name or description? (Optional)",
            Markup.keyboard([
                ['🔘 नाम बताना चाहती हूँ'],
                ['🔘 सिर्फ काम / कैसा दिखता है बताना है'],
                ['🔘 स्किप करना है (Skip)']
            ]).oneTime().resize()
        );
        return ctx.wizard.next();
    },
    // F8: Accused Continued Presence
    async (ctx) => {
        const hindi = ctx.session?.lang === 'hi';
        const ans = ctx.message.text || '';

        if (ans.includes('नाम बताना') || ans.includes('सिर्फ काम')) {
            await ctx.reply(hindi ? "✍️ कृपया नाम या हुलिया टाइप करें:" : "✍️ Please type the name or description:");
            return;
        }

        // If user typed name instead of pressing button
        if (!ans.includes('स्किप') && ans !== "") {
            ctx.wizard.state.reportData.accused_name = ans;
        }

        await ctx.reply(hindi
            ? "क्यू 8: क्या वह अभी भी काम पर है और तुम्हारा उनसे मिलना होता है?"
            : "Q8: Is that person still at work and do you have to interact with them?",
            Markup.keyboard([
                ['🔘 हाँ, रोज़ मिलना होता है — बहुत तकलीफ है'],
                ['🔘 हाँ काम पर है, पर मैं बचती हूँ'],
                ['🔘 नहीं, मैंने खुद जॉब छोड़ दी'],
                ['🔘 नहीं, वह जा चुके हैं']
            ]).oneTime().resize()
        );
        return ctx.wizard.next();
    },
    // F9: Contact Preferences
    async (ctx) => {
        const hindi = ctx.session?.lang === 'hi';
        const ans = ctx.message.text || '';

        if (ans.includes('रोज़ मिलना')) ctx.wizard.state.reportData.interim_relief_needed = true;

        await ctx.reply(hindi
            ? "क्यू 9: अगर LCC का कोई अपडेट आए तो कैसे बताएँ? (तेरी पहचान सेफ रहेगी)"
            : "Q9: How should we notify you of LCC updates? (Your identity stays hidden)",
            Markup.keyboard([
                ['🔘 इस Telegram चैट में बताओ (Recommended)'],
                ['🔘 WhatsApp नंबर पर मैसेज करो'],
                ['🔘 कोई अपडेट नहीं चाहिए — कोड से ट्रैक कर लूँगी']
            ]).oneTime().resize()
        );
        return ctx.wizard.next();
    },
    // F10: Relief Requested & Submission
    async (ctx) => {
        const hindi = ctx.session?.lang === 'hi';
        const ans = ctx.message.text || '';

        if (ans.includes('WhatsApp')) {
            await ctx.reply(hindi ? "अपना 10-अंकों का मोबाइल नंबर लिखें:" : "Please type your 10-digit mobile number:");
            ctx.wizard.state.awaiting_number = true;
            return;
        }

        if (ctx.wizard.state.awaiting_number) {
            ctx.wizard.state.reportData.contact_ref = "WA:" + ans;
            ctx.wizard.state.awaiting_number = false;
        } else if (ans.includes('Telegram')) {
            ctx.wizard.state.reportData.contact_ref = "TG_HASH"; // Will normally hash chat ID
        }

        await ctx.reply(hindi
            ? "क्यू 10: क्या सपोर्ट चाहिए — क्या आउटकम (नतीजा) चाहती हो? (एक से ज़्यादा चुन सकती हो, या लिखकर भेजो)"
            : "Q10: What relief / outcome are you seeking? (Select or type multiple)",
            Markup.keyboard([
                ['☑️ मुझे या उन्हें वहाँ से हटाया जाए'],
                ['☑️ मेरी नौकरी सेफली वापस चाहिए'],
                ['☑️ सिर्फ उनके खिलाफ एक्शन चाहिए'],
                ['☑️ NGO का सपोर्ट चाहिए']
            ]).oneTime().resize()
        );
        return ctx.wizard.next();
    },
    // Final processing
    async (ctx) => {
        const hindi = ctx.session?.lang === 'hi';
        ctx.wizard.state.reportData.relief_sought = ctx.message.text;

        const processingMsg = await ctx.reply(hindi ? "⏳ सुरक्षित रूप से डेटा एन्क्रिप्ट किया जा रहा है..." : "⏳ Encrypting your report securely...");

        // SV-XXXXXX 6 digit code
        const code6 = String(crypto.randomInt(100000, 999999));
        const formattedCode = `SV-${code6}`;
        const passphraseHash = hashData(code6);

        const reportSafe = ctx.wizard.state.reportData || {};
        const encryptedDetails = encryptData(JSON.stringify(reportSafe));
        const accusedHash = reportSafe.accused_name ? hashData(reportSafe.accused_name) : hashData('Unknown');
        const evidenceHashes = reportSafe.evidence_hashes || [];

        try {
            const result = await pool.query(
                `INSERT INTO complaints_telegram (passphrase_hash, accused_hash, evidence_hashes, details_encrypted, status) 
                 VALUES ($1, $2, $3, $4, 'pending') RETURNING id`,
                [passphraseHash, accusedHash, evidenceHashes, encryptedDetails]
            );
            const caseId = result.rows[0].id;

            // Updated CSV Logging
            saveToCsv({
                id: caseId,
                trackingCode: formattedCode,
                district: reportSafe.district,
                work_type: reportSafe.work_type,
                accused_relation: reportSafe.accused_relation,
                compass_outcome: reportSafe.compass_outcome,
                employer_accused: reportSafe.employer_accused,
                relief_sought: reportSafe.relief_sought,
                time_barred: reportSafe.time_barred
            });

            await ctx.telegram.editMessageText(
                ctx.chat.id, processingMsg.message_id, undefined,
                hindi ? "✅ डेटा सुरक्षित किया गया।" : "✅ Data secured."
            );

            await ctx.reply(hindi
                ? `📄 **केस दर्ज़!**\n\nतेरी शिकायत दर्ज हो गई! Case Code: <code>${formattedCode}</code>. संभाल के रखना — किसी को मत बताना.\nLCC को 7 दिन में acknowledge करना होता है.\nट्रैक करो /track से.`
                : `📄 **Case Filed!**\n\nYour complaint is logged! Case Code: <code>${formattedCode}</code>. Keep it safe — do not share it.\nLCC must acknowledge within 7 days.\nTrack it via /track.`,
                { parse_mode: 'HTML', ...Markup.removeKeyboard() }
            );

            // Cleanup session
            ctx.session.compassResult = null;

        } catch (err) {
            console.error("DB Save Err:", err);
            await ctx.reply(hindi ? "⚠️ मैं इस चरण को सहेज नहीं सका।" : "⚠️ Failed to save securely.");
        }

        return ctx.scene.leave();
    }
);
const trackScene = new Scenes.WizardScene(
    'track',
    async (ctx) => {
        const hindi = ctx.session?.lang === 'hi';
        await ctx.reply(
            hindi ? "🔍 अपना 6-अंकों का ट्रैकिंग कोड दर्ज करें (उदा. SV-123456 या 123456):" : "🔍 Please enter your 6-Digit tracking code (e.g. SV-123456 or 123456):",
            Markup.removeKeyboard()
        );
        return ctx.wizard.next();
    },
    async (ctx) => {
        const hindi = ctx.session?.lang === 'hi';
        // Clean the input, extract the 6 digits even if SV- is included
        const codeInput = ctx.message.text.replace(/[^0-9]/g, '').trim();

        if (codeInput.length !== 6) {
            await ctx.reply(hindi ? "मैं उस केस का पता नहीं लगा सका। ट्रैकिंग नंबर की दोबारा जाँच करें।" : "I couldn’t locate that case. Double-check the tracking number.");
            return ctx.scene.leave();
        }

        const passphraseHash = hashData(codeInput);

        try {
            const result = await pool.query(
                "SELECT id, status FROM complaints_telegram WHERE passphrase_hash = $1",
                [passphraseHash]
            );

            if (result.rows.length === 0) {
                await ctx.reply(hindi ? "मैं उस केस का पता नहीं लगा सका। ट्रैकिंग नंबर की दोबारा जाँच करें।" : "I couldn’t locate that case. Double-check the tracking number.");
            } else {
                const c = result.rows[0];

                let statusEmoji = "🟡"; // pending
                let niceStatus = "Pending Review";
                if (c.status === 'inquiry') { statusEmoji = "🔵"; niceStatus = "Inquiry Active"; }
                if (c.status === 'resolved') { statusEmoji = "🟢"; niceStatus = "Resolved"; }

                await ctx.reply(
                    hindi
                        ? `📄 **केस ID:** ${c.id}\n${statusEmoji} **स्थिति:** ${niceStatus}\n\nआप कर सकते हैं:\n• अधिक साक्ष्य जोड़ें → <code>/reply ${c.id} संदेश</code>\n• केस को ट्रैक करें → <code>/track</code>`
                        : `📄 <b>Case ID:</b> ${c.id}\n${statusEmoji} <b>Status:</b> ${niceStatus}\n\nYou can:\n• add more evidence → <code>/reply ${c.id} message</code>\n• track case → <code>/track</code>`,
                    { parse_mode: 'HTML' }
                );
            }
        } catch (err) {
            console.error("Tracking Error:", err);
            await ctx.reply(hindi ? "❌ स्थिति प्राप्त करने में त्रुटि।" : "❌ Error retrieving status.");
        }

        return ctx.scene.leave();
    }
);

module.exports = { compassWizard, filingWizard, trackScene };
