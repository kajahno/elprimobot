const puppeteer = require('puppeteer');

const config = {
  GMAIL_EMAIL: process.env.GMAIL_EMAIL || undefined,
  GGMAIL_PASSWORD: process.env.GGMAIL_PASSWORD || undefined
};

(async () => {
    const browser = await puppeteer.launch({ headless: false, slowMo: 100 });
    const page = await browser.newPage();
    await page.goto('https://groups.google.com/g/domination-study-group/members');
    const textBox = await page.$('#identifierId');
    await textBox.type(config.GMAIL_EMAIL);
    await textBox.press('Enter');
    const passwordBox = await page.$('[name=password]');
    if(passwordBox != null)
    {
      await passwordBox.type(config.GGMAIL_PASSWORD);
      await passwordBox.press('Enter');
    }

    //   await page.screenshot({path: 'example-matey.png'});


    const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));
    const example = async () => {
      console.log('About to snooze without halting the event loop...');
      await snooze(5000);
      console.log('done!');
    };
    await example();


    //await browser.close();
})();
