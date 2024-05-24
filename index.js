const { Telegraf } = require("telegraf");
const { message } = require("telegraf/filters");
const fs = require("node:fs");
const exec = require("child_process").exec;
const execSync = require("child_process").execSync;
require('dotenv').config();

const main = './whisper/main';
const language = `ru`;
const model = `./whisper/models/ggml-base.bin`;
const voiceStore = './whisper/voices';

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.on(message('voice'), async ctx => {
    const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
    const filename = Date.now();

    await fetch(link.href)
        .then(res => res.arrayBuffer())
        .then(res => fs.writeFileSync(`./whisper/voices/${filename}.oga`, Buffer.from(res)));

    await execSync(`ffmpeg -loglevel error -i ${voiceStore}/${filename}.oga -ar 16000 -ac 1 -c:a pcm_s16le ${voiceStore}/${filename}.wav`);

    const cmd = `${main} -l ${language} -np -f ${voiceStore}/${filename}.wav -m ${model}`;
    await exec(cmd, async (err, stdout) => {
        const transcribedVoice = stdout.split("\n")
            .map(s => s.replace(/\[.*\]/, '').trim())
            .join('\n');

        await ctx.reply(transcribedVoice, {
            reply_to_message_id: ctx.message.message_id
        });
    });
});

bot.launch();

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))