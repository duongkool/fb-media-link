const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const port = 3000;

// Để xử lý JSON trong body request
app.use(express.json());

/**
 * Chuẩn hóa URL hình ảnh (thay thế HTML entities)
 * @param {string} url - URL hình ảnh cần chuẩn hóa
 * @returns {string} - URL đã chuẩn hóa
 */
function normalizeImageUrl(url) {
    if (!url) return null;
    return url.replace(/&amp;/g, '&');
}

/**
 * Lấy URL hình ảnh từ trang Facebook dựa vào fbid
 * @param {string} fbid - ID của hình ảnh Facebook
 * @returns {Promise<string>} - URL của hình ảnh
 */
async function extractFacebookImageUrl(fbid) {
    const browser = await puppeteer.launch({
        headless: 'new', // Sử dụng chế độ headless mới
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        // Giả lập trình duyệt thật
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

        // Thiết lập các tùy chọn để tránh phát hiện
        await page.setViewport({ width: 1366, height: 768 });
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br'
        });

        // Truy cập URL Facebook photo
        await page.goto(`https://www.facebook.com/photo.php?fbid=${fbid}`, {
            waitUntil: 'networkidle2'
        });

        // Tìm link hình ảnh bằng cách tìm tất cả URL scontent
        const imageUrl = await page.evaluate(() => {
            const htmlString = document.documentElement.outerHTML;

            // Biểu thức chính quy để tìm tất cả URL bắt đầu bằng https://scontent
            const urlRegex = /https:\/\/scontent[^'"\s]+/g;
            const urls = [];

            let match;
            while ((match = urlRegex.exec(htmlString)) !== null) {
                urls.push(match[0]);
            }

            // Trả về URL đầu tiên chứa '.jpg'
            for (const url of urls) {
                if (url.includes('.jpg')) {
                    return url;
                }
            }

            // Nếu không có ảnh .jpg nào, trả về null
            return null;
        });
        return imageUrl;
    } catch (error) {
        console.error('Lỗi khi trích xuất URL hình ảnh:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

// API endpoint để lấy URL hình ảnh Facebook
app.get('/extract-image', async (req, res) => {
    const { fbid } = req.query;

    if (!fbid) {
        return res.status(400).json({ error: 'Thiếu tham số fbid' });
    }

    try {
        const imageUrl = await extractFacebookImageUrl(fbid);

        if (!imageUrl) {
            return res.status(404).json({ error: 'Không tìm thấy URL hình ảnh' });
        }

        res.json({
            success: true,
            fbid,
            imageUrl: normalizeImageUrl(imageUrl)
        });
    } catch (error) {
        console.error('Lỗi server:', error);
        res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi xử lý yêu cầu'
        });
    }
});

// Khởi động server
app.listen(port, () => {
    console.log(`Server đang chạy tại http://localhost:${port}`);
});