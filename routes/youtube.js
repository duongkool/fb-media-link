const express = require('express');
const { YoutubeTranscript } = require('youtube-transcript');
const router = express.Router();

// Map ngôn ngữ ISO -> tên đầy đủ
const languageNames = new Intl.DisplayNames(['en'], { type: 'language' });

async function checkImageExists(url) {
    try {
        const res = await fetch(url, { method: 'HEAD' });
        return res.ok;
    } catch {
        return false;
    }
}

async function getBestThumbnail(videoId) {
    const maxres = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    const hq = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    if (await checkImageExists(maxres)) {
        return maxres;
    }
    return hq;
}

router.get('/transcript', async (req, res) => {
    const { videoId } = req.query;

    if (!videoId) return res.status(400).json({ error: 'Thiếu videoId' });

    try {
        // Lấy metadata
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const oembedRes = await fetch(oembedUrl);
        if (!oembedRes.ok) throw new Error('Không lấy được thông tin video');
        const meta = await oembedRes.json();

        const thumbnail = await getBestThumbnail(videoId);

        // Lấy transcript
        const rawTranscript = await YoutubeTranscript.fetchTranscript(videoId);

        // Ghép text và lấy lang
        const joinedText = rawTranscript.map(t => t.text).join(' ');
        const langCode = rawTranscript[0]?.lang || 'en';
        const lang = languageNames.of(langCode) || langCode;

        res.json({
            success: true,
            title: meta.title,
            thumbnail,
            transcript: {
                lang,
                text: joinedText
            }
        });

    } catch (err) {
        console.error('Lỗi lấy transcript hoặc thông tin video:', err);
        res.status(500).json({ success: false, error: 'Không lấy được transcript hoặc thông tin video' });
    }
});

module.exports = router;
