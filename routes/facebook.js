const express = require('express');
const puppeteer = require('puppeteer');
const router = express.Router();

function normalizeImageUrl(url) {
    if (!url) return null;
    return url.replace(/&amp;/g, '&');
}

async function extractFacebookImageUrl(fbid) {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)...');
        await page.goto(`https://www.facebook.com/photo.php?fbid=${fbid}`, {
            waitUntil: 'networkidle2'
        });

        const imageUrl = await page.evaluate(() => {
            const html = document.documentElement.outerHTML;
            const urlRegex = /https:\/\/scontent[^'"\s]+/g;
            const matches = [...html.matchAll(urlRegex)];
            const jpgs = matches.map(m => m[0]).filter(url => url.includes('.jpg'));
            return jpgs[0] || null;
        });

        return imageUrl;
    } finally {
        await browser.close();
    }
}

router.get('/extract-image', async (req, res) => {
    const { fbid } = req.query;
    if (!fbid) return res.status(400).json({ error: 'Thiếu tham số fbid' });

    try {
        const imageUrl = await extractFacebookImageUrl(fbid);
        if (!imageUrl) return res.status(404).json({ error: 'Không tìm thấy hình ảnh' });

        res.json({ success: true, fbid, imageUrl: normalizeImageUrl(imageUrl) });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Lỗi xử lý yêu cầu' });
    }
});

module.exports = router;
