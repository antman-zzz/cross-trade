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
        genwatashiDisplay.innerHTML = `${genwatashiDayFromRightsExDate.toLocaleDateString('ja-JP')}<br>（実際の返済受渡日: ${actualRepaySettlementDate.toLocaleDateString('ja-JP')}） <a href="https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html" target="_blank" style="font-size: 0.8em; text-decoration: none;">国民の祝日</a>`;

        const days = (actualRepaySettlementDate.getTime() - borrowDate.getTime()) / MS_PER_DAY;
        daysSpan.textContent = days >= 0 ? Math.round(days) : '0';

        const stockPrice = parseFloat(stockPriceInput.value) || 0;
        const shareCount = parseFloat(shareCountInput.value) || 0;
        const acquisitionAmount = stockPrice * shareCount;

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

    const today = new Date();
    borrowFp.setDate(today, false);
    const initialGenwatashi = getGenwatashibiForMonth(today.getFullYear(), today.getMonth());
    repayFp.setDate(initialGenwatashi, true);
});