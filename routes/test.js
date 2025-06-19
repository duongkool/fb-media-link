const express = require('express');
const puppeteer = require('puppeteer');
const router = express.Router();

// Hàm delay tương thích với mọi phiên bản
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Hàm mở URL và tìm ảnh từ thẻ meta og:image
async function openUrlAndFindImage(url) {
    let browser = null;
    let page = null;
    try {
        console.log('🚀 Khởi tạo browser mới...');
        browser = await puppeteer.launch({
            headless: true, // Chạy ở chế độ headless
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ],
            defaultViewport: null
        });
        console.log('✅ Browser đã được khởi tạo');

        page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log(`🌐 Đang mở URL: ${url}`);
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        console.log('⏰ Đang đợi trang load...');
        await delay(3000);

        console.log('🔍 Đang tìm kiếm ảnh từ thẻ meta og:image...');
        const imageUrl = await page.evaluate(() => {
            const metaTag = document.querySelector('meta[property="og:image"]');
            return metaTag ? metaTag.getAttribute('content') : null;
        });

        if (imageUrl) {
            const correctedImageUrl = imageUrl
                .replace(/\\u0026amp;/g, '&') // Thay \u0026amp; thành &
                .replace(/\\u0026/g, '&') // Thay \u0026 thành &
                .replace(/&/g, '&'); // Thay & thành &
            console.log('✅ Tìm thấy ảnh:', correctedImageUrl);
            await page.close(); // Đóng page
            await browser.close(); // Đóng browser
            return {
                success: true,
                message: 'Tìm thấy ảnh thành công',
                imageUrl: correctedImageUrl,
                browserStatus: 'closed'
            };
        } else {
            console.log('❌ Không tìm thấy thẻ meta og:image');
            await page.close(); // Đóng page
            await browser.close(); // Đóng browser
            return {
                success: false,
                message: 'Không tìm thấy thẻ meta og:image trong trang',
                imageUrl: null,
                browserStatus: 'closed'
            };
        }
    } catch (error) {
        console.error('❌ Lỗi khi mở URL:', error);
        if (page) await page.close(); // Đóng page nếu có
        if (browser) await browser.close(); // Đóng browser nếu có
        return {
            success: false,
            error: error.message,
            browserStatus: 'closed'
        };
    }
}

// Route để đóng browser thủ công
router.post('/close-browser', async (req, res) => {
    res.json({ success: false, message: 'Không có browser để đóng vì browser được đóng sau mỗi yêu cầu' });
});

// Route kiểm tra trạng thái browser
router.get('/browser-status', (req, res) => {
    res.json({
        browserOpen: false,
        status: 'closed' // Browser luôn đóng sau mỗi yêu cầu
    });
});

// Route nhận URL từ POST request body
router.post('/open-url', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({
            success: false,
            error: 'Thiếu tham số url trong request body'
        });
    }

    // Validate URL
    try {
        new URL(url);
    } catch (error) {
        return res.status(400).json({
            success: false,
            error: 'URL không hợp lệ'
        });
    }

    try {
        const result = await openUrlAndFindImage(url);

        if (result.success) {
            res.json(result);
        } else {
            res.status(404).json(result);
        }
    } catch (err) {
        console.error('❌ Lỗi server:', err);
        res.status(500).json({
            success: false,
            error: 'Lỗi server khi xử lý yêu cầu'
        });
    }
});

// Route nhận URL từ GET query params
router.get('/open-url', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({
            success: false,
            error: 'Thiếu tham số url trong query params'
        });
    }

    try {
        new URL(url);
    } catch (error) {
        return res.status(400).json({
            success: false,
            error: 'URL không hợp lệ'
        });
    }

    try {
        const result = await openUrlAndFindImage(url);

        if (result.success) {
            res.json(result);
        } else {
            res.status(404).json(result);
        }
    } catch (err) {
        console.error('❌ Lỗi server:', err);
        res.status(500).json({
            success: false,
            error: 'Lỗi server khi xử lý yêu cầu'
        });
    }
});

module.exports = router;