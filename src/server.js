const express = require('express');
const app = express();
const path = require('path');

const port = 3000;

// 정적 파일(CSS, JS 등)을 제공하기 위한 설정 (나중에 필요함)
app.use(express.static(path.join(__dirname, '../public')));

// 루트 경로 ('/')로 접속하면 index.html 파일을 보내줌
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.listen(port, () => {
    console.log(`서버가 실행되었습니다!`);
    console.log(`접속 주소: http://localhost:${port}`);
});
