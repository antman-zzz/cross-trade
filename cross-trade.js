document.addEventListener('DOMContentLoaded', async () => {
    let holidays = new Map();

    async function loadHolidays() {
        try {
            const response = await fetch('https://holidays-jp.github.io/api/v1/date.json');
            const holidayData = await response.json();
            holidays = new Map(Object.entries(holidayData));
            console.log('Holidays loaded:', holidays.size > 0);
        } catch (error) {
            console.error('祝日データの取得に失敗しました。', error);
            alert('祝日データの取得に失敗しました。土日のみを非営業日として計算します。');
        }
    }

    // --- ユーティリティ関数定義 ---
    function toYYYYMMDD(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function isBusinessDay(date) {
        const day = date.getDay();
        if (day === 0 || day === 6) return false; // 日曜または土曜
        if (holidays.has(toYYYYMMDD(date))) return false; // 祝日
        return true;
    }

    function addBusinessDays(startDate, numDays) {
        let currentDate = new Date(startDate.getTime());
        let addedDays = 0;
        const step = numDays > 0 ? 1 : -1;
        const maxIterations = 365; // 無限ループを避けるための安全策
        let iterations = 0;

        while (addedDays < Math.abs(numDays)) {
            currentDate.setDate(currentDate.getDate() + step);
            if (isBusinessDay(currentDate)) {
                addedDays++;
            }
            iterations++;
            if (iterations > maxIterations) {
                console.error("addBusinessDays exceeded max iterations");
                return new Date(); // エラー発生時は現在の日付を返す
            }
        }
        return currentDate;
    }

    function getGenwatashibiForMonth(year, month) {
        let lastDay = new Date(year, month + 1, 0);
        while (!isBusinessDay(lastDay)) {
            lastDay.setDate(lastDay.getDate() - 1);
        }
        return addBusinessDays(lastDay, -1);
    }

    // --- アプリケーションのメイン処理 ---
    await loadHolidays(); // 祝日データを待ってからアプリを初期化

    // --- DOM要素の取得 ---
    const stockPriceInput = document.getElementById('stock-price');
    const shareCountInput = document.getElementById('share-count');
    const borrowDatePickerEl = document.getElementById('borrow-date-picker');
    const repayDatePickerEl = document.getElementById('repay-date-picker');
    const rightsExDateDisplay = document.getElementById('rights-ex-date-display');
    const genwatashiDisplay = document.getElementById('genwatashi-display');
    const daysSpan = document.getElementById('days');
    const resultStrong = document.getElementById('result');
    const cashBuyFundsDisplay = document.getElementById('cash-buy-funds');
    const shortSellFundsDisplay = document.getElementById('short-sell-funds');
    const totalFundsDisplay = document.getElementById('total-funds');
    const dailyCostSpan = document.getElementById('daily-cost');
    const newPositionPossibleDateDisplay = document.getElementById('new-position-possible-date');

    // --- メインの計算・表示更新関数 ---
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const ANNUAL_INTEREST_RATE = 0.039;

    function getLimitRange(basePrice) {
        if (basePrice < 100) return 30;
        if (basePrice < 200) return 50;
        if (basePrice < 500) return 80;
        if (basePrice < 700) return 100;
        if (basePrice < 1000) return 150;
        if (basePrice < 1500) return 300;
        if (basePrice < 2000) return 400;
        if (basePrice < 3000) return 500;
        if (basePrice < 5000) return 700;
        if (basePrice < 7000) return 1000;
        if (basePrice < 10000) return 1500;
        if (basePrice < 15000) return 3000;
        if (basePrice < 20000) return 4000;
        if (basePrice < 30000) return 5000;
        if (basePrice < 50000) return 7000;
        if (basePrice < 70000) return 10000;
        if (basePrice < 100000) return 15000;
        if (basePrice < 150000) return 30000;
        if (basePrice < 200000) return 40000;
        if (basePrice < 300000) return 50000;
        if (basePrice < 500000) return 70000;
        if (basePrice < 700000) return 100000;
        if (basePrice < 1000000) return 150000;
        if (basePrice < 1500000) return 300000;
        if (basePrice < 2000000) return 400000;
        if (basePrice < 3000000) return 500000;
        if (basePrice < 5000000) return 700000;
        if (basePrice < 7000000) return 1000000;
        if (basePrice < 10000000) return 1500000;
        if (basePrice < 15000000) return 3000000;
        if (basePrice < 20000000) return 4000000;
        if (basePrice < 30000000) return 5000000;
        if (basePrice < 50000000) return 7000000;
        return 10000000; // 50,000,000円以上
    }

    function updateAllCalculations() {
        const borrowDateStr = borrowDatePickerEl.value;
        const repayTradeDateStr = repayDatePickerEl.value;

        if (!borrowDateStr || !repayTradeDateStr) return;

        const borrowDate = new Date(borrowDateStr + 'T00:00:00');
        const repayTradeDate = new Date(repayTradeDateStr + 'T00:00:00');
        
        const actualRepaySettlementDate = addBusinessDays(repayTradeDate, 2);

        const lastDayOfMonth = new Date(repayTradeDate.getFullYear(), repayTradeDate.getMonth() + 1, 0);
        let lastBusinessDayOfMonth = new Date(lastDayOfMonth.getTime());
        while (!isBusinessDay(lastBusinessDayOfMonth)) {
            lastBusinessDayOfMonth.setDate(lastBusinessDayOfMonth.getDate() - 1);
        }
        const rightsExDate = addBusinessDays(lastBusinessDayOfMonth, -2);
        rightsExDateDisplay.textContent = rightsExDate.toLocaleDateString('ja-JP');

        const newPositionPossibleDate = addBusinessDays(rightsExDate, -14);
        newPositionPossibleDateDisplay.textContent = newPositionPossibleDate.toLocaleDateString('ja-JP');

        const genwatashiDayFromRightsExDate = addBusinessDays(rightsExDate, 1);
        genwatashiDisplay.innerHTML = `${genwatashiDayFromRightsExDate.toLocaleDateString('ja-JP')}<br>（実際の返済受渡日: ${actualRepaySettlementDate.toLocaleDateString('ja-JP')}）`;

        const days = (actualRepaySettlementDate.getTime() - borrowDate.getTime()) / MS_PER_DAY;
        daysSpan.textContent = days >= 0 ? Math.round(days) : '0';

        const stockPrice = parseFloat(stockPriceInput.value) || 0;
        const shareCount = parseFloat(shareCountInput.value) || 0;
        const limitRange = getLimitRange(stockPrice);
        const acquisitionAmount = (stockPrice + limitRange) * shareCount;

        const requiredCashBuyFunds = acquisitionAmount;
        const requiredShortSellFunds = Math.max(acquisitionAmount * 0.31, 300000);
        const totalRequiredFunds = requiredCashBuyFunds + requiredShortSellFunds;

        cashBuyFundsDisplay.textContent = requiredCashBuyFunds.toLocaleString();
        shortSellFundsDisplay.textContent = requiredShortSellFunds.toLocaleString();
        totalFundsDisplay.textContent = totalRequiredFunds.toLocaleString();

        if (acquisitionAmount <= 0 || days <= 0) {
            resultStrong.textContent = '0';
            dailyCostSpan.textContent = '0';
            return;
        }

        const dailyCost = Math.ceil(acquisitionAmount * (ANNUAL_INTEREST_RATE / 365));
        dailyCostSpan.textContent = dailyCost.toLocaleString();

        const cost = dailyCost * days;
        resultStrong.textContent = cost.toLocaleString();
    }

    // --- flatpickrカレンダーの初期化 ---
    flatpickr.localize(flatpickr.l10ns.ja);
    flatpickr.l10ns.ja.firstDayOfWeek = 1;

    const flatpickrConfigBase = {
        locale: 'ja',
        dateFormat: "Y-m-d",
        onDayCreate: function(dObj, dStr, fp, dayElem){
            const date = dayElem.dateObj;
            const dateStrYYYYMMDD = toYYYYMMDD(date);
            if (holidays.has(dateStrYYYYMMDD)) {
                dayElem.classList.add("holiday");
                dayElem.title = holidays.get(dateStrYYYYMMDD);
            }
            if (date.getDay() === 6) dayElem.classList.add("saturday");
            if (date.getDay() === 0) dayElem.classList.add("sunday");
        }
    };

    const repayFp = flatpickr(repayDatePickerEl, {
        ...flatpickrConfigBase,
        onMonthChange: (selectedDates, dateStr, instance) => {
            const genwatashiDay = getGenwatashibiForMonth(instance.currentYear, instance.currentMonth);
            instance.setDate(genwatashiDay, true);
        },
        onChange: () => { updateAllCalculations(); }
    });

    const borrowFp = flatpickr(borrowDatePickerEl, {
        ...flatpickrConfigBase,
        onChange: (selectedDates) => {
            if (!selectedDates[0]) return;
            const genwatashiDay = getGenwatashibiForMonth(selectedDates[0].getFullYear(), selectedDates[0].getMonth());
            repayFp.setDate(genwatashiDay, true);
        }
    });

    // --- イベントリスナーと初期値設定 ---
    stockPriceInput.addEventListener('input', updateAllCalculations);
    shareCountInput.addEventListener('input', updateAllCalculations);

    let today = new Date();

    // 日本時間18時以降であれば、日付を翌日に設定
    const now = new Date();
    const jstOffset = 9 * 60; // JST is UTC+9
    const localOffset = now.getTimezoneOffset(); // Local timezone offset in minutes
    const jstTime = new Date(now.getTime() + (jstOffset + localOffset) * 60 * 1000);

    if (jstTime.getHours() >= 18) {
        today.setDate(today.getDate() + 1);
    }

    // 土日祝日の場合は次の営業日に設定
    while (!isBusinessDay(today)) {
        today.setDate(today.getDate() + 1);
    }

    borrowFp.setDate(today, false);
    const initialGenwatashi = getGenwatashibiForMonth(today.getFullYear(), today.getMonth());
    repayFp.setDate(initialGenwatashi, true);
});