import fetch from "node-fetch";
import { verifyKey } from "discord-interactions";
import { Client, Intents } from "discord.js";
import { Leetcode, Stats } from "./api/index.js";
import { config } from "./config.js";

export function VerifyDiscordRequest(clientKey) {
    return function (req, res, buf) {
        const signature = req.get("X-Signature-Ed25519");
        const timestamp = req.get("X-Signature-Timestamp");

        const isValidRequest = verifyKey(buf, signature, timestamp, clientKey);
        if (!isValidRequest) {
            res.status(401).send("Bad request signature");
            throw new Error("Bad request signature");
        }
    };
}

export async function DiscordRequest(endpoint, options) {
    const opt = options;
    // append endpoint to root API URL
    const url = `https://discord.com/api/v10/${endpoint}`;
    // Stringify payloads
    if (opt.body) opt.body = JSON.stringify(opt.body);
    // Use node-fetch to make requests
    const res = await fetch(url, {
        headers: {
            Authorization: `Bot ${config.DISCORD_TOKEN}`,
            "Content-Type": "application/json; charset=UTF-8",
            "User-Agent": "DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)",
        },
        ...opt,
    });
    // throw API errors
    if (!res.ok) {
        const data = await res.json();
        console.log(res.status);
        throw new Error(JSON.stringify(data));
    }
    // return original response
    return res;
}

// Simple method that returns a random emoji from list
export function getRandomEmoji() {
    const emojiList = ["😭", "😄", "😌", "🤓", "😎", "😤", "🤖", "😶‍🌫️", "🌏", "📸", "💿", "👋", "🌊", "✨"];
    return emojiList[Math.floor(Math.random() * emojiList.length)];
}

export function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

const discordClient = new Client({ intents: [Intents.FLAGS.GUILDS] });
let DISCORD_CLIENT_READY = false;
export async function initializeDiscordClient() {
    // Login to Discord with your client's token
    discordClient.login(); // This leaves the app blocking
    // because it opens a ws connection to Discord,
    // call discordClient.destroy() somewhere else to close it (if required)

    // When the client is ready, run this code (only once)
    discordClient.once("ready", async () => {
        console.log("discord client is ready");
        DISCORD_CLIENT_READY = true;
    });
}

export async function postDailyMessages() {
    if (!DISCORD_CLIENT_READY) {
        console.error("discord client is not ready");
        return;
    }

    const leetcode = new Leetcode(discordClient);
    await leetcode.postDailyChallenge();
    await leetcode.postWeeklyChallenge();

    const stats = new Stats(discordClient);
    await stats.postDailyStats();
    // TODO: refactor and call weekly update which includes leetcode and stats updates
    await stats.postWeeklyStats();
}
