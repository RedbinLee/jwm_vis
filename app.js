const marketTypeSelect = document.getElementById('marketTypeSelect');
const marketSelect = document.getElementById('marketSelect');
const itemSelect = document.getElementById('itemSelect');
const resultSection = document.getElementById('resultSection');
const guideMessage = document.getElementById('guideMessage');

const statusBadge = document.getElementById('statusBadge');
const selectedTitle = document.getElementById('selectedTitle');
const itemTitleDisplay = document.getElementById('itemTitleDisplay');
const highPriceElem = document.getElementById('highPrice');
const avgPriceElem = document.getElementById('avgPrice');
const lowPriceElem = document.getElementById('lowPrice');
const updateTimeElem = document.getElementById('updateTime');

// 공공데이터포털 API 인증키 설정
const SERVICE_KEYS = {
  encoded: '5382ba995aeb12c24caafb86214295e2779d5ecf3b2f2fa554d72a2d504a2837', // 👈 인코딩된 인증키 입력
  decoded: '5382ba995aeb12c24caafb86214295e2779d5ecf3b2f2fa554d72a2d504a2837', // 👈 디코딩된 인증키 입력
};

// API 엔드포인트 정의
const API_ENDPOINTS = {
  public: 'https://apis.data.go.kr/B552845/katSale/trades', // 공영도매시장 정산정보
  origin: 'https://apis.data.go.kr/B552845/originTrialHall/dealings', // 산지공판장 거래정보
};

// 공영 도매시장 주요 코드 리스트
const publicMarkets = [
  { code: '110010', name: '가락농수산물도매시장' },
  { code: '311101', name: '강서농산물도매시장' },
  { code: '210010', name: '부산엄궁농산물도매시장' },
  { code: '220001', name: '대구농수산물도매시장' },
  { code: '230001', name: '인천남촌농산물도매시장' },
  { code: '240001', name: '광주각화농산물도매시장' },
  { code: '250001', name: '대전오정농산물도매시장' },
];

// 산지공판장 전체 코드 리스트
const originMarkets = [
  { code: '7428200508', name: '원주원예농협공판장지점' },
  { code: '3108200558', name: '충서원예농협공판장' },
  { code: '5088205164', name: '의성농협공판장' },
  { code: '1368208160', name: '하양농협공판장' },
  { code: '7718502655', name: '대구태평로공판장' },
];

let currentMarketItems = [];

// 인증키 자동 전환 및 안전한 API 호출 함수
async function fetchWithKeys(baseUrl, params) {
  const keysToTry = [SERVICE_KEYS.encoded, SERVICE_KEYS.decoded].filter(
    (k) => k && !k.includes('YOUR_'),
  );

  if (keysToTry.length === 0) {
    alert('API 인증키가 설정되지 않았습니다. 코드를 확인해 주세요.');
    throw new Error('API 인증키 미설정');
  }

  let lastError = null;

  for (let key of keysToTry) {
    try {
      const url = new URL(baseUrl);
      url.searchParams.append('serviceKey', key);
      for (const [keyName, val] of Object.entries(params)) {
        url.searchParams.append(keyName, val);
      }

      console.log('👉 요청 URL:', url.toString());
      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`HTTP 상태 코드 에러: ${response.status}`);
      }

      const data = await response.json();
      console.log('✨ API 응답 성공 데이터:', data);

      const header = data.response?.header || data.header;
      if (header && header.resultCode) {
        const code = String(header.resultCode);
        if (code !== '0' && code !== '00') {
          console.warn(
            `⚠️ 공공데이터 서버 반환 오류: [${code}] ${header.resultMsg}`,
          );
          throw new Error(header.resultMsg || 'API 오류 발생');
        }
      }

      return data;
    } catch (err) {
      console.warn(`🔄 인증키 시도 실패 또는 네트워크 오류:`, err);
      lastError = err;
    }
  }

  throw lastError;
}

// 1. 시장 구분 선택 시 -> 공판장 목록 채우기
marketTypeSelect.addEventListener('change', () => {
  const type = marketTypeSelect.value;

  marketSelect.innerHTML =
    '<option value="">-- 공판장을 선택하세요 --</option>';
  itemSelect.innerHTML =
    '<option value="">-- 공판장을 먼저 선택하세요 --</option>';
  marketSelect.disabled = true;
  itemSelect.disabled = true;
  resultSection.classList.add('hidden');
  guideMessage.classList.remove('hidden');

  if (!type) return;

  let markets = type === 'public' ? publicMarkets : originMarkets;
  markets.forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m.code;
    opt.textContent = m.name;
    marketSelect.appendChild(opt);
  });

  marketSelect.disabled = false;
});

// 2. 공판장 선택 시 -> 시장 유형에 맞는 날짜 포맷을 적용하여 API 호출
marketSelect.addEventListener('change', async () => {
  const marketType = marketTypeSelect.value;
  const marketCode = marketSelect.value;

  itemSelect.innerHTML = '<option value="">-- 품목을 선택하세요 --</option>';
  resultSection.classList.add('hidden');
  itemSelect.disabled = true;

  if (!marketCode) {
    guideMessage.classList.remove('hidden');
    return;
  }

  // 💡 시장 유형에 따른 날짜 포맷 분기 처리
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  let formattedDate = '';
  if (marketType === 'origin') {
    formattedDate = `${year}${month}${day}`; // 산지: YYYYMMDD (예: 20261013)
  } else {
    formattedDate = `${year}-${month}-${day}`; // 공영: YYYY-MM-DD (예: 2026-10-13)
  }

  const endpoint = API_ENDPOINTS[marketType];

  let paramCodeName =
    marketType === 'public' ? 'cond[whsl_mrkt_cd::EQ]' : 'cond[trhl_cd::EQ]';
  let paramDateName =
    marketType === 'public' ? 'cond[trd_clcln_ymd::EQ]' : 'cond[clcln_ymd::EQ]';

  const params = {
    pageNo: '1',
    numOfRows: '100',
    returnType: 'json',
    [paramCodeName]: marketCode,
    [paramDateName]: formattedDate,
  };

  try {
    guideMessage.innerHTML =
      '⏳ 해당 공판장의 당일 품목 데이터를 불러오는 중입니다...';
    guideMessage.classList.remove('hidden');

    const data = await fetchWithKeys(endpoint, params);
    const items =
      data.response?.body?.items?.item || data.body?.items?.item || [];

    if (items.length === 0) {
      itemSelect.innerHTML = '<option value="">조회된 품목이 없습니다</option>';
      itemSelect.disabled = true;
      guideMessage.innerHTML =
        '⚠️ 선택한 공판장의 당일 데이터가 아직 집계되지 않았거나 없습니다.<br>(다른 공판장을 선택해 보세요)';
      return;
    }

    currentMarketItems = items;

    items.forEach((item, index) => {
      const option = document.createElement('option');
      option.value = index;
      const itemName = item.item_name || item.p_name || '농산물';
      const itemUnit = item.unit || item.std || '';
      option.textContent = `${itemName} (${itemUnit})`;
      itemSelect.appendChild(option);
    });

    itemSelect.disabled = false;
    guideMessage.innerHTML =
      '👆 **이제 품목을 선택하시면** 실시간 시세가 크게 나타납니다.';
  } catch (error) {
    console.error('API 호출 에러:', error);
    guideMessage.innerHTML =
      '❌ 데이터를 불러오지 못했습니다.<br>인증키나 네트워크 상태를 확인해 주세요.';
    itemSelect.disabled = true;
  }
});

// 3. 품목까지 최종 선택했을 때 -> 비로소 시세 텍스트 카드 표시
itemSelect.addEventListener('change', () => {
  const selectedIndex = itemSelect.value;

  if (selectedIndex === '' || currentMarketItems.length === 0) {
    resultSection.classList.add('hidden');
    return;
  }

  const selectedData = currentMarketItems[selectedIndex];

  if (selectedData) {
    selectedTitle.textContent =
      marketSelect.options[marketSelect.selectedIndex].text;

    const itemName =
      selectedData.item_name || selectedData.p_name || '품목명 미지정';
    const itemUnit = selectedData.unit || selectedData.std || '';
    itemTitleDisplay.textContent = `${itemName} (${itemUnit})`;

    const highPrice = Number(selectedData.high_price || selectedData.high || 0);
    const avgPrice = Number(selectedData.avg_price || selectedData.avg || 0);
    const lowPrice = Number(selectedData.low_price || selectedData.low || 0);

    highPriceElem.textContent = `${highPrice.toLocaleString()}원`;
    avgPriceElem.textContent = `${avgPrice.toLocaleString()}원`;
    lowPriceElem.textContent = `${lowPrice.toLocaleString()}원`;

    updateTimeElem.textContent = `기준일자: ${selectedData.clcln_ymd || selectedData.trd_clcln_ymd || '오늘'}`;

    statusBadge.className =
      'text-center py-2 px-4 rounded-xl text-xs font-bold shadow-sm bg-emerald-100 text-emerald-800';
    statusBadge.textContent = '✨ 당일 실시간/정산 시세 조회 완료';

    guideMessage.classList.add('hidden');
    resultSection.classList.remove('hidden');
  }
});
