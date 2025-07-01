// Функция для переключения темы
function toggleTheme() {
	const html = document.documentElement;
	const isDark = html.getAttribute('data-theme') === 'dark';
	const newTheme = isDark ? 'light' : 'dark';

	html.setAttribute('data-theme', newTheme);
	localStorage.setItem('theme', newTheme);

	// Обновляем видимость иконок
	document.getElementById('light-icon').style.display = isDark ? 'block' : 'none';
	document.getElementById('dark-icon').style.display = isDark ? 'none' : 'block';
}

// Функция для сохранения выбранного количества монет
function saveCoinsCount() {
	const coinsCount = document.getElementById('coins-count').value;
	localStorage.setItem('coinsCount', coinsCount);
	fetchTopGainers(); // Перезагружаем данные с новым количеством
}

// Функция для форматирования времени последнего обновления
function updateLastUpdatedTime() {
	const now = new Date();
	const hours = now.getHours().toString().padStart(2, '0');
	const minutes = now.getMinutes().toString().padStart(2, '0');
	document.getElementById('last-updated').textContent = `Last updated at ${hours}:${minutes}`;
}

// Получаем сохраненное или дефолтное количество монет
function getCoinsCount() {
	return localStorage.getItem('coinsCount') || 10;
}

// Основная функция получения данных
async function fetchTopGainers() {
	try {
		document.getElementById('loading').style.display = 'block';
		document.getElementById('crypto-list').innerHTML = '';

		// Получаем данные с нескольких страниц
		const promises = [
			fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=price_change_percentage_24h_desc&per_page=250&page=1&sparkline=false'),
			fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=price_change_percentage_24h_desc&per_page=250&page=2&sparkline=false'),
			fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=price_change_percentage_24h_desc&per_page=250&page=3&sparkline=false'),
			fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=price_change_percentage_24h_desc&per_page=250&page=4&sparkline=false')
		];

		// Добавляем timeout для каждого запроса
		const timeout = 15000; // 15 секунд таймаут
		const pages = await Promise.all(promises.map(promise => {
			return Promise.race([
				promise,
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error('Request timeout')), timeout)
				)
			]);
		}));

		// Проверяем, что все ответы успешны
		for (const response of pages) {
			if (!response.ok) {
				throw new Error(`API response error: ${response.status} - ${response.statusText}`);
			}
		}

		const responses = await Promise.all(pages.map(response => response.json()));
		const allCoins = responses.flat();

		const cryptoList = document.getElementById('crypto-list');
		document.getElementById('loading').style.display = 'none';

		// Получаем выбранное пользователем количество монет
		const coinsToShow = parseInt(getCoinsCount());

		// Фильтруем только валидные монеты с процентом изменения
		const validCoins = allCoins
			.filter(coin =>
				coin.price_change_percentage_24h != null &&
				!isNaN(coin.price_change_percentage_24h)
			)
			.sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
			.slice(0, coinsToShow);

		if (validCoins.length === 0) {
			throw new Error('No valid coins found');
		}

		validCoins.forEach(coin => {
			const priceChange = coin.price_change_percentage_24h;
			const priceChangeClass = priceChange >= 0 ? 'positive' : 'negative';

			const coinElement = document.createElement('div');
			coinElement.className = 'crypto-item';

			// Форматирование данных с улучшенной точностью
			const formattedPrice = formatPrice(coin.current_price);
			const formattedVolume = formatLargeNumber(coin.total_volume);
			const formattedMarketCap = formatLargeNumber(coin.market_cap);
			const formattedFullyDilutedValuation = coin.fully_diluted_valuation
				? formatLargeNumber(coin.fully_diluted_valuation)
				: 'N/A';
			const formattedCirculatingSupply = formatLargeNumber(coin.circulating_supply);
			const formattedTotalSupply = coin.total_supply
				? formatLargeNumber(coin.total_supply)
				: 'N/A';
			const formattedMaxSupply = coin.max_supply
				? formatLargeNumber(coin.max_supply)
				: 'Unlimited';

			coinElement.innerHTML = `
				<div class="crypto-main">
					<div class="coin-info">
						<img 
							src="${coin.image}" 
							alt="${coin.name}" 
							class="coin-icon"
							onerror="this.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='"
						/>
						<div class="coin-details">
							<span class="coin-name">${coin.name}</span>
							<span class="coin-symbol">${coin.symbol.toUpperCase()}</span>
						</div>
					</div>
					<span class="percentage ${priceChangeClass}">
						${priceChange > 0 ? '+' : ''}${priceChange.toFixed(1)}%
					</span>
				</div>
				<div class="coin-expanded">
					<div class="expanded-row">
						<span>Price:</span>
						<span>$${formattedPrice}</span>
					</div>
					<div class="expanded-row">
						<span>Market Cap:</span>
						<span>$${formattedMarketCap}</span>
					</div>
					<div class="expanded-row">
						<span>Fully Diluted Cap:</span>
						<span>${formattedFullyDilutedValuation === 'N/A' ? 'N/A' : '$' + formattedFullyDilutedValuation}</span>
					</div>
					<div class="expanded-row">
						<span>24h Volume:</span>
						<span>$${formattedVolume}</span>
					</div>
					<div class="expanded-row">
						<span>Circulating Supply:</span>
						<span>${formattedCirculatingSupply} ${coin.symbol.toUpperCase()}</span>
					</div>
					<div class="expanded-row">
						<span>Total Supply:</span>
						<span>${formattedTotalSupply} ${coin.symbol.toUpperCase()}</span>
					</div>
					<div class="expanded-row">
						<span>Max Supply:</span>
						<span>${formattedMaxSupply} ${coin.symbol.toUpperCase()}</span>
					</div>
					<a href="https://www.coingecko.com/en/coins/${coin.id}" 
					   target="_blank" 
					   class="coingecko-link">
						View on CoinGecko 🚀
					</a>
				</div>
			`;

			// Добавляем обработчик клика для раскрытия информации
			const mainSection = coinElement.querySelector('.crypto-main');
			const expandedSection = coinElement.querySelector('.coin-expanded');

			mainSection.addEventListener('click', () => {
				expandedSection.classList.toggle('active');
			});

			cryptoList.appendChild(coinElement);
		});

		// Обновляем время последнего обновления данных
		updateLastUpdatedTime();
	} catch (error) {
		console.error('Error:', error);
		document.getElementById('loading').style.display = 'none';

		let errorMessage = '';
		// Выводим более понятное сообщение об ошибке
		if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('CORS')) {
			errorMessage = 'Network error. The CoinGecko API may be limiting requests. Please try again later.';
		} else if (error.message.includes('timeout')) {
			errorMessage = 'Request timeout. The API may be experiencing high load. Please try again later.';
		} else if (error.message.includes('API response error: 429')) {
			errorMessage = 'API rate limit exceeded. CoinGecko limits free API usage. Please try again in a few minutes.';
		} else if (error.message.includes('No valid coins found')) {
			errorMessage = 'No valid coins data found. The API response might be incomplete.';
		} else {
			errorMessage = 'Houston, we have a problem... 🛸 Please try again later.';
		}

		document.getElementById('loading').innerHTML = `<div class="error-message">${errorMessage}</div>`;
	}
}

// Функция для форматирования цены с адаптивным количеством десятичных знаков
function formatPrice(price) {
	if (price >= 1) {
		return price.toLocaleString(undefined, {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		});
	} else if (price >= 0.01) {
		return price.toLocaleString(undefined, {
			minimumFractionDigits: 4,
			maximumFractionDigits: 4
		});
	} else {
		return price.toLocaleString(undefined, {
			minimumFractionDigits: 6,
			maximumFractionDigits: 8
		});
	}
}

// Функция для форматирования больших чисел с более читаемым представлением
function formatLargeNumber(num) {
	if (num === null || isNaN(num)) return 'N/A';

	if (num >= 1000000000) {
		return (num / 1000000000).toFixed(2) + ' B';
	} else if (num >= 1000000) {
		return (num / 1000000).toFixed(2) + ' M';
	} else if (num >= 1000) {
		return (num / 1000).toFixed(2) + ' K';
	} else {
		return num.toLocaleString();
	}
}

// Функция для открытия side panel
async function openSidePanel() {
	try {
		await chrome.sidePanel.open({ windowId: (await chrome.windows.getCurrent()).id });
	} catch (error) {
		console.error('Error opening side panel:', error);
	}
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
	// Загружаем сохраненную тему из localStorage
	const savedTheme = localStorage.getItem('theme');
	if (savedTheme) {
		document.documentElement.setAttribute('data-theme', savedTheme);

		// Обновляем иконку в соответствии с темой
		const isDark = savedTheme === 'dark';
		document.getElementById('light-icon').style.display = isDark ? 'none' : 'block';
		document.getElementById('dark-icon').style.display = isDark ? 'block' : 'none';
	}

	// Загружаем сохраненное количество монет
	const savedCoinsCount = getCoinsCount();
	document.getElementById('coins-count').value = savedCoinsCount;

	// Добавляем обработчик события на кнопку переключения темы
	document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

	// Добавляем обработчик события на селектор количества монет
	document.getElementById('coins-count').addEventListener('change', saveCoinsCount);

	// Добавляем обработчик для открытия side panel
	document.getElementById('open-sidepanel').addEventListener('click', openSidePanel);

	// Загружаем данные о криптовалютах
	fetchTopGainers();

	// Обновляем данные каждые 3 минуты
	setInterval(fetchTopGainers, 180000);
}); 