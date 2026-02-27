const { Markup } = require('telegraf');

function handleMenu(ctx) {
    const lang = ctx.session?.lang || 'hi';

    let text = "⚖️ **अपना हक जानें**\nनीचे दिए गए किसी भी विषय पर टैप करें:";
    let btn1 = 'K1: POSH Act kya hai?';
    let btn2 = 'K2: Time limit kya hai?';
    let btn3 = 'K3: Kya protection milegi?';
    let btn4 = 'K4: Employer ne kuch nahi kiya?';
    let btn5 = '📥 Niche Shikayat Darj Karein';

    if (lang === 'en') {
        text = "⚖️ **Know Your Rights**\nTap any topic below:";
        btn1 = 'K1: What is the POSH Act?';
        btn2 = 'K2: What is the time limit?';
        btn3 = 'K3: What protection is provided?';
        btn4 = 'K4: Employer took no action?';
        btn5 = '📥 File Complaint Below';
    } else if (lang === 'mr') {
        text = "⚖️ **तुमचे हक्क जाणून घ्या**\nखालीलपैकी कोणत्याही विषयावर टॅप करा:";
        btn1 = 'K1: POSH Act काय आहे?';
        btn2 = 'K2: वेळ मर्यादा काय आहे?';
        btn3 = 'K3: कोणते संरक्षण मिळेल?';
        btn4 = 'K4: मालकाने काहीच केले नाही?';
        btn5 = '📥 खाली तक्रार नोंदवा';
    }

    ctx.reply(text, Markup.inlineKeyboard([
        [Markup.button.callback(btn1, 'kr_k1')],
        [Markup.button.callback(btn2, 'kr_k2')],
        [Markup.button.callback(btn3, 'kr_k3')],
        [Markup.button.callback(btn4, 'kr_k4')],
        [Markup.button.callback(btn5, 'menu_file')]
    ]));
}

function setupActions(bot) {
    bot.action('kr_k1', ctx => {
        const lang = ctx.session?.lang || 'hi';
        ctx.answerCbQuery();
        if (lang === 'en') ctx.reply("K1: Enacted in 2013, POSH covers sexual harassment. Domestic workers are also covered under Section 2(f).\n\n[File Complaint] (/report)");
        else if (lang === 'mr') ctx.reply("K1: POSH 2013 मध्ये लागू झाला. केवळ लैंगिक छळासाठी कायदा. घरकाम करणाऱ्या महिलाही कलम 2(f) अंतर्गत कव्हर केल्या जातात.\n\n[तक्रार नोंदवा] (/report)");
        else ctx.reply("K1: POSH 2013 mein bana. Sirf sexual harassment ka kanoon. Ghar mein kaam karne wali maids bhi covered hain — Section 2(f) ke andar.\n\n[File Complaint] (/report)");
    });
    bot.action('kr_k2', ctx => {
        const lang = ctx.session?.lang || 'hi';
        ctx.answerCbQuery();
        if (lang === 'en') ctx.reply("K2: The limit is 3 months. With a valid reason, the LCC can extend it to 6 months.\n\n[File Complaint] (/report)");
        else if (lang === 'mr') ctx.reply("K2: 3 महिन्यांची मर्यादा आहे. योग्य कारण असल्यास LCC 6 महिन्यांपर्यंत वेळ वाढवू शकते.\n\n[तक्रार नोंदवा] (/report)");
        else ctx.reply("K2: 3 mahine ki limit hoti hai. Bahut achi wajah ho toh LCC 6 mahine tak sun sakti hai. Jitni jaldi ho sake utna behtar.\n\n[File Complaint] (/report)");
    });
    bot.action('kr_k3', ctx => {
        const lang = ctx.session?.lang || 'hi';
        ctx.answerCbQuery();
        if (lang === 'en') ctx.reply("K3: The employer cannot fire you for complaining. LCC can order interim transfers, leave, or other protection.\n\n[File Complaint] (/report)");
        else if (lang === 'mr') ctx.reply("K3: तक्रार केल्यामुळे मालक नोकरीवरून काढू शकत नाही — हा वेगळा गुन्हा आहे. LCC तात्पुरती बदली, रजा किंवा संरक्षण देऊ शकते.\n\n[तक्रार नोंदवा] (/report)");
        else ctx.reply("K3: Employer complaint ke baad job nahi nikal sakta — yeh alag crime hai. LCC interim transfer, leave, ya protection de sakti hai.\n\n[File Complaint] (/report)");
    });
    bot.action('kr_k4', ctx => {
        const lang = ctx.session?.lang || 'hi';
        ctx.answerCbQuery();
        if (lang === 'en') ctx.reply("K4: If the employer is accused or not listening, go to the LCC. LCC → District Officer → Labour Court is the escalation path.\n\n[File Complaint] (/report)");
        else if (lang === 'mr') ctx.reply("K4: जर मालकच आरोपी असेल किंवा ऐकत नसेल — तर LCC कडे जा. LCC → District Officer → Labour Court — हा पुढचा मार्ग आहे.\n\n[तक्रार नोंदवा] (/report)");
        else ctx.reply("K4: Agar employer accused hai ya nahi sun raha — LCC jaao. LCC → District Officer → Labour Court — yeh escalation path hai.\n\n[File Complaint] (/report)");
    });
}

module.exports = { handleMenu, setupActions };
