# Elprimobot

It's a bot to help you manage Discord communities, especially those with programmers.

## Features
- Send the daily Leetcode challenge to a specific channel
- Send the weekly Leetcode challenge to a specific channel
- Daily and Weekly stats about the engagement of the community

## Development

### Requirements

> Note: if you use [NixOs](https://nixos.org/download) you can just `nix-shell` and enter a shell with the dependencies.

* Install [nodejs18](https://nodejs.org/download/release/latest-v18.x/)
* Install dependencies:
```bash
npm install
```
* On the discord side:
  * bot to be configured as explained in [here](https://discord.com/developers/docs/getting-started)
  * A server with the app running
  * The callback URL configured (we used nginx with letsencrypt)

## Configuring environment

Copy .env.sample, rename it to .env and replace the placeholders

## Running the app

```bash
node app.js
```

## Packaging

We use [pkg](https://www.npmjs.com/package/pkg) to create a static binary, platform agnostic.

Now there's a problem with pkg: it doesn't compile ES6, and that's what we're using. The solution for now is to use babel as a transpiler to convert all the code to ES5, so pkg can work with it.

The commands are included in package.json.

## Deploying

Currently the assumption is that the target is configured using SSH (either using a config file or an agent).
