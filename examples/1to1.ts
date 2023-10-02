import { botConfig, XmtpBot, IContext } from "../src";
import { Client, DecodedMessage, Conversation } from "@xmtp/xmtp-js";

if (process.env.XMTP_KEY === undefined) {
    throw "XMTP_KEY is not set";
}
botConfig.key = process.env.XMTP_KEY;

if (process.argv.length <= 2) {
    throw new Error("XMTP_PEER argument is missing");
}
const XMTP_PEER = process.argv[2];

(async () => {
    let convo: Conversation;
    let cat: string[] = [];
    let catMode = false;
    console.log('Starting 1-to-1 convo with peer ' + XMTP_PEER);
    const bot = new XmtpBot(
        async (ctx: IContext, line: string) => {
            if (line === '/exit') {
                return false;
            }
            if (line === '/cat') {
                // will short-circuit existing cats
                catMode = true;
                cat = [];
                return true;
            }
            if (line === '/eof') {
                convo.send(cat.join('\n'));
                cat = [];
                catMode = false;
                return true;
            }
            if (catMode) {
                cat.push(line);
                return true;
            }
            convo.send(line);
            return true;
        },
        async (ctx: IContext, message: DecodedMessage) => {
            if (ctx.client !== undefined && message.senderAddress === (ctx.client as Client).address) {
                return true;
            }
            if (message.senderAddress !== XMTP_PEER) {
                console.log(`Got a message from ${message.senderAddress} (not ${XMTP_PEER})`);
            }
            console.log(`<`, message.content);
            return true;
        },
    );
    const client = await bot.getClient();
    convo = await client.conversations.newConversation(XMTP_PEER);

    bot.run().then(() => {
        process.exit(0);
    }).catch((err) => {
        console.error(`bot.run() error: ${err}`);
    });
})();
