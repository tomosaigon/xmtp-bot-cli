import { botConfig, XmtpBot, IContext } from "..";
import { Client, DecodedMessage } from "@xmtp/xmtp-js";

if (process.env.GM_XMTP_KEY === undefined) {
    throw "GM_XMTP_KEY is not set";
}
botConfig.key = process.env.GM_XMTP_KEY;
// botConfig.env = "dev";  
console.log('Starting bot. Enter your custom greeting, e.g. gm (or "exit" to exit, "info" to see current greeting):');
const bot = new XmtpBot(
    (ctx: IContext, line: string) => {
        if (line === 'exit') {
            return false;
        }
        if (line === 'info') {
            console.log(`greeting = ${ctx.greeting}`);
            return true;
        }
        console.log(`set greeting = ${line}`);
        ctx.greeting = line;
        return true;
    },
    (ctx: IContext, message: DecodedMessage) => {
        if (ctx.client !== undefined && message.senderAddress === (ctx.client as Client).address) {
            return true;
        }
        console.log(`Got a message`, message.content);
        message.conversation.send(ctx.greeting ? ctx.greeting : 'gm');
        return true;
    },
);

bot.run().then(() => {
    console.log('bot.run() done');
    process.exit(0);
}).catch((err) => {
    console.error(`bot.run() error: ${err}`);
});


