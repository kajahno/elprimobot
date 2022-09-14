require("dotenv").config();

const config = {
  GMAIL_EMAIL: process.env.GMAIL_EMAIL || undefined,
  GMAIL_PASSWORD_B64: process.env.GMAIL_PASSWORD_B64 || undefined,
  RECAPTCHA_TOKEN: process.env.RECAPTCHA_TOKEN || undefined
};

const puppeteer = require('puppeteer-extra')

// Stealth plugin for google to not detect this is a robot
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())


// Add adblocker plugin to block all ads and trackers (saves bandwidth)
const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker");
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

// Recaptcha to solve the last window when adding a new member
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha')
puppeteer.use(
  RecaptchaPlugin({
    provider: {
      id: '2captcha',
      token: config.RECAPTCHA_TOKEN // REPLACE THIS WITH YOUR OWN 2CAPTCHA API KEY ⚡
    },
    visualFeedback: true // colorize reCAPTCHAs (violet = detected, green = solved)
  })
)

//TODO: get new member emails as param
const newMemberEmail = "yamil.tactuk@gmail.com";

(async () => {

    const browser = await puppeteer.launch({ headless: false, slowMo: 50 });
    const pages = await browser.pages();
    const page = pages[0];

    await page.setBypassCSP(true)

    await page.goto('https://groups.google.com/g/domination-study-group/members');
    const emailBox = await page.$('#identifierId');
    await emailBox.type(config.GMAIL_EMAIL);
    await emailBox.press('Enter');

    const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));
    await snooze(2000);

    const passwordBox = await page.$("input[type='password']");
    if(passwordBox != null)
    {
      let buff = new Buffer.from(config.GMAIL_PASSWORD_B64, 'base64');
      let pass = buff.toString('ascii');
      await passwordBox.type(pass); // Somehow this is sending new line
    } else {
      console.error("couldn't find the password box")
    }

    await snooze(4000);
    
    await page.click("div[aria-label='Add members']");

    await snooze(2000);
    
    const addGroupMembers = await page.$("input[aria-label='Group members']");
    await addGroupMembers.type(newMemberEmail);
    const invitationMessage = await page.$("textarea[aria-label='Invitation message']");
    await invitationMessage.type("Welcome to Domination group!");

    await snooze(1000);

    await page.click("div[aria-label='Send invites']");
    
    await snooze(4000);

    await page.solveRecaptchas()

    await snooze(3000);

    // For some reason puppeteer wouldn't select with the aria-label, so I've
    //  done it this way for now.
    const sel = "div > div > div > span > c-wiz > div > div > section > span > div > div > div > span > span";
    const sendInvitesBtn = await page.$(sel);
    if (sendInvitesBtn != null){
      await sendInvitesBtn.click()
    } else {
      console.error(`could not find the element with selector: ${sel} `)
    }

    //await browser.close();
})();
