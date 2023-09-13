import { botConfig, XmtpBot, IContext } from "..";
import { Client, DecodedMessage } from "@xmtp/xmtp-js";
import { Readable } from 'stream';

class MockStandardInput extends Readable {
    private data: string[];
    private currentIndex: number;

    constructor() {
        super();
        this.data = ['gm\n', 'exit\n'];
        this.currentIndex = 0;
    }

    _read() {
        // console.log('MockStandardInput _read', this.currentIndex, this.data.length);
        if (this.currentIndex < this.data.length) {
            const chunk = this.data[this.currentIndex];
            this.push(chunk);
            this.currentIndex++;
        } else {
            this.push(null);
        }
    }
}

botConfig.key = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // hardhat account 0
botConfig.input = new MockStandardInput();

describe('XmtpBot', () => {
  // Test constructor
  it('should create a XmtpBot instance and ctrl-d exit', async () => {
    const bot = new XmtpBot(
      async (ctx: IContext, line: string) => {
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
      async (ctx: IContext, message: DecodedMessage) => {
          if (ctx.client !== undefined && message.senderAddress === (ctx.client as Client).address) {
              return true;
          }
          console.log(`Got a message`, message.content);
          message.conversation.send(ctx.greeting ? ctx.greeting : 'Hello, World!');
          return true;
      },
  );
    await bot.getClient();
    await bot.run();
    expect(bot).toBeInstanceOf(XmtpBot);
  }, 10000);
});
