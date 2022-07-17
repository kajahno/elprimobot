# Elprimobot

It's a bot to help us manage our Discord

## Development

### Requirements

* Install [nodejs16](https://nodejs.org/download/release/latest-v16.x/)
* Install dependencies:
```bash
npm install
```

# Configuring environment

Copy .env.sample, rename it to .env and replace the placeholders

# Running the app

```bash
node app.js
```

# Packaging

We use [pkg](https://www.npmjs.com/package/pkg) to create a static binary, platform agnostic.

* Install pkg but don't save it in package.json:
```bash
npm install --no-save pkg
```
* Build the executables:
```bash
npx pkg -t node16-linuxstatic-x64,node16-win-x64  -o elprimobot app.js
```
