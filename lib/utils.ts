import fetch, { Response as HttpResponse, RequestInit } from 'node-fetch';
import { verifyKey } from 'discord-interactions';
import { Request, Response } from 'express';
import { Client } from 'discord.js';
import { Leetcode, Stats, getDiscordClient } from './api/index';
import { config } from './config';
import logger from './logging';

export function VerifyDiscordRequest(clientKey : string) {
  return (req: Request, res: Response, buf: Buffer) => {
    const signature = req.get('X-Signature-Ed25519');
    const timestamp = req.get('X-Signature-Timestamp');

    const isValidRequest = verifyKey(buf, signature, timestamp, clientKey);
    if (!isValidRequest) {
      res.status(401).send('Bad request signature');
      throw new Error('Bad request signature');
    }
  };
}

export async function DiscordRequest(
  endpoint: string,
  options: RequestInit,
): Promise<HttpResponse> {
  const opt = options;
  // append endpoint to root API URL
  const url = `https://discord.com/api/v10/${endpoint}`;
  // Stringify payloads
  if (opt.body) opt.body = JSON.stringify(opt.body);
  // Use node-fetch to make requests
  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${config.DISCORD_TOKEN}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'User-Agent': 'DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)',
    },
    ...opt,
  });
  // throw API errors
  if (!res.ok) {
    const data = await res.json() as () => Promise<void>;
    logger.info(res.status);
    throw new Error(JSON.stringify(data));
  }
  // return original response
  return res;
}

export async function postDailyMessages() {
  const client = await getDiscordClient() as Client;
  logger.info('postDailyMessages triggered at:', new Date(Date.now()).toUTCString());

  const leetcode = new Leetcode(client);
  await leetcode.postDailyChallenge();
  await leetcode.postWeeklyChallenge();
  logger.info('destroying discord client');
}

export async function postWeeklyMessages() {
  const client = await getDiscordClient() as Client;

  logger.info('postWeeklyMessages triggered at:', new Date(Date.now()).toUTCString());
  const stats = new Stats(client);
  await stats.postWeeklyStats();
  logger.info('destroying discord client');
}
