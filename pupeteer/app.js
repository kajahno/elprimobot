require("dotenv").config();
const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const config = {
  GMAIL_EMAIL: process.env.GMAIL_EMAIL || undefined,
  GMAIL_PASSWORD_B64: process.env.GMAIL_PASSWORD_B64 || undefined
};

(async () => {

    const browser = await puppeteer.launch({ headless: false, slowMo: 50 });
    const pages = await browser.pages();
    const page = pages[0];
    await page.goto('https://groups.google.com/g/domination-study-group/members');
    const textBox = await page.$('#identifierId');
    await textBox.type(config.GMAIL_EMAIL);
    await textBox.press('Enter');

    const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));
    await snooze(5000);

    const passwordBox = await page.$("input[type='password']");
    if(passwordBox != null)
    {
      let buff = new Buffer.from(config.GMAIL_PASSWORD_B64, 'base64');
      let pass = buff.toString('ascii').replace('/\r\n//');
      await passwordBox.type(pass); // Somehow this is sending new line
    } else {
      console.error("couldn't find the password box")
    }

    //   await page.screenshot({path: 'example-matey.png'});
    await snooze(5000);


    //await browser.close();
})();
