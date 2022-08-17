const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: false, slowMo: 100 });
    const page = await browser.newPage();
    await page.goto('https://groups.google.com/g/domination-study-group/members');
    const textBox = await page.$('#identifierId');
    await textBox.type('dummy-email@gmail.com');
    await textBox.press('Enter');
    const passwordBox = await page.$('dummy-password');
    await passwordBox.type('');
    await passwordBox.press('Enter');

    //   await page.screenshot({path: 'example-matey.png'});


    const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));
    const example = async () => {
      console.log('About to snooze without halting the event loop...');
      await snooze(5000);
      console.log('done!');
    };
    await example();


    await browser.close();
})();
