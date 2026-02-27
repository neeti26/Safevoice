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
        const lang = ctx.session?.lang || 'hi';
        let text = "🔍 **POSH कंपास (पहला चरण)**\n\nक्यू 1: क्या यह घटना आपके काम की जगह पर या काम के सिलसिले में हुई थी?";
        let opts = [
            ['🔘 हाँ — ऑफिस, दुकान, या घर जहाँ मैं काम करती हूँ'],
            ['🔘 हाँ — काम के लिए गए तब हुआ'],
            ['🔘 नहीं — काम से कोई रिश्ता नहीं था'],
            ['🔘 पक्का पता नहीं']
        ];
        if (lang === 'en') {
            text = "🔍 **POSH Compass (Phase 1)**\n\nQ1: Did this incident happen at your workplace or during work-related activities?";
            opts = [
                ['🔘 Yes — Office, shop, or home where I work'],
                ['🔘 Yes — Happened when I went for work'],
                ['🔘 No — Not related to work'],
                ['🔘 Not sure']
            ];
        } else if (lang === 'mr') {
            text = "🔍 **POSH कंपास (पहिली पायरी)**\n\nप्र 1: ही घटना तुमच्या कामाच्या ठिकाणी किंवा कामाच्या संदर्भात घडली होती का?";
            opts = [
                ['🔘 होय — ऑफिस, दुकान, किंवा घर जिथे मी काम करते'],
                ['🔘 होय — कामासाठी गेले होते तेव्हा घडले'],
                ['🔘 नाही — कामाशी काहीही संबंध नव्हता'],
                ['🔘 नक्की माहीत नाही']
            ];
        }
        await ctx.reply(text, Markup.keyboard(opts).oneTime().resize());
        return ctx.wizard.next();
    },
    // QC2: Accused Identity
    async (ctx) => {
        const lang = ctx.session?.lang || 'hi';
        const ans = ctx.message.text || '';

        if (ans.includes('नहीं — काम से') || ans.includes('No — Not') || ans.includes('नाही — कामाशी')) {
            let msg = "⚠️ यह मामला POSH एक्ट के दायरे में नहीं आता है। कृपया पुलिस या अन्य कानूनी मदद लें। मदद के लिए मुख्य मेनू से 'अपना हक जानें' देखें।";
            if (lang === 'en') msg = "⚠️ This incident does not fall under the POSH Act. Please seek police or cyber help. Check 'Know Your Rights' from the main menu for alternatives.";
            else if (lang === 'mr') msg = "⚠️ हे प्रकरण POSH कायद्याच्या अंतर्गत येत नाही. कृपया पोलीस किंवा इतर कायदेशीर मदत घ्या. मदतीसाठी मुख्य मेनूमधून 'तुमचे हक्क जाणून घ्या' पहा.";

            await ctx.reply(msg, Markup.removeKeyboard());
            return ctx.scene.leave();
        }

        let text = "क्यू 2: यह कौन था जिसने यह किया?";
        let opts = [
            ['🔘 मेरा मालिक / एम्प्लॉयर'],
            ['🔘 मेरा मैनेजर या कोई बड़ा'],
            ['🔘 मेरे साथ काम करने वाला'],
            ['🔘 कस्टमर / क्लाइंट / बाहर का कोई'],
            ['🔘 कोई और']
        ];
        if (lang === 'en') {
            text = "Q2: Who was the person that did this?";
            opts = [
                ['🔘 My owner / employer'],
                ['🔘 My manager or senior'],
                ['🔘 My co-worker'],
                ['🔘 Customer / client / outsider'],
                ['🔘 Someone else']
            ];
        } else if (lang === 'mr') {
            text = "प्र 2: असे करणारी ती व्यक्ती कोण होती?";
            opts = [
                ['🔘 माझा मालक / एम्प्लॉयर'],
                ['🔘 माझा मॅनेजर किंवा वरिष्ठ'],
                ['🔘 माझ्यासोबत काम करणारा'],
                ['🔘 कस्टमर / क्लायंट / बाहेरची व्यक्ती'],
                ['🔘 कोणीतरी दुसरे']
            ];
        }

        await ctx.reply(text, Markup.keyboard(opts).oneTime().resize());
        return ctx.wizard.next();
    },
    // QC3: Sexual Nature Check
    async (ctx) => {
        const lang = ctx.session?.lang || 'hi';
        const ans = ctx.message.text || '';

        if (ans.includes('मालिक') || ans.includes('owner') || ans.includes('मालक')) {
            ctx.wizard.state.compass.employerAccused = true;
            ctx.wizard.state.compass.route = 'LCC';
        }

        let text = "क्यू 3: जो हुआ — क्या वह यौन (sexual) प्रकृति का था? (छूना, बात करना, या दबाव डालना?)";
        let opts = [
            ['🔘 हाँ, सेक्सुअल था'],
            ['🔘 नहीं — तंग किया, बुरा बोला, पर सेक्सुअल नहीं था'],
            ['🔘 पक्का नहीं — कुछ अजीब था']
        ];
        if (lang === 'en') {
            text = "Q3: Was the incident of a sexual nature? (Touching, talking, showing, or pressure?)";
            opts = [
                ['🔘 Yes, it was sexual'],
                ['🔘 No — teased, said bad things, but not sexual'],
                ['🔘 Not sure — something was strange']
            ];
        } else if (lang === 'mr') {
            text = "प्र 3: जे घडले — ते लैंगिक (sexual) स्वरूपाचे होते का? (स्पर्श करणे, बोलणे किंवा दबाव आणणे?)";
            opts = [
                ['🔘 होय, सेक्सुअल होते'],
                ['🔘 नाही — त्रास दिला, वाईट बोलले, पण सेक्सुअल नव्हते'],
                ['🔘 नक्की नाही — काहीतरी विचित्र होते']
            ];
        }

        await ctx.reply(text, Markup.keyboard(opts).oneTime().resize());
        return ctx.wizard.next();
    },
    // QC4: Time Check
    async (ctx) => {
        const lang = ctx.session?.lang || 'hi';
        const ans = ctx.message.text || '';

        if (ans.includes('नहीं — तंग किया') || ans.includes('No — teased') || ans.includes('नाही — त्रास दिला')) {
            let msg = "⚠️ यदि यह सेक्सुअल नहीं था, तो यह कार्यस्थल उत्पीड़न है लेकिन POSH के तहत नहीं। कृपया 'अपना हक जानें' सेक्शन देखें।";
            if (lang === 'en') msg = "⚠️ If it was not sexual, it is workplace bullying but not covered under POSH. Check 'Know Your Rights'.";
            else if (lang === 'mr') msg = "⚠️ जर ते सेक्सुअल नव्हते, तर तो कामाच्या ठिकाणचा छळ आहे पण POSH अंतर्गत येत नाही. कृपया 'तुमचे हक्क जाणून घ्या' विभाग पहा.";

            await ctx.reply(msg, Markup.removeKeyboard());
            return ctx.scene.leave();
        }

        let text = "क्यू 4: सबसे आखिरी बार यह कब हुआ था?";
        let opts = [
            ['🔘 3 महीने के अंदर'],
            ['🔘 3 से 6 महीने पहले'],
            ['🔘 6 महीने से ज्यादा पहले']
        ];
        if (lang === 'en') {
            text = "Q4: When was the very last time this happened?";
            opts = [
                ['🔘 Within 3 months'],
                ['🔘 3 to 6 months ago'],
                ['🔘 More than 6 months ago']
            ];
        } else if (lang === 'mr') {
            text = "प्र 4: सर्वात शेवटी हे कधी घडले होते?";
            opts = [
                ['🔘 3 महिन्यांच्या आत'],
                ['🔘 3 ते 6 महिन्यांपूर्वी'],
                ['🔘 6 महिन्यांहून अधिक पूर्वी']
            ];
        }

        await ctx.reply(text, Markup.keyboard(opts).oneTime().resize());
        return ctx.wizard.next();
    },
    // QC5: Incident Classification (Multi-select simplified for bot)
    async (ctx) => {
        const lang = ctx.session?.lang || 'hi';
        const ans = ctx.message.text || '';

        if (ans.includes('6 महीने से ज्यादा') || ans.includes('More than 6 months') || ans.includes('6 महिन्यांहून अधिक')) {
            ctx.wizard.state.compass.timeBarred = true;
        }

        let text = "क्यू 5: नीचे जो हुआ है वह सब बताएं (एक बार भी हुआ हो तो भी):";
        let opts = [
            ['☑️ अनचाहा छूना (Unwanted touch)'],
            ['☑️ सेक्स के लिए दबाव (Sexual pressure)'],
            ['☑️ गंदे भद्दे मज़ाक या कमेंट्स'],
            ['☑️ फोटो, वीडियो या मैसेज भेजना'],
            ['☑️ प्रमोशन/नौकरी का लालच या धमकी'],
            ['☑️ कुछ और (लिखें)']
        ];
        if (lang === 'en') {
            text = "Q5: What all happened from the below list?";
            opts = [
                ['☑️ Unwanted touch'],
                ['☑️ Sexual pressure'],
                ['☑️ Dirty or vulgar jokes/comments'],
                ['☑️ Sending photos, videos, or messages'],
                ['☑️ Lure of promotion/job or threat'],
                ['☑️ Something else (type)']
            ];
        } else if (lang === 'mr') {
            text = "प्र 5: खालीलपैकी जे काही घडले ते सर्व सांगा (एकदाच घडले असेल तरीही):";
            opts = [
                ['☑️ नको असलेला स्पर्श (Unwanted touch)'],
                ['☑️ सेक्ससाठी दबाव (Sexual pressure)'],
                ['☑️ घाणेरडे विनोद किंवा कमेंट्स'],
                ['☑️ फोटो, व्हिडिओ किंवा मेसेज पाठवणे'],
                ['☑️ प्रमोशन/नोकरीचे आमिष किंवा धमकी'],
                ['☑️ काहीतरी वेगळे (लिहा)']
            ];
        }

        await ctx.reply(text, Markup.keyboard(opts).oneTime().resize());
        return ctx.wizard.next();
    },
    // QC6: Frequency Check
    async (ctx) => {
        const lang = ctx.session?.lang || 'hi';
        const ans = ctx.message.text || '';
        ctx.wizard.state.compass.poshTypes = [ans];

        let text = "क्यू 6: यह कितनी बार हुआ है?";
        let opts = [
            ['🔘 एक बार'],
            ['🔘 2 से 5 बार'],
            ['🔘 5 से ज्यादा या अभी भी हो रहा है']
        ];
        if (lang === 'en') {
            text = "Q6: How often has this happened?";
            opts = [
                ['🔘 Once'],
                ['🔘 2 to 5 times'],
                ['🔘 More than 5 times or still happening']
            ];
        } else if (lang === 'mr') {
            text = "प्र 6: हे किती वेळा घडले आहे?";
            opts = [
                ['🔘 एकदा'],
                ['🔘 2 ते 5 वेळा'],
                ['🔘 5 पेक्षा जास्त वेळा किंवा अजूनही घडत आहे']
            ];
        }

        await ctx.reply(text, Markup.keyboard(opts).oneTime().resize());
        return ctx.wizard.next();
    },
    // QC7: Resistance Check & Outcome
    async (ctx) => {
        const lang = ctx.session?.lang || 'hi';
        const ans = ctx.message.text || '';
        if (ans.includes('एक बार') || ans.includes('Once') || ans.includes('एकदा')) ctx.wizard.state.compass.severity = 'single';
        else ctx.wizard.state.compass.severity = 'repeated';

        let text = "क्यू 7: क्या तुमने कभी क्लियरली मना किया था — या वहाँ से चली गई थीं?";
        let opts = [
            ['🔘 हाँ, मैंने क्लियरली मना किया'],
            ['🔘 नहीं — डर गई, सहमी रही, कुछ बोल नहीं पाई'],
            ['🔘 नहीं — नौकरी जाने का डर था']
        ];
        if (lang === 'en') {
            text = "Q7: Did you clearly say no, or walk away?";
            opts = [
                ['🔘 Yes, I clearly said no'],
                ['🔘 No — I was scared, stayed quiet'],
                ['🔘 No — I was afraid of losing my job']
            ];
        } else if (lang === 'mr') {
            text = "प्र 7: तुम्ही कधी स्पष्टपणे नकार दिला होता का — किंवा तिथून निघून गेला होतात का?";
            opts = [
                ['🔘 होय, मी स्पष्टपणे नकार दिला'],
                ['🔘 नाही — मी घाबरले, शांत राहिले'],
                ['🔘 नाही — नोकरी जाण्याची भीती होती']
            ];
        }

        await ctx.reply(text, Markup.keyboard(opts).oneTime().resize());
        return ctx.wizard.next();
    },
    // Outcome Calculation & Route to Complaint
    async (ctx) => {
        const lang = ctx.session?.lang || 'hi';
        const ans = ctx.message.text || '';

        if (ans.includes('नौकरी जाने का डर') || ans.includes('afraid of losing') || ans.includes('नोकरी जाण्याची भीती')) {
            ctx.wizard.state.compass.powerDynamic = true;
        }

        let outcomeMsg = "";
        ctx.wizard.state.compass.outcome = 'STRONG_POSH'; // Default

        if (ctx.wizard.state.compass.timeBarred) {
            outcomeMsg = "⏰ 3 महीने की लिमिट है, पर अच्छी वजह बताओ तो LCC समय बढ़ा सकती है। फाइलिंग करो।";
            if (lang === 'en') outcomeMsg = "⏰ Time limit is usually 3 months, but the committee can extend it. Please continue filing.";
            else if (lang === 'mr') outcomeMsg = "⏰ 3 महिन्यांची मर्यादा आहे, पण योग्य कारण सांगितल्यास LCC वेळ वाढवू शकते. फाइलिंग सुरू ठेवा.";
            ctx.wizard.state.compass.outcome = 'TIME_BARRED';
        } else if (ctx.wizard.state.compass.employerAccused) {
            outcomeMsg = "🔵 एम्प्लॉयर के खिलाफ मामला सीधा डिस्ट्रिक्ट LCC को जाएगा, कंपनी ICC को नहीं।";
            if (lang === 'en') outcomeMsg = "🔵 Cases against the employer go directly to the Government LCC.";
            else if (lang === 'mr') outcomeMsg = "🔵 मालकाविरुद्धचे प्रकरण थेट जिल्हा LCC कडे जाईल, कंपनी ICC कडे नाही.";
            ctx.wizard.state.compass.outcome = 'LCC_ROUTE';
        } else {
            outcomeMsg = "✅ **तेरा केस POSH में आता है। अब सीधा कंप्लेंट दर्ज करते हैं।**";
            if (lang === 'en') outcomeMsg = "✅ **Your case qualifies under POSH. Let's file the complaint directly now.**";
            else if (lang === 'mr') outcomeMsg = "✅ **तुमची केस POSH अंतर्गत येते. आता थेट तक्रार नोंदवूया.**";
        }

        if (ans.includes('डर गई') || ans.includes('scared') || ans.includes('घाबरले')) {
            let fearMsg = "ऐसे सिचुएशन में डरना बहुत नॉर्मल है। POSH में 'ना' कहना ज़रूरी नहीं — तेरी बात सुनी जाएगी।";
            if (lang === 'en') fearMsg = "It's normal to freeze up. POSH doesn't require a 'no' — you will be heard.";
            else if (lang === 'mr') fearMsg = "अशा परिस्थितीत घाबरणे अगदी नैसर्गिक आहे. POSH मध्ये 'नाही' म्हणणे आवश्यक नाही — तुमचे म्हणणे ऐकले जाईल.";
            await ctx.reply(fearMsg);
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

        const lang = ctx.session?.lang || 'hi';
        let text = "📝 **शुरुआत करते हैं**\n\nक्यू 1: तुम कहाँ काम करती हो? (नाम या जगह — अगर बताना नहीं चाहती तो 'नहीं बताना' लिखो)";
        if (lang === 'en') text = "📝 **Let's Start**\n\nQ1: Where do you work? (Name or area — if you don't want to say, type 'Withheld')";
        else if (lang === 'mr') text = "📝 **सुरुवात करूया**\n\nप्र 1: तुम्ही कुठे काम करता? (नाव किंवा जागा — जर सांगायचे नसेल तर 'सांगायचे नाही' लिहा)";

        await ctx.reply(text, Markup.removeKeyboard());
        return ctx.wizard.next();
    },
    // F2: Work Type 
    async (ctx) => {
        const lang = ctx.session?.lang || 'hi';
        const ans = ctx.message.text || '';
        ctx.wizard.state.reportData.location = ans;

        if (ans.includes('नहीं बताना') || ans.includes('Withheld') || ans.includes('सांगायचे नाही')) {
            let msg = "ठीक है, अपना ज़िला (district) बताओ — LCC के लिए ज़रूरी है:";
            if (lang === 'en') msg = "Okay, please provide your district (needed for LCC routing):";
            else if (lang === 'mr') msg = "ठीक आहे, तुमचा जिल्हा (district) सांगा — LCC साठी आवश्यक आहे:";

            await ctx.reply(msg);
            return; // Wait for district input on this same step
        }

        ctx.wizard.state.reportData.district = ans; // Will be properly refined later, assigning location text as district for now

        let text = "क्यू 2: काम क्या करती हो वहाँ?";
        let opts = [
            ['🔘 घर में काम (Domestic Worker)'],
            ['🔘 दुकान / Shop में'],
            ['🔘 फैक्ट्री / Construction'],
            ['🔘 खेती / Farm'],
            ['🔘 दिहाड़ी / Daily wage'],
            ['🔘 कुछ और (बताओ)']
        ];
        if (lang === 'en') {
            text = "Q2: What kind of work do you do there?";
            opts = [
                ['🔘 Domestic Worker'],
                ['🔘 In a Shop'],
                ['🔘 Factory / Construction'],
                ['🔘 Farm'],
                ['🔘 Daily wage'],
                ['🔘 Something else']
            ];
        } else if (lang === 'mr') {
            text = "प्र 2: तिथे तुम्ही काय काम करता?";
            opts = [
                ['🔘 घरकाम (Domestic Worker)'],
                ['🔘 दुकान / Shop मध्ये'],
                ['🔘 फॅक्टरी / Construction'],
                ['🔘 शेती / Farm'],
                ['🔘 रोजंदारी / Daily wage'],
                ['🔘 काहीतरी वेगळे (सांगा)']
            ];
        }

        await ctx.reply(text, Markup.keyboard(opts).oneTime().resize());
        return ctx.wizard.next();
    },
    // F3: Date
    async (ctx) => {
        const lang = ctx.session?.lang || 'hi';
        ctx.wizard.state.reportData.work_type = ctx.message.text;

        let text = "क्यू 3: यह कब हुआ — या कब से हो रहा है?\n(जैसे: नवम्बर या पिछले हफ्ते — बिल्कुल सही तारीख नहीं है तो भी चलेगा)";
        if (lang === 'en') text = "Q3: When did this happen, or since when?\n(e.g., November or last week — exact dates aren't strictly required)";
        else if (lang === 'mr') text = "प्र 3: हे कधी घडले — किंवा कधीपासून घडत आहे?\n(उदा: नोव्हेंबर किंवा गेल्या आठवड्यात — अगदी अचूक तारीख नसली तरी चालेल)";

        await ctx.reply(text, Markup.removeKeyboard());
        return ctx.wizard.next();
    },
    // F4: Description
    async (ctx) => {
        const lang = ctx.session?.lang || 'hi';
        ctx.wizard.state.reportData.incident_date = ctx.message.text;

        let text = "तेरी बात बिल्कुल safe है — सिर्फ LCC देखेगी, कोई और नहीं।\n\nक्यू 4: अब अपनी बात लिखो — जो भी हुआ, अपने शब्दों में। कोई भी चीज़ छोटी नहीं होती।";
        if (lang === 'en') text = "Your words are completely safe — only LCC will see them.\n\nQ4: Describe what happened in your own words. Nothing is too small to mention.";
        else if (lang === 'mr') text = "तुमचे शब्द पूर्णपणे सुरक्षित आहेत — फक्त LCC ते पाहतील.\n\nप्र 4: जे काही घडले, ते तुमच्या स्वतःच्या शब्दांत सांगा. कोणतीही गोष्ट लहान नसते.";

        await ctx.reply(text);
        return ctx.wizard.next();
    },
    // F5: Evidence Prompt
    async (ctx) => {
        const lang = ctx.session?.lang || 'hi';

        // Handle voice note edge case
        if (ctx.message.voice) {
            let msg = "🎙️ वॉयस नोट मिला, पर LCC के लिए टाइप करना पड़ेगा — दो-तीन लाइन भी काफी है।";
            if (lang === 'en') msg = "🎙️ Voice note received, but we need text — even 2-3 lines is enough.";
            else if (lang === 'mr') msg = "🎙️ व्हॉइस नोट मिळाली, पण LCC साठी टाइप करावे लागेल — २-३ ओळीही पुरेशा आहेत.";

            await ctx.reply(msg);
            return; // Stay on step
        }

        const msgTxt = ctx.message.text || "";
        if (msgTxt.length < 15) {
            let msg = "कृपया थोड़ा और विस्तार से बताएं (कम से कम 15 अक्षर):";
            if (lang === 'en') msg = "Please provide a bit more detail (at least 15 characters):";
            else if (lang === 'mr') msg = "कृपया थोडं अधिक तपशीलात सांगा (किमान १५ अक्षरे):";

            await ctx.reply(msg);
            return; // Stay on step
        }

        ctx.wizard.state.reportData.description = msgTxt;

        let text = "क्यू 5: क्या कोई चीज़ है जो प्रूव करे — फोटो, स्क्रीनशॉट, मैसेज?";
        let opts = [
            ['🔘 हाँ — भेजना चाहती हूँ'],
            ['🔘 नहीं है मेरे पास'],
            ['🔘 है पर भेजने में दिक्कत है']
        ];
        if (lang === 'en') {
            text = "Q5: Do you have anything to prove this — photos, screenshots, messages?";
            opts = [
                ['🔘 Yes — I want to send'],
                ['🔘 No, I don\'t have anything'],
                ['🔘 Yes, but trouble sending']
            ];
        } else if (lang === 'mr') {
            text = "प्र 5: हे सिद्ध करण्यासाठी तुमच्याकडे काही आहे का — फोटो, स्क्रीनशॉट, मेसेज?";
            opts = [
                ['🔘 होय — मला पाठवायचे आहे'],
                ['🔘 माझ्याकडे काही नाही'],
                ['🔘 आहे पण पाठवण्यात अडचण आहे']
            ];
        }

        await ctx.reply(text, Markup.keyboard(opts).oneTime().resize());
        return ctx.wizard.next();
    },
    // F6: Accused Role
    async (ctx) => {
        const lang = ctx.session?.lang || 'hi';
        const ans = ctx.message.text || '';

        if (ans.includes('हाँ — भेजना') || ans.includes('Yes — I want') || ans.includes('होय — मला पाठवायचे')) {
            let msg = "📸 कृपया अभी वह फोटो या फाइल भेजें (अधिकतम 3):";
            if (lang === 'en') msg = "📸 Please send the photo or file now:";
            else if (lang === 'mr') msg = "📸 कृपया आता तो फोटो किंवा फाईल पाठवा (जास्तीत जास्त ३):";
            await ctx.reply(msg);
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
                let msg = `✅ फाइल मिल गई। फिंगरप्रिंट: ${fPrint}`;
                if (lang === 'en') msg = `✅ File received. Fingerprint: ${fPrint}`;
                else if (lang === 'mr') msg = `✅ फाईल मिळाली. फिंगरप्रिंट: ${fPrint}`;
                await ctx.reply(msg);
            }
        }

        let text = "क्यू 6: वह इंसान काम की जगह में तुम्हारा कौन है?";
        let opts = [
            ['🔘 मालिक / घर वाले जहाँ काम करती हूँ'],
            ['🔘 मैनेजर / बड़ा कोई'],
            ['🔘 साथ काम करने वाला'],
            ['🔘 कस्टमर / क्लाइंट'],
            ['🔘 कोई और']
        ];
        if (lang === 'en') {
            text = "Q6: Who is this person to you at the workplace?";
            opts = [
                ['🔘 Owner / household where I work'],
                ['🔘 Manager / senior'],
                ['🔘 Co-worker'],
                ['🔘 Customer / client'],
                ['🔘 Someone else']
            ];
        } else if (lang === 'mr') {
            text = "प्र 6: ती व्यक्ती कामाच्या ठिकाणी तुमची कोण आहे?";
            opts = [
                ['🔘 मालक / घरमालक जिथे मी काम करते'],
                ['🔘 मॅनेजर / वरिष्ठ'],
                ['🔘 सहकारी (Co-worker)'],
                ['🔘 कस्टमर / क्लायंट'],
                ['🔘 कोणीतरी दुसरे']
            ];
        }

        await ctx.reply(text, Markup.keyboard(opts).oneTime().resize());
        return ctx.wizard.next();
    },
    // F7: Accused Details
    async (ctx) => {
        const lang = ctx.session?.lang || 'hi';
        const ans = ctx.message.text || '';
        ctx.wizard.state.reportData.accused_relation = ans;

        if (ans.includes('मालिक') || ans.includes('Owner') || ans.includes('मालक')) {
            ctx.wizard.state.reportData.employer_accused = true;
            let msg = "समझ आया — तेरी कंप्लेंट सीधा LCC जाएगी। ICC इन्वॉल्व नहीं होगी।";
            if (lang === 'en') msg = "Understood — your complaint goes directly to the Govt LCC. Company ICC won't be involved.";
            else if (lang === 'mr') msg = "समजले — तुमची तक्रार थेट सरकारी LCC कडे जाईल. कंपनीची ICC यात सामील नसेल.";
            await ctx.reply(msg);
        }

        let text = "क्यू 7: उनका नाम या हुलिया? (अगर नहीं बताना तो छोड़ सकती हो)";
        let opts = [
            ['🔘 नाम बताना चाहती हूँ'],
            ['🔘 सिर्फ काम / कैसा दिखता है बताना है'],
            ['🔘 स्किप करना है (Skip)']
        ];
        if (lang === 'en') {
            text = "Q7: Their name or description? (Optional)";
            opts = [
                ['🔘 I want to provide the name'],
                ['🔘 Just describe their work/look'],
                ['🔘 Skip']
            ];
        } else if (lang === 'mr') {
            text = "प्र 7: त्यांचे नाव किंवा वर्णन? (सांगायचे नसल्यास सोडून देऊ शकता)";
            opts = [
                ['🔘 मला नाव सांगायचे आहे'],
                ['🔘 फक्त काम / कसे दिसतात ते सांगेन'],
                ['🔘 स्किप करायचे आहे (Skip)']
            ];
        }

        await ctx.reply(text, Markup.keyboard(opts).oneTime().resize());
        return ctx.wizard.next();
    },
    // F8: Accused Continued Presence
    async (ctx) => {
        const lang = ctx.session?.lang || 'hi';
        const ans = ctx.message.text || '';

        if (ans.includes('नाम बताना') || ans.includes('सिर्फ काम') || ans.includes('provide the name') || ans.includes('describe') || ans.includes('नाव सांगायचे') || ans.includes('फक्त काम')) {
            let msg = "✍️ कृपया नाम या हुलिया टाइप करें:";
            if (lang === 'en') msg = "✍️ Please type the name or description:";
            else if (lang === 'mr') msg = "✍️ कृपया नाव किंवा वर्णन टाईप करा:";
            await ctx.reply(msg);
            return;
        }

        // If user typed name instead of pressing button
        if (!ans.includes('स्किप') && !ans.includes('Skip') && ans !== "") {
            ctx.wizard.state.reportData.accused_name = ans;
        }

        let text = "क्यू 8: क्या वह अभी भी काम पर है और तुम्हारा उनसे मिलना होता है?";
        let opts = [
            ['🔘 हाँ, रोज़ मिलना होता है — बहुत तकलीफ है'],
            ['🔘 हाँ काम पर है, पर मैं बचती हूँ'],
            ['🔘 नहीं, मैंने खुद जॉब छोड़ दी'],
            ['🔘 नहीं, वह जा चुके हैं']
        ];
        if (lang === 'en') {
            text = "Q8: Is that person still at work and do you have to interact with them?";
            opts = [
                ['🔘 Yes, daily interactions — very stressful'],
                ['🔘 Yes, at work, but I avoid them'],
                ['🔘 No, I left the job'],
                ['🔘 No, they have left']
            ];
        } else if (lang === 'mr') {
            text = "प्र 8: ती व्यक्ती अजूनही कामावर आहे आणि तुमचा त्यांच्याशी संपर्क येतो का?";
            opts = [
                ['🔘 होय, रोज भेट होते — खूप त्रास होतो'],
                ['🔘 होय कामावर आहेत, पण मी टाळते'],
                ['🔘 नाही, मी स्वतः नोकरी सोडली'],
                ['🔘 नाही, ते सोडून गेले आहेत']
            ];
        }

        await ctx.reply(text, Markup.keyboard(opts).oneTime().resize());
        return ctx.wizard.next();
    },
    // F9: Contact Preferences
    async (ctx) => {
        const lang = ctx.session?.lang || 'hi';
        const ans = ctx.message.text || '';

        if (ans.includes('रोज़ मिलना') || ans.includes('daily interaction') || ans.includes('रोज भेट')) {
            ctx.wizard.state.reportData.interim_relief_needed = true;
        }

        let text = "क्यू 9: अगर LCC का कोई अपडेट आए तो कैसे बताएँ? (तेरी पहचान सेफ रहेगी)";
        let opts = [
            ['🔘 इस Telegram चैट में बताओ (Recommended)'],
            ['🔘 WhatsApp नंबर पर मैसेज करो'],
            ['🔘 कोई अपडेट नहीं चाहिए — कोड से ट्रैक कर लूँगी']
        ];
        if (lang === 'en') {
            text = "Q9: How should we notify you of LCC updates? (Your identity stays hidden)";
            opts = [
                ['🔘 Notify in this Telegram chat (Recommended)'],
                ['🔘 Message on WhatsApp number'],
                ['🔘 No updates needed — I will track via code']
            ];
        } else if (lang === 'mr') {
            text = "प्र 9: जर LCC कडून काही अपडेट आले तर कसे कळवावे? (तुमची ओळख गुप्त राहील)";
            opts = [
                ['🔘 या Telegram चॅटवर कळवा (Recommended)'],
                ['🔘 WhatsApp नंबरवर मेसेज करा'],
                ['🔘 कोणतेही अपडेट नको — मी कोडने ट्रॅक करेन']
            ];
        }

        await ctx.reply(text, Markup.keyboard(opts).oneTime().resize());
        return ctx.wizard.next();
    },
    // F10: Relief Requested & Submission
    async (ctx) => {
        const lang = ctx.session?.lang || 'hi';
        const ans = ctx.message.text || '';

        if (ans.includes('WhatsApp')) {
            let msg = "अपना 10-अंकों का मोबाइल नंबर लिखें:";
            if (lang === 'en') msg = "Please type your 10-digit mobile number:";
            else if (lang === 'mr') msg = "तुमचा 10-अंकी मोबाईल नंबर लिहा:";
            await ctx.reply(msg);
            ctx.wizard.state.awaiting_number = true;
            return;
        }

        if (ctx.wizard.state.awaiting_number) {
            ctx.wizard.state.reportData.contact_ref = "WA:" + ans;
            ctx.wizard.state.awaiting_number = false;
        } else if (ans.includes('Telegram')) {
            ctx.wizard.state.reportData.contact_ref = "TG_HASH"; // Will normally hash chat ID
        }

        let text = "क्यू 10: क्या सपोर्ट चाहिए — क्या आउटकम (नतीजा) चाहती हो? (एक से ज़्यादा चुन सकती हो, या लिखकर भेजो)";
        let opts = [
            ['☑️ मुझे या उन्हें वहाँ से हटाया जाए'],
            ['☑️ मेरी नौकरी सेफली वापस चाहिए'],
            ['☑️ सिर्फ उनके खिलाफ एक्शन चाहिए'],
            ['☑️ NGO का सपोर्ट चाहिए']
        ];
        if (lang === 'en') {
            text = "Q10: What relief / outcome are you seeking? (Select or type multiple)";
            opts = [
                ['☑️ Transfer me or them'],
                ['☑️ I want my job back safely'],
                ['☑️ Just want action against them'],
                ['☑️ Need NGO support']
            ];
        } else if (lang === 'mr') {
            text = "प्र 10: कोणता सपोर्ट हवा आहे — काय निकाल अपेक्षित आहे? (अनेक निवडू शकता, किंवा लिहून पाठवा)";
            opts = [
                ['☑️ मला किंवा त्यांना तिथून हटवावे'],
                ['☑️ मला माझी नोकरी सुरक्षितपणे परत हवी आहे'],
                ['☑️ फक्त त्यांच्याविरुद्ध कारवाई करावी'],
                ['☑️ NGO चा सपोर्ट हवा आहे']
            ];
        }

        await ctx.reply(text, Markup.keyboard(opts).oneTime().resize());
        return ctx.wizard.next();
    },
    // Final processing
    async (ctx) => {
        const lang = ctx.session?.lang || 'hi';
        ctx.wizard.state.reportData.relief_sought = ctx.message.text;

        let startMsg = "⏳ सुरक्षित रूप से डेटा एन्क्रिप्ट किया जा रहा है...";
        if (lang === 'en') startMsg = "⏳ Encrypting your report securely...";
        else if (lang === 'mr') startMsg = "⏳ सुरक्षितपणे डेटा एन्क्रिप्ट केला जात आहे...";
        const processingMsg = await ctx.reply(startMsg);

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

            let doneMsg = "✅ डेटा सुरक्षित किया गया।";
            if (lang === 'en') doneMsg = "✅ Data secured.";
            else if (lang === 'mr') doneMsg = "✅ डेटा सुरक्षित केला.";

            await ctx.telegram.editMessageText(
                ctx.chat.id, processingMsg.message_id, undefined, doneMsg
            );

            let text = `📄 **केस दर्ज़!**\n\nतेरी शिकायत दर्ज हो गई! Case Code: <code>${formattedCode}</code>. संभाल के रखना — किसी को मत बताना.\nLCC को 7 दिन में acknowledge करना होता है.\nट्रैक करो /track से.`;
            if (lang === 'en') {
                text = `📄 **Case Filed!**\n\nYour complaint is logged! Case Code: <code>${formattedCode}</code>. Keep it safe — do not share it.\nLCC must acknowledge within 7 days.\nTrack it via /track.`;
            } else if (lang === 'mr') {
                text = `📄 **केस दाखल!**\n\nतुमची तक्रार नोंदवली गेली आहे! केस कोड: <code>${formattedCode}</code>. सुरक्षित ठेवा — कोणालाही सांगू नका.\nLCC ने ७ दिवसांत दखल घेणे आवश्यक आहे.\n/track वापरून ट्रॅक करा.`;
            }

            await ctx.reply(text, { parse_mode: 'HTML', ...Markup.removeKeyboard() });

            // Cleanup session
            ctx.session.compassResult = null;

        } catch (err) {
            console.error("DB Save Err:", err);
            let errMsg = "⚠️ मैं इस चरण को सहेज नहीं सका।";
            if (lang === 'en') errMsg = "⚠️ Failed to save securely.";
            else if (lang === 'mr') errMsg = "⚠️ हा टप्पा सेव्ह करण्यात अयशस्वी.";
            await ctx.reply(errMsg);
        }

        return ctx.scene.leave();
    }
);

const trackScene = new Scenes.WizardScene(
    'track',
    async (ctx) => {
        const lang = ctx.session?.lang || 'hi';
        let msg = "🔍 अपना 6-अंकों का ट्रैकिंग कोड दर्ज करें (उदा. SV-123456 या 123456):";
        if (lang === 'en') msg = "🔍 Please enter your 6-Digit tracking code (e.g. SV-123456 or 123456):";
        else if (lang === 'mr') msg = "🔍 तुमचा 6-अंकी ट्रॅकिंग कोड टाका (उदा. SV-123456 किंवा 123456):";

        await ctx.reply(msg, Markup.removeKeyboard());
        return ctx.wizard.next();
    },
    async (ctx) => {
        const lang = ctx.session?.lang || 'hi';
        // Clean the input, extract the 6 digits even if SV- is included
        const codeInput = ctx.message.text.replace(/[^0-9]/g, '').trim();

        if (codeInput.length !== 6) {
            let msg = "मैं उस केस का पता नहीं लगा सका। ट्रैकिंग नंबर की दोबारा जाँच करें।";
            if (lang === 'en') msg = "I couldn’t locate that case. Double-check the tracking number.";
            else if (lang === 'mr') msg = "मला ती केस सापडली नाही. ट्रॅकिंग नंबर तपासून पहा.";
            await ctx.reply(msg);
            return ctx.scene.leave();
        }

        const passphraseHash = hashData(codeInput);

        try {
            const result = await pool.query(
                "SELECT id, status FROM complaints_telegram WHERE passphrase_hash = $1",
                [passphraseHash]
            );

            if (result.rows.length === 0) {
                let msg = "मैं उस केस का पता नहीं लगा सका। ट्रैकिंग नंबर की दोबारा जाँच करें।";
                if (lang === 'en') msg = "I couldn’t locate that case. Double-check the tracking number.";
                else if (lang === 'mr') msg = "मला ती केस सापडली नाही. ट्रॅकिंग नंबर तपासून पहा.";
                await ctx.reply(msg);
            } else {
                const c = result.rows[0];

                let statusEmoji = "🟡"; // pending
                let niceStatus = "Pending Review";
                if (c.status === 'inquiry') { statusEmoji = "🔵"; niceStatus = "Inquiry Active"; }
                if (c.status === 'resolved') { statusEmoji = "🟢"; niceStatus = "Resolved"; }

                let text = `📄 **केस ID:** ${c.id}\n${statusEmoji} **स्थिति:** ${niceStatus}\n\nआप कर सकते हैं:\n• अधिक साक्ष्य जोड़ें → <code>/reply ${c.id} संदेश</code>\n• केस को ट्रैक करें → <code>/track</code>`;
                if (lang === 'en') {
                    text = `📄 <b>Case ID:</b> ${c.id}\n${statusEmoji} <b>Status:</b> ${niceStatus}\n\nYou can:\n• add more evidence → <code>/reply ${c.id} message</code>\n• track case → <code>/track</code>`;
                } else if (lang === 'mr') {
                    text = `📄 **केस ID:** ${c.id}\n${statusEmoji} **स्थिती:** ${niceStatus}\n\nतुम्ही करू शकता:\n• अधिक पुरावे जोडा → <code>/reply ${c.id} संदेश</code>\n• केस ट्रॅक करा → <code>/track</code>`;
                }

                await ctx.reply(text, { parse_mode: 'HTML' });
            }
        } catch (err) {
            console.error("Tracking Error:", err);
            let msg = "❌ स्थिति प्राप्त करने में त्रुटि।";
            if (lang === 'en') msg = "❌ Error retrieving status.";
            else if (lang === 'mr') msg = "❌ स्थिती मिळवण्यात त्रुटी.";
            await ctx.reply(msg);
        }

        return ctx.scene.leave();
    }
);

module.exports = { compassWizard, filingWizard, trackScene };
