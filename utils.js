import fetch from "node-fetch";
import { verifyKey } from "discord-interactions";
import { Leetcode, Stats, getDiscordClient } from "./api/index.js";
import { config } from "./config.js";

export function VerifyDiscordRequest(clientKey) {
    return (req, res, buf) => {
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

export async function postDailyMessages() {
    const client = await getDiscordClient();
    console.log("postDailyMessages triggered at:", new Date(Date.now()).toUTCString(0));

    const leetcode = new Leetcode(client);
    await leetcode.postDailyChallenge();
    await leetcode.postWeeklyChallenge();

    const stats = new Stats(client);
    await stats.postDailyStats();
    client.destroy();
}

export async function postWeeklyMessages() {
    const client = await getDiscordClient();

    console.log("postWeeklyMessages triggered at:", new Date(Date.now()).toUTCString(0));
    const stats = new Stats(client);
    await stats.postWeeklyStats();
    client.destroy();
}
