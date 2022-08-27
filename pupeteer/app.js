require("dotenv").config();
const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const config = {
  GMAIL_EMAIL: process.env.GMAIL_EMAIL || undefined,
  GMAIL_PASSWORD_B64: process.env.GMAIL_PASSWORD_B64 || undefined
};

//TODO: get new member email
const newMemberEmail = "new-member@gmail.com";

(async () => {

    const browser = await puppeteer.launch({ headless: false, slowMo: 50 });
    const pages = await browser.pages();
    const page = pages[0];
    await page.goto('https://groups.google.com/g/domination-study-group/members');
    const emailBox = await page.$('#identifierId');
    await emailBox.type(config.GMAIL_EMAIL);
    await emailBox.press('Enter');

    const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));
    await snooze(1000);

    const passwordBox = await page.$("input[type='password']");
    if(passwordBox != null)
    {
      let buff = new Buffer.from(config.GMAIL_PASSWORD_B64, 'base64');
      let pass = buff.toString('ascii');
      await passwordBox.type(pass); // Somehow this is sending new line
      await passwordBox.press('Enter');
    } else {
      console.error("couldn't find the password box")
    }

    await snooze(5000);

    
    await page.click("div[aria-label='Add members']");

    await snooze(1000);
    
    const addGroupMembers = await page.$("input[aria-label='Group members']");
    await addGroupMembers.type(newMemberEmail);
    const invitationMessage = await page.$("textarea[aria-label='Invitation message']");
    await invitationMessage.type("Welcome to Domination group!");

    await snooze(1000);

    //await page.click("div[aria-label='Send invites']");

    
    await snooze(5000);
    

    //await browser.close();
})();
