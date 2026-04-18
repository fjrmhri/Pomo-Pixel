const { chromium } = require("playwright");

(async () => {
  const results = {
    pageError: [],
    consoleErrors: [],
    steps: {},
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("pageerror", (e) => results.pageError.push(String(e)));
  page.on("console", (msg) => {
    if (msg.type() === "error") results.consoleErrors.push(msg.text());
  });

  try {
    // Navigate
    await page.goto("http://localhost:3000", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Basic sanity: ensure main sections exist
    await page.waitForSelector(".Tm__bungkus", { timeout: 10000 });
    await page.waitForSelector(".Mp__bungkus", { timeout: 10000 });
    results.steps["load"] = "ok";

    // TIMER: start, drag repeatedly, wait ~70s, ensure not reset
    const startBtn = await page.$(".Tm__btn.utama");
    if (!startBtn) {
      results.steps["timer"] = "missing-start-button";
    } else {
      await startBtn.click();
      // perform small drags on header repeatedly
      const header = await page.$(".Tm__header");
      if (header) {
        const box = await header.boundingBox();
        if (box) {
          for (let i = 0; i < 20; i++) {
            await page.mouse.move(box.x + 10, box.y + 10);
            await page.mouse.down();
            await page.mouse.move(
              box.x + 10 + (i % 3) * 5,
              box.y + 10 + (i % 4) * 4,
              { steps: 5 },
            );
            await page.mouse.up();
            await page.waitForTimeout(500);
          }
        }
      }
      // wait 70s to observe timer stability
      await page.waitForTimeout(70000);
      const mm = await page.$eval(".Tm__mm", (el) => el.textContent.trim());
      const ss = await page.$eval(".Tm__ss", (el) => el.textContent.trim());
      results.steps["timer"] = `${mm}:${ss}`;
    }

    // MUSIC: play + rapid next 8 times
    const playBtn = await page.$(".Mp__tombol--utama");
    const nextBtn = await page.$('.Mp__tombol[aria-label*="Lagu berikutnya"]');
    if (!playBtn || !nextBtn) {
      results.steps["music"] = "controls-missing";
    } else {
      await playBtn.click();
      await page.waitForTimeout(500);
      const srcBefore = await page.$eval(
        'audio[aria-label="Pemutar musik"]',
        (a) => a.getAttribute("src"),
      );
      for (let i = 0; i < 8; i++) {
        await nextBtn.click();
        await page.waitForTimeout(150);
      }
      await page.waitForTimeout(500);
      const srcAfter = await page.$eval(
        'audio[aria-label="Pemutar musik"]',
        (a) => a.getAttribute("src"),
      );
      results.steps["music"] = { srcBefore, srcAfter };
    }

    // BACKGROUND: click wallpaper button fast
    const wallBtn = await page.$(".Mp__wallpaper-btn");
    if (!wallBtn) {
      results.steps["wallpaper"] = "missing-button";
    } else {
      const imgSelector = ".Wallpaper__img";
      const beforeSrc = await page.$eval(imgSelector, (img) =>
        img.getAttribute("src"),
      );
      for (let i = 0; i < 8; i++) {
        await wallBtn.click();
        await page.waitForTimeout(200);
      }
      await page.waitForTimeout(500);
      const afterSrc = await page.$eval(imgSelector, (img) =>
        img.getAttribute("src"),
      );
      results.steps["wallpaper"] = { beforeSrc, afterSrc };
    }

    // OFFLINE simulation: go offline, reload, ensure app does not throw fatal errors
    await context.setOffline(true);
    await page
      .reload({ waitUntil: "domcontentloaded", timeout: 10000 })
      .catch(() => {});
    await page.waitForTimeout(1000);
    await context.setOffline(false);
    results.steps["offline"] = {
      pageErrors: results.pageError.length,
      consoleErrors: results.consoleErrors.length,
    };

    // capture first 10 console errors and page errors
    results.pageError = results.pageError.slice(0, 10);
    results.consoleErrors = results.consoleErrors.slice(0, 10);

    console.log("AUTOMATED_TEST_RESULTS:" + JSON.stringify(results, null, 2));
  } catch (err) {
    console.error("TEST_EXCEPTION", err);
    process.exitCode = 2;
  } finally {
    await browser.close();
  }
})();
