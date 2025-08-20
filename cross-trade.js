document.addEventListener('DOMContentLoaded', () => {
    // --- ユーティリティ関数定義 (すべての処理の前に定義) ---
    function normalizeDate(date) {
        const newDate = new Date(date);
        newDate.setHours(0, 0, 0, 0);
        return newDate;
    }

    function toYYYYMMDD(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function isWeekday(date) {
        const day = date.getDay();
        return day !== 0 && day !== 6; // 0:日曜, 6:土曜
    }

    function addBusinessDays(startDate, numDays) {
        let currentDate = new Date(startDate.getTime());
        let addedDays = 0;
        const step = numDays > 0 ? 1 : -1;
        while (addedDays < Math.abs(numDays)) {
            currentDate.setDate(currentDate.getDate() + step);
            if (isWeekday(currentDate)) {
                addedDays++;
            }
        }
        return currentDate;
    }

    function getGenwatashibiForMonth(year, month) {
        let lastDay = new Date(year, month + 1, 0);
        while (!isWeekday(lastDay)) {
            lastDay.setDate(lastDay.getDate() - 1);
        }
        return addBusinessDays(lastDay, -1);
    }

    // --- 初期データ準備 (ハイライトは無効化されているため、この部分は実質的に不要ですが、コードの整合性のため残します) ---
    const highlightDates = {}; // ハイライトは無効化されているため、このオブジェクトは使用されません
    const todayForCalc = new Date();
    for (let i = -12; i < 24; i++) {
        const targetMonthDate = new Date(todayForCalc.getFullYear(), todayForCalc.getMonth() + i, 1);
        const year = targetMonthDate.getFullYear();
        const month = targetMonthDate.getMonth();
        
        let lastDay = new Date(year, month + 1, 0);
        while (!isWeekday(lastDay)) {
            lastDay.setDate(lastDay.getDate() - 1);
        }
        highlightDates[normalizeDate(lastDay).getTime()] = 'last-business-day';

        const genwatashiDay = addBusinessDays(lastDay, -1);
        highlightDates[normalizeDate(genwatashiDay).getTime()] = 'genwatashi-day';
    }

    // --- DOM要素の取得 ---
    const stockPriceInput = document.getElementById('stock-price');
    const shareCountInput = document.getElementById('share-count');
    // const acquisitionAmountSpan = document.getElementById('acquisition-amount'); // 削除
    const borrowDatePickerEl = document.getElementById('borrow-date-picker');
    const repayDatePickerEl = document.getElementById('repay-date-picker');
    const rightsExDateDisplay = document.getElementById('rights-ex-date-display');
    const genwatashiDisplay = document.getElementById('genwatashi-display');
    const daysSpan = document.getElementById('days');
    const resultStrong = document.getElementById('result');
    const cashBuyFundsDisplay = document.getElementById('cash-buy-funds');
    const shortSellFundsDisplay = document.getElementById('short-sell-funds');
    const totalFundsDisplay = document.getElementById('total-funds');

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

        // 権利確定日の計算と表示
        const lastDayOfMonth = new Date(repayTradeDate.getFullYear(), repayTradeDate.getMonth() + 1, 0);
        let lastBusinessDayOfMonth = new Date(lastDayOfMonth.getTime());
        while (!isWeekday(lastBusinessDayOfMonth)) {
            lastBusinessDayOfMonth.setDate(lastBusinessDayOfMonth.getDate() - 1);
        }
        const rightsExDate = addBusinessDays(lastBusinessDayOfMonth, -2);
        rightsExDateDisplay.textContent = rightsExDate.toLocaleDateString('ja-JP');

        // 現渡日（権利確定日の翌営業日）の表示
        const genwatashiDayFromRightsExDate = addBusinessDays(rightsExDate, 1);
        genwatashiDisplay.innerHTML = `${genwatashiDayFromRightsExDate.toLocaleDateString('ja-JP')}<br>（実際の返済受渡日: ${actualRepaySettlementDate.toLocaleDateString('ja-JP')}）`;

        const days = (actualRepaySettlementDate.getTime() - borrowDate.getTime()) / MS_PER_DAY;
        daysSpan.textContent = days >= 0 ? Math.round(days) : '0';

        const stockPrice = parseFloat(stockPriceInput.value) || 0;
        const shareCount = parseFloat(shareCountInput.value) || 0;
        const acquisitionAmount = stockPrice * shareCount;
        // acquisitionAmountSpan.textContent = acquisitionAmount.toLocaleString(); // 削除

        // --- 必要資金の計算と表示 ---
        const requiredCashBuyFunds = acquisitionAmount;
        const requiredShortSellFunds = Math.max(acquisitionAmount * 0.31, 300000);
        const totalRequiredFunds = requiredCashBuyFunds + requiredShortSellFunds;

        cashBuyFundsDisplay.textContent = requiredCashBuyFunds.toLocaleString();
        shortSellFundsDisplay.textContent = requiredShortSellFunds.toLocaleString();
        totalFundsDisplay.textContent = totalRequiredFunds.toLocaleString();

        // 貸株料の計算
        if (acquisitionAmount <= 0 || days <= 0) {
            resultStrong.textContent = '0';
            return;
        }

        const dailyInterestRate = ANNUAL_INTEREST_RATE / 365;
        const cost = Math.round(acquisitionAmount * dailyInterestRate * days);
        resultStrong.textContent = cost.toLocaleString();

        const dailyCost = days > 0 ? Math.round(cost / days) : 0;
        dailyCostSpan.textContent = dailyCost.toLocaleString();
    }

    // --- flatpickrカレンダーの初期化 ---
    const flatpickrConfigBase = {
        locale: 'ja',
        dateFormat: "Y-m-d",
        // onDayCreate は削除
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

    // --- 初期値設定とイベントリスナー ---
    stockPriceInput.addEventListener('input', updateAllCalculations);
    shareCountInput.addEventListener('input', updateAllCalculations);

    const today = new Date();
    borrowFp.setDate(today, false);
    const initialGenwatashi = getGenwatashibiForMonth(today.getFullYear(), today.getMonth());
    repayFp.setDate(initialGenwatashi, true);
});