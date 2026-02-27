const { Markup } = require('telegraf');

function handleMenu(ctx) {
    const hindi = ctx.session?.lang === 'hi';
    const text = hindi ? "⚖️ **अपना हक जानें**\nनीचे दिए गए किसी भी विषय पर टैप करें:" : "⚖️ **Know Your Rights**\nTap any topic below:";

    ctx.reply(text, Markup.inlineKeyboard([
        [Markup.button.callback('K1: POSH Act kya hai?', 'kr_k1')],
        [Markup.button.callback('K2: Time limit kya hai?', 'kr_k2')],
        [Markup.button.callback('K3: Kya protection milegi?', 'kr_k3')],
        [Markup.button.callback('K4: Employer ne kuch nahi kiya?', 'kr_k4')],
        [Markup.button.callback('📥 Niche Shikayat Darj Karein', 'menu_file')]
    ]));
}

function setupActions(bot) {
    bot.action('kr_k1', ctx => {
        ctx.answerCbQuery();
        ctx.reply("K1: POSH 2013 mein bana. Sirf sexual harassment ka kanoon. Ghar mein kaam karne wali maids bhi covered hain — Section 2(f) ke andar.\n\n[File Complaint] (/report)");
    });
    bot.action('kr_k2', ctx => {
        ctx.answerCbQuery();
        ctx.reply("K2: 3 mahine ki limit hoti hai. Bahut achi wajah ho toh LCC 6 mahine tak sun sakti hai. Jitni jaldi ho sake utna behtar.\n\n[File Complaint] (/report)");
    });
    bot.action('kr_k3', ctx => {
        ctx.answerCbQuery();
        ctx.reply("K3: Employer complaint ke baad job nahi nikal sakta — yeh alag crime hai. LCC interim transfer, leave, ya protection de sakti hai.\n\n[File Complaint] (/report)");
    });
    bot.action('kr_k4', ctx => {
        ctx.answerCbQuery();
        ctx.reply("K4: Agar employer accused hai ya nahi sun raha — LCC jaao. LCC → District Officer → Labour Court — yeh escalation path hai.\n\n[File Complaint] (/report)");
    });
}

module.exports = { handleMenu, setupActions };
