# XMTP Bot CLI

XMTP Bot CLI is a package made to simplify the development of XMTP bots. This framework connects to the XMTP network, then helps process incoming messages on the XMTP network and features an out-of-band channel, which, by default, uses standard input (stdin) for controlling the bot (custom) and communication with the message handler.

# Usage

```
export interface IContext {
    [key: string]: string | Client | undefined;
}
export interface IHandleLine { (ctx: IContext, line: string): boolean }
export interface IHandleMessage { (ctx: IContext, message: DecodedMessage): boolean }
```

Context will be initialized by the constructor to have a reference to the XMTP Client but otherwise is meant for the line input handler and the message handler to pass or store data back and forth, if needed.

The line handler is called with a line of text after the owner enters it on the console and should return false to finish controlling the bot.

The message handler will be called when the Stream sees a new message from any conversation, including your own sent messages. Conveniently, the message has a function to reply to the conversation, otherwise the context's Client can be used to send messages.

# Example

This is all you need to run a bot that replies "gm" to anyone sending it a message while the owner can update the greeting message while the bot is running.

```
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
```