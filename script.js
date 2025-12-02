document.addEventListener('DOMContentLoaded', () => {
    // --- 配置区 ---
    const API_KEY = '412dcc822811181a00e03df2'; // <--- 请再次确认您的API KEY
    const BASE_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`;
    const defaultCurrencies = ['CNY', 'JPY', 'USD', 'EUR', 'KRW'];

    // 常用货币中文名称映射
    const currencyMap = {
        'CNY': '人民币', 'USD': '美元', 'EUR': '欧元', 'JPY': '日元', 'KRW': '韩元',
        'HKD': '港币', 'GBP': '英镑', 'AUD': '澳元', 'CAD': '加元', 'SGD': '新加坡元',
        'CHF': '瑞士法郎', 'NZD': '新西兰元', 'TWD': '新台币', 'MOP': '澳门元', 'THB': '泰铢'
    };
    
    // 货币代码到国旗代码的映射 (用于flagcdn.com)
    // 注意: EUR使用欧盟旗帜eu, 其他取前两位小写
    const currencyFlags = {
        'EUR': 'eu', 'GBP': 'gb', 'USD': 'us', 'JPY': 'jp', 'CNY': 'cn', 'KRW': 'kr',
        'HKD': 'hk', 'AUD': 'au', 'CAD': 'ca', 'SGD': 'sg', 'CHF': 'ch', 'NZD': 'nz',
        'TWD': 'tw', 'MOP': 'mo', 'THB': 'th'
    };

    // --- DOM 元素 ---
    const currencyRowsContainer = document.querySelector('.currency-rows');
    const lastUpdatedElement = document.getElementById('last-updated');

    let rates = {};
    let activeCurrencyElements = {}; // 存储每行的元素引用

    // --- 主函数 ---
    async function init() {
        createCurrencyRows();
        const data = await fetchRates();
        if (data) {
            rates = data.conversion_rates;
            updateLastUpdatedTime(data.time_last_update_unix);
            setupEventListeners();
            const usdInput = document.querySelector('.currency-input[data-currency="USD"]');
            if (usdInput) {
                usdInput.value = 1;
                usdInput.dispatchEvent(new Event('input'));
            }
        } else {
            lastUpdatedElement.textContent = "汇率加载失败，请检查API Key或网络连接。";
        }
    }

    // --- 功能函数 ---

    // 1. 创建UI界面 (已重构)
    function createCurrencyRows() {
        defaultCurrencies.forEach((currency, index) => {
            const row = document.createElement('div');
            row.className = 'currency-row';
            row.dataset.rowIndex = index;

            const flagCode = currencyFlags[currency] || currency.slice(0, 2).toLowerCase();
            const flagUrl = `https://flagcdn.com/w40/${flagCode}.png`;
            
            // 创建下拉选择框的选项
            let optionsHTML = '';
            for (const code in currencyMap) {
                optionsHTML += `<option value="${code}" ${code === currency ? 'selected' : ''}>${currencyMap[code]} (${code})</option>`;
            }

            row.innerHTML = `
                <div class="currency-selector">
                    <div class="currency-picker" data-testid="picker">
                        <img src="${flagUrl}" class="currency-flag" alt="${currency}">
                        <div class="currency-name-zh">${currencyMap[currency]}</div>
                        <div class="currency-name-en">${currency}</div>
                    </div>
                    <select class="currency-select">${optionsHTML}</select>
                </div>
                <input type="number" class="currency-input" data-currency="${currency}" placeholder="0.00">
                <button class="reset-btn" data-currency="${currency}">重置</button>
            `;
            
            currencyRowsContainer.appendChild(row);

            // 存储该行所有元素的引用
            activeCurrencyElements[index] = {
                picker: row.querySelector('.currency-picker'),
                flag: row.querySelector('.currency-flag'),
                nameZh: row.querySelector('.currency-name-zh'),
                nameEn: row.querySelector('.currency-name-en'),
                select: row.querySelector('.currency-select'),
                input: row.querySelector('.currency-input'),
                resetBtn: row.querySelector('.reset-btn')
            };
        });
    }

    // 2. 获取汇率 (带缓存逻辑) - 无改动
    async function fetchRates() {
        // ... (此函数代码与上一版完全相同，此处省略以节约篇幅)
        const cacheKey = 'currency_cache';
        const cachedData = JSON.parse(localStorage.getItem(cacheKey));
        const now = new Date().getTime();
        const oneHour = 60 * 60 * 1000;
        if (cachedData && (now - cachedData.timestamp < oneHour)) return cachedData.data;
        try {
            const response = await fetch(BASE_URL);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            if (data.result === 'success') {
                localStorage.setItem(cacheKey, JSON.stringify({ timestamp: now, data: data }));
                return data;
            } else { throw new Error('API request failed: ' + data['error-type']); }
        } catch (error) {
            console.error('Fetch error:', error);
            return cachedData ? cachedData.data : null;
        }
    }

    // 3. 更新 "最后更新时间" 的显示 (北京时间) - 无改动
    function updateLastUpdatedTime(unixTimestamp) {
        const date = new Date(unixTimestamp * 1000);
        const beijingTime = date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
        lastUpdatedElement.textContent = `最后更新时间: ${beijingTime} (北京时间)`;
    }

    // 4. 设置事件监听器 - 无改动
    function setupEventListeners() {
        Object.values(activeCurrencyElements).forEach(elements => {
            elements.input.addEventListener('input', handleInputChange);
            elements.resetBtn.addEventListener('click', handleResetClick);
            elements.select.addEventListener('change', handleCurrencyChange);
        });
    }
    
    // 5. 处理输入变化事件 - 无改动
    function handleInputChange(e) {
        // ... (此函数代码与上一版完全相同，此处省略)
        const sourceInput = e.target;
        const sourceCurrency = sourceInput.dataset.currency;
        const sourceValue = parseFloat(sourceInput.value);
        if (isNaN(sourceValue) || !rates[sourceCurrency]) {
            Object.values(activeCurrencyElements).forEach(({ input }) => { if (input !== sourceInput) input.value = ''; });
            return;
        }
        const valueInUsd = sourceValue / rates[sourceCurrency];
        Object.values(activeCurrencyElements).forEach(({ input }) => {
            if (input !== sourceInput) {
                const targetCurrency = input.dataset.currency;
                if (rates[targetCurrency]) {
                    input.value = parseFloat((valueInUsd * rates[targetCurrency]).toFixed(4));
                }
            }
        });
    }

    // 6. 处理重置按钮点击事件 - 无改动
    function handleResetClick(e) {
        const currency = e.target.dataset.currency;
        const inputToReset = document.querySelector(`.currency-input[data-currency="${currency}"]`);
        if (inputToReset) {
            inputToReset.value = 1;
            inputToReset.dispatchEvent(new Event('input'));
        }
    }
    
    // 7. 处理货币切换事件 (已重构以更新新UI)
    function handleCurrencyChange(e) {
        const select = e.target;
        const newCurrency = select.value;
        const row = select.closest('.currency-row');
        const rowIndex = row.dataset.rowIndex;
        const elements = activeCurrencyElements[rowIndex];

        // 1. 更新UI显示
        const flagCode = currencyFlags[newCurrency] || newCurrency.slice(0, 2).toLowerCase();
        elements.flag.src = `https://flagcdn.com/w40/${flagCode}.png`;
        elements.flag.alt = newCurrency;
        elements.nameZh.textContent = currencyMap[newCurrency];
        elements.nameEn.textContent = newCurrency;

        // 2. 更新背后绑定的数据
        elements.input.dataset.currency = newCurrency;
        elements.resetBtn.dataset.currency = newcurrency;
        
        // 3. 触发汇率重新计算
        let referenceInput = Object.values(activeCurrencyElements).map(el => el.input).find(input => input.value && !isNaN(parseFloat(input.value)));
        if (referenceInput) {
            referenceInput.dispatchEvent(new Event('input'));
        }
    }

    // --- 启动应用 ---
    init();
});