const express = require('express');
const app = express();
const port = 3000;

const facebookRoutes = require('./routes/facebook');
const youtubeRoutes = require('./routes/youtube');
const testRoutes = require('./routes/test');

app.use(express.json());
app.use('/facebook', facebookRoutes);
app.use('/youtube', youtubeRoutes);
app.use('/test', testRoutes);

app.listen(port, () => {
    console.log(`Server đang chạy tại http://localhost:${port}`);
});
