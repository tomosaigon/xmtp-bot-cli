import { Client, DecodedMessage, type XmtpEnv } from "@xmtp/xmtp-js";
import { Wallet } from "ethers";
import { iteracer } from 'iteracer';
import readline from 'readline';
import { Readable } from 'stream';

export const botConfig = {
    key: '',
    env: (process.env.XMTP_ENV !== undefined ? process.env.XMTP_ENV : "production") as XmtpEnv,
    doneLineReader: () => console.log('Done for LineReader'),
    doneStreamAllMessages: () => console.log('Done for StreamAllMessages'),
    input: process.stdin as Readable,
};

/**
 *  AsyncGenerator on readlines of text from botConfig.input.
 *
 * @param {string} prompt - The prompt to display to the user, e.g. '> '.
 * @returns {AsyncGenerator<string, void, void>} An asynchronous generator yielding user input lines.
 */
async function* createLineReader(prompt: string): AsyncGenerator<string, void, void> {
    const lineReader = readline.createInterface({
        input: botConfig.input,
        output: process.stdout,
    });
    let isDone = false;
    let rejectQuestion: (reason?: unknown) => void;

    lineReader.on('close', () => {
        console.log('EOF (end of file) detected. Exiting...');
        isDone = true;
        rejectQuestion();
        // process.exit(0);
    });
    lineReader.on('error', (err) => {
        console.error(`createLineReader error: ${err.message}`);
        isDone = true;
    });
    while (!isDone) {
        const line = await new Promise<string>((resolve, reject) => {
            rejectQuestion = reject;
            lineReader.question(prompt, (answer) => {
                resolve(answer);
            });
        }).catch(() => {
            isDone = true;
            return ''; // yield line
        });

        yield line;
    }
}

/**
 * Creates an XMTP client and publishes on network.
 *
 * @returns {Promise<Client>} A promise that resolves to an xmtp-js Client.
 */
export async function createClient(): Promise<Client> {
    const wallet = botConfig.key ? new Wallet(botConfig.key) : Wallet.createRandom();
    if (!(["production", "dev", "local"] as Array<XmtpEnv>).includes(botConfig.env)) {
        throw "invalid XMTP env";
    }

    const client = await Client.create(wallet, {
        env: botConfig.env,
    });
    await client.publishUserContact();
    return client;
}

/**
 * An object representing the context for the XMTP bot.
 */
export interface IContext {
    client: Client | undefined;
    linePrompt: string;
    [key: string]: string | boolean | object | undefined;
}
export interface IHandleLine { (ctx: IContext, line: string): Promise<boolean> }
export interface IHandleMessage { (ctx: IContext, message: DecodedMessage): Promise<boolean> }

export class XmtpBot {
    private client: Promise<Client>;
    ctx: IContext = { client: undefined, linePrompt: '> ' };
    handleLine: IHandleLine;
    handleMessage: IHandleMessage;

    /**
 * Creates a new XmtpBot instance.
 *
 * @param {IHandleLine} _handleLine - The function to handle input lines.
 * @param {IHandleMessage} _handleMessage - The function to handle XMTP messages.
 */
    constructor(_handleLine: IHandleLine, _handleMessage: IHandleMessage) {
        this.handleLine = _handleLine;
        this.handleMessage = _handleMessage;
        this.client = this.createClient();
    }

    private async createClient(): Promise<Client> {
        return new Promise((resolve) => {
            createClient().then((client) => {
                console.log(`Listening on ${client.address}`);
                this.ctx.client = client;
                resolve(client);
            });
        });
    }

    /**
     * Gets the XMTP client associated with the bot.
     *
     * @returns {Promise<Client>} A promise that resolves to the XMTP client.
     */
    async getClient(): Promise<Client> {
        return this.client;
    }

    /**
     * Runs the XMTP bot, handling input and messages.
     */
    async run() {
        // TODO raw stream not streamAllMessages, has return should be called if the interpreter detects that the stream won't be used anymore
        await iteracer(
            createLineReader(this.ctx.linePrompt),
            await (await this.getClient()).conversations.streamAllMessages(() => {
                // Periodic "Stream connection closed. Resubscribing TypeError: fetch failed"
                console.log("onConnectionLost called: Skip XMTP Client.conversations.streamAllMessages exception");
            }),
            (value: string) => this.handleLine(this.ctx, value),
            (value: DecodedMessage) => this.handleMessage(this.ctx, value),
            botConfig.doneLineReader,
            botConfig.doneStreamAllMessages,
        );
        // await (await this.client).close(); // gracefully shut down the client but: { return undefined }
    }
}
