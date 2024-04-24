const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const app = express();

app.get("/", async (req, res) => {
  if (!req.query.url) {
    return res.status(400).send("URL parameter is required");
  }

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const apiRequests = [];

  await page.setRequestInterception(true);
  page.on("request", (interceptedRequest) => {
    if (interceptedRequest.method() === "GET") {
      const url = interceptedRequest.url();

      const nonApiDomains = [
        "doubleclick.net",
        "googleadservices.com",
        "googlesyndication.com",
        "gstatic.com",
        "adservice.google.com",
        "google-analytics.com",
        "cdn.jsdelivr.net",
        "cdnjs.cloudflare.com",
        "stackpath.bootstrapcdn.com",
        "ajax.googleapis.com",
        "fonts.googleapis.com",
        "connect.facebook.net",
        "platform.twitter.com",
        "ad.doubleclick.net",
        "static.doubleclick.net",
        "youtube.com",
        "ytimg.com",
        "facebook.com",
        "fbcdn.net",
        "cdninstagram.com",
        "analytics.twitter.com",
        "ads.twitter.com",
        "tracking.domain.com",
        "cdn-pixels.com",
        "pixel-traffic.com",
        "track.adform.net",
        "s0.2mdn.net",
        "assets.adobedtm.com",
        "adition.com",
        "fls.doubleclick.net",
        "ads.google.com",
        "adservice.google.com",
        "google.com/ads",
        "google.com/pagead",
        "uploads",
      ];

      const isApiRequest =
        !nonApiDomains.some((domain) => url.includes(domain)) &&
        (url.includes("api") || /\/[^\/]+?\.(json|xml)$/i.test(url));

      if (isApiRequest) {
        apiRequests.push(url);
      }
    }
    interceptedRequest.continue();
  });

  await page.goto(req.query.url, { waitUntil: "networkidle2" });

  await browser.close();

  // Process and write to a text file
  const groupedRequests = apiRequests.reduce((acc, url) => {
    const domain = new URL(url).hostname;
    if (!acc[domain]) acc[domain] = [];
    acc[domain].push(url);
    return acc;
  }, {});

  let fileContent = "";
  for (const [domain, urls] of Object.entries(groupedRequests)) {
    fileContent += `Domain: ${domain}\n${urls.join("\n")}\n\n`;
  }

  const filePath = path.join(__dirname, `api_requests_${Date.now()}.txt`);
  fs.writeFileSync(filePath, fileContent);

  // Send file to client
  res.download(filePath, "api_requests.txt", (err) => {
    if (err) {
      res.status(500).send("Failed to download the file.");
    }
    fs.unlinkSync(filePath);
  });
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
