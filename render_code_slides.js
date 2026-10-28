const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT_DIR = path.join(__dirname, 'video_assets');

async function renderSlides() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Slide 9: Code Walkthrough - rentCalculator.ts
  const htmlCode1 = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin: 0; background: #0f172a; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; padding: 60px 80px; }
        .badge { display: inline-block; padding: 6px 14px; background: #1e293b; color: #38bdf8; border: 1px solid #334155; border-radius: 8px; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; }
        h1 { font-size: 38px; font-weight: 800; color: #ffffff; margin: 0 0 10px 0; }
        p.subtitle { font-size: 18px; color: #94a3b8; margin: 0 0 40px 0; }
        .code-window { background: #020617; border: 1px solid #1e293b; border-radius: 16px; padding: 30px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
        .window-header { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #1e293b; }
        .dot { width: 12px; height: 12px; border-radius: 50%; }
        .dot-red { background: #ef4444; } .dot-yellow { background: #f59e0b; } .dot-green { background: #10b981; }
        .title { color: #64748b; font-size: 14px; margin-left: 10px; font-family: sans-serif; }
        pre { font-size: 18px; line-height: 1.6; color: #e2e8f0; margin: 0; font-family: "Cascadia Code", "Fira Code", Consolas, monospace; }
        .kw { color: #f43f5e; font-weight: 600; }
        .fn { color: #38bdf8; font-weight: 600; }
        .str { color: #34d399; }
        .num { color: #fbbf24; }
        .comment { color: #64748b; font-style: italic; }
      </style>
    </head>
    <body>
      <div class="badge">Architecture & Hard Problem Solved</div>
      <h1>Mid-Month Pro-Rated Rent Engine</h1>
      <p class="subtitle">Dynamically adapts daily rates to exact days in target month (including leap years and edge collisions)</p>
      
      <div class="code-window">
        <div class="window-header">
          <div class="dot dot-red"></div>
          <div class="dot dot-yellow"></div>
          <div class="dot dot-green"></div>
          <span class="title">server/src/utils/rentCalculator.ts</span>
        </div>
        <pre>
<span class="kw">export function</span> <span class="fn">calculateRentForMonth</span>(
  monthlyRent: <span class="kw">number</span>,
  year: <span class="kw">number</span>,
  month: <span class="kw">number</span>,
  checkInDate: Date,
  checkOutDate?: Date | <span class="kw">null</span>
): ProRatedRentResult {
  <span class="comment">// 1. Determine exact days in month (Handles 31, 30, 28, and 29-day Leap Years)</span>
  <span class="kw">const</span> totalDaysInMonth = <span class="fn">getDaysInMonth</span>(<span class="kw">new</span> Date(year, month - <span class="num">1</span>, <span class="num">1</span>));
  
  <span class="comment">// 2. Compute active stay range in target billing cycle</span>
  <span class="kw">let</span> startDay = <span class="num">1</span>;
  <span class="kw">if</span> (checkInYear === year && checkInMonth === month) {
    startDay = <span class="fn">getDate</span>(normalizedCheckIn);
  }
  
  <span class="comment">// 3. Pro-rated arithmetic: Active Days = End Day - Start Day + 1</span>
  <span class="kw">const</span> activeDays = Math.max(<span class="num">0</span>, endDay - startDay + <span class="num">1</span>);
  <span class="kw">const</span> proRatedAmount = Math.round((monthlyRent / totalDaysInMonth) * activeDays);

  <span class="kw">return</span> {
    amount: proRatedAmount,
    isProRated: activeDays &lt; totalDaysInMonth,
    proRatedDays: activeDays,
    totalDaysInMonth
  };
}</pre>
      </div>
    </body>
    </html>
  `;
  await page.setContent(htmlCode1);
  await page.screenshot({ path: path.join(OUT_DIR, 'scene9_code_prorated.png') });

  // Slide 10: Code Walkthrough - Double Booking Check & Tests
  const htmlCode2 = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin: 0; background: #0f172a; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; padding: 60px 80px; }
        .badge { display: inline-block; padding: 6px 14px; background: #1e293b; color: #34d399; border: 1px solid #334155; border-radius: 8px; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; }
        h1 { font-size: 38px; font-weight: 800; color: #ffffff; margin: 0 0 10px 0; }
        p.subtitle { font-size: 18px; color: #94a3b8; margin: 0 0 40px 0; }
        .code-window { background: #020617; border: 1px solid #1e293b; border-radius: 16px; padding: 30px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
        .window-header { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #1e293b; }
        .dot { width: 12px; height: 12px; border-radius: 50%; }
        .dot-red { background: #ef4444; } .dot-yellow { background: #f59e0b; } .dot-green { background: #10b981; }
        .title { color: #64748b; font-size: 14px; margin-left: 10px; font-family: sans-serif; }
        pre { font-size: 17px; line-height: 1.6; color: #e2e8f0; margin: 0; font-family: "Cascadia Code", "Fira Code", Consolas, monospace; }
        .kw { color: #f43f5e; font-weight: 600; }
        .fn { color: #38bdf8; font-weight: 600; }
        .str { color: #34d399; }
        .num { color: #fbbf24; }
        .comment { color: #64748b; font-style: italic; }
      </style>
    </head>
    <body>
      <div class="badge">Concurrency & Server Validation</div>
      <h1>Bed Double-Booking Prevention & Automated Test Suite</h1>
      <p class="subtitle">Enforces single-occupancy guarantees on MongoDB with 18 automated unit and API integration tests</p>
      
      <div class="code-window">
        <div class="window-header">
          <div class="dot dot-red"></div>
          <div class="dot dot-yellow"></div>
          <div class="dot dot-green"></div>
          <span class="title">server/src/routes/tenants.ts & Vitest Output</span>
        </div>
        <pre>
<span class="comment">// 1. Strict Server Check: Query MongoDB for active occupancies on candidate bed</span>
<span class="kw">const</span> activeBedOcc = <span class="kw">await</span> BedOccupancy.<span class="fn">findOne</span>({
  bedId: <span class="kw">new</span> mongoose.Types.ObjectId(bedId),
  status: <span class="str">'ACTIVE'</span>,
});

<span class="kw">if</span> (activeBedOcc) {
  <span class="kw">return</span> res.status(<span class="num">409</span>).json({
    error: <span class="str">\`Bed \${bedName} is already occupied. A bed cannot have two tenants simultaneously.\`</span>
  });
}

<span class="comment">// 2. Automated Test Suite (Vitest Execution: 18 Passed)</span>
✓ tests/rentCalculator.test.ts (12 tests passed)
  ✓ calculates full month rent
  ✓ pro-rates mid-month check-in (21 days)
  ✓ pro-rates mid-month check-out (15 days)
  ✓ handles leap years (Feb 29 days) & non-leap years (Feb 28 days)
  ✓ calculates security deposit deductions & net refund
✓ tests/api.test.ts (6 tests passed)
  ✓ rejects double-booking attempts with HTTP 409 Conflict
  ✓ tracks partial payments, balance ledger, and overpayment prevention</pre>
      </div>
    </body>
    </html>
  `;
  await page.setContent(htmlCode2);
  await page.screenshot({ path: path.join(OUT_DIR, 'scene10_code_double_booking.png') });

  await browser.close();
  console.log('Code slides generated successfully!');
}

renderSlides().catch(err => {
  console.error('Slide render error:', err);
  process.exit(1);
});
