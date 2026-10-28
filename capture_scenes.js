const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT_DIR = path.join(__dirname, 'video_assets');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function capture() {
  console.log('Launching browser with Edge...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();

  // 1. Scene 1: Login Page
  console.log('Capturing Scene 1: Login Page...');
  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle0' });
  await delay(1200);
  await page.screenshot({ path: path.join(OUT_DIR, 'scene1_login.png') });

  // Login as Admin
  console.log('Logging in as Property Admin...');
  await page.type('input[type="email"]', 'admin@stayhaven.com');
  await page.type('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await delay(2000);

  // 2. Scene 2: Dashboard Overview
  console.log('Capturing Scene 2: Dashboard Overview...');
  await page.screenshot({ path: path.join(OUT_DIR, 'scene2_dashboard.png') });

  // 3. Scene 3: Rooms & Bed Inventory
  console.log('Capturing Scene 3: Rooms & Beds...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => b.textContent.includes('Rooms & Beds'));
    if (btn) btn.click();
  });
  await delay(1200);
  await page.screenshot({ path: path.join(OUT_DIR, 'scene3_rooms.png') });

  // 4. Scene 4: Check-in Modal with live pro-rated preview
  console.log('Capturing Scene 4: Check-in Modal with pro-rated calculation...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => b.textContent.includes('Assign Resident') || b.textContent.includes('Assign'));
    if (btn) btn.click();
  });
  await delay(1000);
  await page.screenshot({ path: path.join(OUT_DIR, 'scene4_checkin_modal.png') });

  // Close modal
  await page.keyboard.press('Escape');
  await delay(600);

  // 5. Scene 5: Billing & Invoicing Ledger
  console.log('Capturing Scene 5: Billing & Invoicing...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => b.textContent.includes('Billing & Invoicing'));
    if (btn) btn.click();
  });
  await delay(1200);
  await page.screenshot({ path: path.join(OUT_DIR, 'scene5_billing.png') });

  // 6. Scene 6: Printable Payment Receipt
  console.log('Capturing Scene 6: Printable Payment Receipt...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => b.textContent.includes('Receipt'));
    if (btn) btn.click();
  });
  await delay(1200);
  await page.screenshot({ path: path.join(OUT_DIR, 'scene6_receipt.png') });

  // Close receipt modal
  await page.keyboard.press('Escape');
  await delay(600);

  // 7. Scene 7: Work Orders
  console.log('Capturing Scene 7: Work Orders...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => b.textContent.includes('Work Orders'));
    if (btn) btn.click();
  });
  await delay(1200);
  await page.screenshot({ path: path.join(OUT_DIR, 'scene7_work_orders.png') });

  // Logout and sign in as Resident
  console.log('Switching to Resident Portal...');
  await page.evaluate(() => {
    const btn = document.querySelector('button[title="Sign Out"]');
    if (btn) btn.click();
  });
  await delay(1200);

  // Login as Rahul
  await page.type('input[type="email"]', 'rahul@gmail.com');
  await page.type('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await delay(2000);

  // 8. Scene 8: Resident Self-Service Portal
  console.log('Capturing Scene 8: Resident Self-Service Portal...');
  await page.screenshot({ path: path.join(OUT_DIR, 'scene8_resident_portal.png') });

  await browser.close();
  console.log('✅ All browser scenes captured successfully!');
}

capture().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
