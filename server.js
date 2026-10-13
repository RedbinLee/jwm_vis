// server.js (Node.js 백엔드)
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 서비스키는 서버 환경변수로 철저히 보호합니다 (.env 파일 등 활용)
const SERVICE_KEY =
  process.env.PUBLIC_API_SERVICE_KEY ||
  '5382ba995aeb12c24caafb86214295e2779d5ecf3b2f2fa554d72a2d504a2837';

// 1. 전국 공영도매시장 정산정보 API 라우터 (katSale)
app.get('/api/kat-sale', async (req, res) => {
  try {
    const { whsl_mrkt_cd, trd_clcln_ymd, gds_lclsf_cd } = req.query;

    // 필수 파라미터 검증 (명세 기반)
    if (!whsl_mrkt_cd || !trd_clcln_ymd) {
      return res
        .status(400)
        .json({ error: '도매시장코드와 거래정산일자는 필수 입력 항목입니다.' });
    }

    let url = `https://apis.data.go.kr/B552845/katSale/trades?serviceKey=${encodeURIComponent(SERVICE_KEY)}&returnType=JSON`;
    url += `&cond[whsl_mrkt_cd::EQ]=${whsl_mrkt_cd}`;
    url += `&cond[trd_clcln_ymd::EQ]=${trd_clcln_ymd}`; // YYYY-MM-DD
    if (gds_lclsf_cd) url += `&cond[gds_lclsf_cd::EQ]=${gds_lclsf_cd}`;

    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      error: '공영도매시장 API 호출 중 오류 발생',
      details: error.message,
    });
  }
});

// 2. 전국 산지공판장 거래정보 API 라우터 (originTrialHall)
app.get('/api/origin-trial-hall', async (req, res) => {
  try {
    const { trhl_cd, clcln_ymd, gds_lclsf_cd } = req.query;

    // 필수 파라미터 검증 (명세 기반)
    if (!trhl_cd || !clcln_ymd) {
      return res
        .status(400)
        .json({ error: '공판장코드와 정산일자는 필수 입력 항목입니다.' });
    }

    let url = `https://apis.data.go.kr/B552845/originTrialHall/dealings?serviceKey=${encodeURIComponent(SERVICE_KEY)}&returnType=JSON`;
    url += `&cond[trhl_cd::EQ]=${trhl_cd}`;
    url += `&cond[clcln_ymd::EQ]=${clcln_ymd}`; // YYYYMMDD
    if (gds_lclsf_cd) url += `&cond[gds_lclsf_cd::EQ]=${gds_lclsf_cd}`;

    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      error: '산지공판장 API 호출 중 오류 발생',
      details: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`백엔드 서버가 ${PORT} 포트에서 안전하게 실행 중입니다.`);
});
