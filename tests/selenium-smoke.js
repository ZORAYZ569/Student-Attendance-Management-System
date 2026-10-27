// Optional browser smoke test. Start the app first with `npm start`.
// Run with: node tests/selenium-smoke.js (Chrome and a compatible driver are required).
const { Builder, By, until } = require('selenium-webdriver');

(async function smokeTest() {
  const driver = await new Builder().forBrowser('chrome').build();
  try {
    await driver.get('http://localhost:3000');
    await driver.wait(until.titleIs('Student Attendance Management System'), 10000);
    await driver.wait(until.elementLocated(By.id('attendanceTable')), 10000);
    console.log('PASS: attendance page opened and table is present.');
  } finally {
    await driver.quit();
  }
})().catch(err => { console.error(err); process.exitCode = 1; });
