const express = require("express");
const router = express.Router();
const { chromium } = require("playwright");

require("dotenv").config();

router.post("/", async (req, res) => {
  const { bookingcode, country } = req.body;
  if (!bookingcode) {
    throw new Error("Please input the booking code number.");
  }
  const generatedSlip = await fetchSlipItems(bookingcode, country);
  res.status(200).json(generatedSlip);
});

async function fetchSlipItems(code, country) {
  const link = `https://sportybet.com/${country}`;

  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PLAYWRIGHT_EXECUTABLE_PATH
        : undefined,
  });
  const context = await browser.newContext(); // Create a new context
  const page = await context.newPage(); // Create a new page within the context

  try {
    // console.log(`going to ${link}`);
    await page.goto(link, { waitUntil: "domcontentloaded" });
    // console.log("here");
    const [bookingCode, loadButton] = await Promise.all([
      page.waitForSelector('input[placeholder="Booking Code"]'),
      page.waitForSelector(`//*[@id="j_betslip"]/div[2]/div[3]/div[1]/button`),
    ]);

    await bookingCode.type(code);
    await loadButton.click();
    const slipXPath = `//*[@id="j_betslip"]/div[2]/div[3]/div/div[2]`;
    const slipHandle = await page.waitForSelector(slipXPath);
    const betSelectionHandle = await page.waitForSelector(
      `//*[@class="m-bet-count"]`
    );
    const numberOfBets = await betSelectionHandle.evaluate((el) =>
      parseInt(el.textContent)
    );
    const rawSlip = await parseSlipItems(slipHandle, page, numberOfBets);
    return rawSlip;
  } catch (error) {
    return `An error occurred: ${error}`;
  } finally {
    await context.close(); // Close the context which closes the associated pages
    await browser.close();
  }
}

async function parseSlipItems(parentElementHandle, page, numberOfBets) {
  if (parentElementHandle.length === 0) {
    console.error(`Slip doesnt exist.`);
    return;
  }
  const elementsToParse = [
    {
      xPath: `//*[@id="j_betslip"]/div[2]/div[3]/div/div[2]/div[{i}]/div[2]/div[1]/div[1]/span`,
      key: `option`,
    },
    {
      xPath: `//*[@id="j_betslip"]/div[2]/div[3]/div/div[2]/div[{i}]/div[2]/div[1]/div[2]`,
      key: `selection`,
    },
    {
      xPath: `//*[@id="j_betslip"]/div[2]/div[3]/div/div[2]/div[{i}]/div[2]/div[1]/div[3]/span`,
      key: `optionType`,
    },
    {
      xPath: `//*[@id="j_betslip"]/div[2]/div[3]/div/div[2]/div[{i}]/div[2]/div[1]/div[3]/div/span`,
      key: `odds`,
    },
  ];

  const parsedSlip = [];

  let i = 1;
  while (i <= numberOfBets) {
    const parsedTextContent = {};
    for (let { xPath, key } of elementsToParse) {
      xPath = xPath.replace("{i}", i);
      const textContent = await page.evaluate((xPath) => {
        const element = document.evaluate(
          xPath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;
        return element ? element.textContent : null;
      }, xPath);
      parsedTextContent[key] = textContent.trim();
    }
    parsedSlip.push(parsedTextContent);
    i++;
  }
  return parsedSlip;
}

module.exports = router;
