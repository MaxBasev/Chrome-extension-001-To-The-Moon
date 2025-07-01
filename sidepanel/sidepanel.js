// Global variables
let currentTab = 'coingecko';
let isPanelPinned = false;

// Theme functions
function toggleTheme() {
	const html = document.documentElement;
	const isDark = html.getAttribute('data-theme') === 'dark';
	const newTheme = isDark ? 'light' : 'dark';

	html.setAttribute('data-theme', newTheme);
	localStorage.setItem('theme', newTheme);

	// Update icon visibility
	document.getElementById('light-icon').style.display = isDark ? 'block' : 'none';
	document.getElementById('dark-icon').style.display = isDark ? 'none' : 'block';
}

// Panel pin functions
function togglePinPanel() {
	isPanelPinned = !isPanelPinned;
	const pinButton = document.getElementById('pin-panel');

	if (isPanelPinned) {
		pinButton.classList.add('pinned');
		pinButton.title = 'Unpin Panel';
		localStorage.setItem('panelPinned', 'true');
	} else {
		pinButton.classList.remove('pinned');
		pinButton.title = 'Pin Panel';
		localStorage.setItem('panelPinned', 'false');
	}
}

// Tab switching functions
function switchTab(tabName) {
	// Hide all tab panels
	document.querySelectorAll('.tab-panel').forEach(panel => {
		panel.classList.remove('active');
	});

	// Remove active class from all tab buttons
	document.querySelectorAll('.tab-button').forEach(button => {
		button.classList.remove('active');
	});

	// Show selected tab panel
	document.getElementById(`${tabName}-tab`).classList.add('active');

	// Add active class to selected tab button
	document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

	currentTab = tabName;
	localStorage.setItem('currentTab', tabName);

	// Load data for the selected tab
	if (tabName === 'coingecko') {
		fetchCoinGeckoData();
	} else if (tabName === 'binance') {
		fetchBinanceData();
	}
}

// Coins count functions
function saveCoinsCount() {
	const coinsCount = document.getElementById('coins-count').value;
	localStorage.setItem('sidepanelCoinsCount', coinsCount);

	// Reload current tab data
	if (currentTab === 'coingecko') {
		fetchCoinGeckoData();
	} else if (currentTab === 'binance') {
		fetchBinanceData();
	}
}

function getCoinsCount() {
	return localStorage.getItem('sidepanelCoinsCount') || 10;
}

// Time formatting function
function updateLastUpdatedTime(elementId) {
	const now = new Date();
	const hours = now.getHours().toString().padStart(2, '0');
	const minutes = now.getMinutes().toString().padStart(2, '0');
	document.getElementById(elementId).textContent = `Last updated at ${hours}:${minutes}`;
}

// CoinGecko API functions
async function fetchCoinGeckoData() {
	try {
		document.getElementById('coingecko-loading').style.display = 'block';
		document.getElementById('coingecko-list').innerHTML = '';

		const coinsToShow = parseInt(getCoinsCount());
		const pages = Math.ceil(coinsToShow / 250);

		const promises = [];
		for (let i = 1; i <= Math.min(pages, 4); i++) {
			promises.push(
				fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=price_change_percentage_24h_desc&per_page=250&page=${i}&sparkline=false`)
			);
		}

		const timeout = 15000;
		const responses = await Promise.all(promises.map(promise => {
			return Promise.race([
				promise,
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error('Request timeout')), timeout)
				)
			]);
		}));

		for (const response of responses) {
			if (!response.ok) {
				throw new Error(`API response error: ${response.status} - ${response.statusText}`);
			}
		}

		const responseData = await Promise.all(responses.map(response => response.json()));
		const allCoins = responseData.flat();

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

		renderCoinGeckoCoins(validCoins);
		document.getElementById('coingecko-loading').style.display = 'none';
		updateLastUpdatedTime('coingecko-last-updated');

	} catch (error) {
		console.error('CoinGecko Error:', error);
		document.getElementById('coingecko-loading').style.display = 'none';

		let errorMessage = getErrorMessage(error);
		document.getElementById('coingecko-loading').innerHTML = `<div class="error-message">${errorMessage}</div>`;
	}
}

// Binance API functions
async function fetchBinanceData() {
	try {
		document.getElementById('binance-loading').style.display = 'block';
		document.getElementById('binance-list').innerHTML = '';

		const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');

		if (!response.ok) {
			throw new Error(`Binance API error: ${response.status} - ${response.statusText}`);
		}

		const data = await response.json();
		const coinsToShow = parseInt(getCoinsCount());
		const sortBy = document.getElementById('binance-sort').value;

		// Filter and process data
		let filteredData = data
			.filter(coin => coin.symbol.endsWith('USDT') && parseFloat(coin.quoteVolume) > 1000000) // Filter by minimum volume
			.map(coin => ({
				...coin,
				priceChangePercent: parseFloat(coin.priceChangePercent),
				volume: parseFloat(coin.volume),
				quoteVolume: parseFloat(coin.quoteVolume), // Volume in USDT (proxy for market cap)
				count: parseInt(coin.count),
				lastPrice: parseFloat(coin.lastPrice)
			}));

		// Sort by selected criteria (default: quoteVolume as proxy for market cap)
		if (sortBy === 'priceChangePercent') {
			filteredData.sort((a, b) => b.priceChangePercent - a.priceChangePercent);
		} else if (sortBy === 'volume') {
			filteredData.sort((a, b) => b.quoteVolume - a.quoteVolume); // Sort by USDT volume (market activity)
		} else if (sortBy === 'count') {
			filteredData.sort((a, b) => b.count - a.count);
		} else {
			// Default: sort by quote volume (closest to market cap ranking)
			filteredData.sort((a, b) => b.quoteVolume - a.quoteVolume);
		}

		filteredData = filteredData.slice(0, coinsToShow);

		await renderBinanceCoins(filteredData);
		document.getElementById('binance-loading').style.display = 'none';
		updateLastUpdatedTime('binance-last-updated');

	} catch (error) {
		console.error('Binance Error:', error);
		document.getElementById('binance-loading').style.display = 'none';

		let errorMessage = getBinanceErrorMessage(error);
		document.getElementById('binance-loading').innerHTML = `<div class="error-message">${errorMessage}</div>`;
	}
}

// Cache for crypto icons
const cryptoIconsCache = new Map();

// Popular crypto icons mapping for faster access
const popularCryptoIcons = {
	'BTC': 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
	'ETH': 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
	'BNB': 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
	'ADA': 'https://assets.coingecko.com/coins/images/975/small/cardano.png',
	'XRP': 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
	'SOL': 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
	'DOT': 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png',
	'DOGE': 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
	'AVAX': 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
	'SHIB': 'https://assets.coingecko.com/coins/images/11939/small/shiba.png',
	'MATIC': 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
	'UNI': 'https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png',
	'ATOM': 'https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png',
	'LTC': 'https://assets.coingecko.com/coins/images/2/small/litecoin.png',
	'LINK': 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
	'BCH': 'https://assets.coingecko.com/coins/images/780/small/bitcoin-cash-circle.png',
	'XLM': 'https://assets.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png',
	'VET': 'https://assets.coingecko.com/coins/images/1077/small/VET_Token_Icon.png',
	'ICP': 'https://assets.coingecko.com/coins/images/14495/small/Internet_Computer_logo.png',
	'FIL': 'https://assets.coingecko.com/coins/images/12817/small/filecoin.png',
	'TRX': 'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png',
	'ETC': 'https://assets.coingecko.com/coins/images/453/small/ethereum-classic-logo.png',
	'XMR': 'https://assets.coingecko.com/coins/images/69/small/monero_logo.png',
	'APT': 'https://assets.coingecko.com/coins/images/26455/small/aptos_round.png',
	'NEAR': 'https://assets.coingecko.com/coins/images/10365/small/near.jpg',
	'MANA': 'https://assets.coingecko.com/coins/images/878/small/decentraland-mana.png',
	'SAND': 'https://assets.coingecko.com/coins/images/12129/small/sandbox_logo.jpg',
	'CRO': 'https://assets.coingecko.com/coins/images/7310/small/cro_token_logo.png',
	'FTM': 'https://assets.coingecko.com/coins/images/4001/small/Fantom_round.png',
	'AXS': 'https://assets.coingecko.com/coins/images/13029/small/axie_infinity_logo.png',
	'AAVE': 'https://assets.coingecko.com/coins/images/12645/small/AAVE.png',
	'XTZ': 'https://assets.coingecko.com/coins/images/976/small/Tezos-logo.png',
	'CAKE': 'https://assets.coingecko.com/coins/images/12632/small/pancakeswap-cake-logo.png',
	'SUSHI': 'https://assets.coingecko.com/coins/images/12271/small/512x512_Logo_no_chop.png',
	'COMP': 'https://assets.coingecko.com/coins/images/10775/small/COMP.png',
	'MKR': 'https://assets.coingecko.com/coins/images/1364/small/Mark_Maker.png',
	'YFI': 'https://assets.coingecko.com/coins/images/11849/small/yfi-192x192.png',
	'BAT': 'https://assets.coingecko.com/coins/images/677/small/basic-attention-token.png',
	'ENJ': 'https://assets.coingecko.com/coins/images/1102/small/enjin-coin-logo.png',
	'CHZ': 'https://assets.coingecko.com/coins/images/8834/small/Chiliz.png',
	'USDC': 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
	'USDT': 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
	'BUSD': 'https://assets.coingecko.com/coins/images/9576/small/BUSD.png',
	'DAI': 'https://assets.coingecko.com/coins/images/9956/small/4943.png',
	'TUSD': 'https://assets.coingecko.com/coins/images/3449/small/tusd.png',
	'FDUSD': 'https://assets.coingecko.com/coins/images/31079/small/firstfigital.jpeg',
	'PEPE': 'https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg',
	'FLOKI': 'https://assets.coingecko.com/coins/images/16746/small/PNG_image.png',
	'WIF': 'https://assets.coingecko.com/coins/images/33767/small/dogwifcoin.jpg',
	'BONK': 'https://assets.coingecko.com/coins/images/28600/small/bonk.jpg',
	'PENGU': 'https://assets.coingecko.com/coins/images/38464/small/pengu-logo.png',
	'HFT': 'https://assets.coingecko.com/coins/images/26136/small/hashflow-icon-cmc.png'
};

// Function to get crypto icon for any symbol
async function getCryptoIcon(symbol) {
	// Check cache first
	if (cryptoIconsCache.has(symbol)) {
		return cryptoIconsCache.get(symbol);
	}

	// Check popular icons first
	if (popularCryptoIcons[symbol]) {
		const iconHtml = `<img src="${popularCryptoIcons[symbol]}" alt="${symbol}" class="coin-icon" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
				<div class="coin-icon-fallback" style="display: none; background: #f0b90b; color: #000; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">
					${symbol.slice(0, 2)}
				</div>`;

		// Cache the result
		cryptoIconsCache.set(symbol, iconHtml);
		return iconHtml;
	}

	try {
		// Search for coin by symbol via CoinGecko API with multiple strategies
		const searchPromises = [
			fetch(`https://api.coingecko.com/api/v3/search?query=${symbol}`),
			fetch(`https://api.coingecko.com/api/v3/search?query=${symbol.toLowerCase()}`),
		];

		const responses = await Promise.allSettled(searchPromises);

		for (const response of responses) {
			if (response.status === 'fulfilled' && response.value.ok) {
				const data = await response.value.json();

				// Look for exact symbol match first
				let coin = data.coins.find(c => c.symbol.toLowerCase() === symbol.toLowerCase());

				// If not found, look for partial matches
				if (!coin) {
					coin = data.coins.find(c =>
						c.symbol.toLowerCase().includes(symbol.toLowerCase()) ||
						symbol.toLowerCase().includes(c.symbol.toLowerCase())
					);
				}

				if (coin && coin.large) {
					const iconHtml = `<img src="${coin.large}" alt="${symbol}" class="coin-icon" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
							<div class="coin-icon-fallback" style="display: none; background: #f0b90b; color: #000; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">
								${symbol.slice(0, 2)}
							</div>`;

					// Cache the result
					cryptoIconsCache.set(symbol, iconHtml);
					return iconHtml;
				}
			}
		}
	} catch (error) {
		console.log(`Icon search failed for ${symbol}:`, error);
	}

	// Fallback to text icon
	const fallbackHtml = `<div class="coin-icon" style="background: #f0b90b; color: #000; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">
				${symbol.slice(0, 2)}
			</div>`;

	// Cache the fallback
	cryptoIconsCache.set(symbol, fallbackHtml);
	return fallbackHtml;
}

// Render functions
function renderCoinGeckoCoins(coins) {
	const coinsList = document.getElementById('coingecko-list');

	coins.forEach(coin => {
		const priceChange = coin.price_change_percentage_24h;
		const priceChangeClass = priceChange >= 0 ? 'positive' : 'negative';

		const coinElement = document.createElement('div');
		coinElement.className = 'crypto-item';

		const formattedPrice = formatPrice(coin.current_price);
		const formattedVolume = formatLargeNumber(coin.total_volume);
		const formattedMarketCap = formatLargeNumber(coin.market_cap);

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
					<span>24h Volume:</span>
					<span>$${formattedVolume}</span>
				</div>
				<a href="https://www.coingecko.com/en/coins/${coin.id}" 
				   target="_blank" 
				   class="coingecko-link">
					View on CoinGecko 🚀
				</a>
			</div>
		`;

		// Add click handler for expansion
		const mainSection = coinElement.querySelector('.crypto-main');
		const expandedSection = coinElement.querySelector('.coin-expanded');

		mainSection.addEventListener('click', () => {
			expandedSection.classList.toggle('active');
		});

		coinsList.appendChild(coinElement);
	});
}

async function renderBinanceCoins(coins) {
	const coinsList = document.getElementById('binance-list');

	// Create all coin elements first with placeholder icons
	const coinElements = [];

	for (const coin of coins) {
		const priceChange = coin.priceChangePercent;
		const priceChangeClass = priceChange >= 0 ? 'positive' : 'negative';
		const symbol = coin.symbol.replace('USDT', '');

		const coinElement = document.createElement('div');
		coinElement.className = 'crypto-item';

		const formattedPrice = formatPrice(parseFloat(coin.lastPrice));
		const formattedVolume = formatLargeNumber(coin.volume);
		const formattedQuoteVolume = formatLargeNumber(parseFloat(coin.quoteVolume));

		// Create element with temporary icon
		coinElement.innerHTML = `
			<div class="crypto-main">
				<div class="coin-info">
					<div class="coin-icon-container">
						<div class="coin-icon loading-icon" style="background: #f0b90b; color: #000; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">
							${symbol.slice(0, 2)}
						</div>
					</div>
					<div class="coin-details">
						<span class="coin-name">${symbol}</span>
						<span class="coin-symbol">${coin.symbol}</span>
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
					<span>24h Volume (USDT):</span>
					<span>$${formattedQuoteVolume}</span>
				</div>
				<div class="expanded-row">
					<span>24h Volume (${symbol}):</span>
					<span>${formattedVolume} ${symbol}</span>
				</div>
				<div class="expanded-row">
					<span>Trade Count:</span>
					<span>${coin.count.toLocaleString()}</span>
				</div>
				<div class="expanded-row">
					<span>High/Low 24h:</span>
					<span>$${formatPrice(parseFloat(coin.highPrice))} / $${formatPrice(parseFloat(coin.lowPrice))}</span>
				</div>
				<a href="https://www.binance.com/en/trade/${symbol}_USDT" 
				   target="_blank" 
				   class="binance-link">
					Trade on Binance ⚡
				</a>
			</div>
		`;

		// Add click handler for expansion
		const mainSection = coinElement.querySelector('.crypto-main');
		const expandedSection = coinElement.querySelector('.coin-expanded');

		mainSection.addEventListener('click', () => {
			expandedSection.classList.toggle('active');
		});

		coinsList.appendChild(coinElement);
		coinElements.push({ element: coinElement, symbol: symbol });
	}

	// Load icons asynchronously
	for (const { element, symbol } of coinElements) {
		try {
			const iconHtml = await getCryptoIcon(symbol);
			const iconContainer = element.querySelector('.coin-icon-container');
			if (iconContainer) {
				iconContainer.innerHTML = iconHtml;
			}
		} catch (error) {
			console.log(`Failed to load icon for ${symbol}:`, error);
		}
	}
}

// Utility functions
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

function getErrorMessage(error) {
	if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('CORS')) {
		return 'Network error. The CoinGecko API may be limiting requests. Please try again later.';
	} else if (error.message.includes('timeout')) {
		return 'Request timeout. The API may be experiencing high load. Please try again later.';
	} else if (error.message.includes('API response error: 429')) {
		return 'API rate limit exceeded. CoinGecko limits free API usage. Please try again in a few minutes.';
	} else if (error.message.includes('No valid coins found')) {
		return 'No valid coins data found. The API response might be incomplete.';
	} else {
		return 'Houston, we have a problem... 🛸 Please try again later.';
	}
}

function getBinanceErrorMessage(error) {
	if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
		return 'Network error. Cannot connect to Binance API. Please try again later.';
	} else if (error.message.includes('Binance API error: 429')) {
		return 'Binance API rate limit exceeded. Please try again later.';
	} else {
		return 'Binance API error. Please try again later. ⚡';
	}
}

// Event listeners and initialization
document.addEventListener('DOMContentLoaded', () => {
	// Load saved theme
	const savedTheme = localStorage.getItem('theme');
	if (savedTheme) {
		document.documentElement.setAttribute('data-theme', savedTheme);
		const isDark = savedTheme === 'dark';
		document.getElementById('light-icon').style.display = isDark ? 'none' : 'block';
		document.getElementById('dark-icon').style.display = isDark ? 'block' : 'none';
	}

	// Load saved panel pin state
	const savedPinState = localStorage.getItem('panelPinned');
	if (savedPinState === 'true') {
		isPanelPinned = true;
		document.getElementById('pin-panel').classList.add('pinned');
		document.getElementById('pin-panel').title = 'Unpin Panel';
	}

	// Load saved coins count
	const savedCoinsCount = getCoinsCount();
	document.getElementById('coins-count').value = savedCoinsCount;

	// Load saved current tab
	const savedTab = localStorage.getItem('currentTab') || 'coingecko';
	if (savedTab !== 'coingecko') {
		switchTab(savedTab);
	} else {
		currentTab = 'coingecko';
	}

	// Add event listeners
	document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
	document.getElementById('pin-panel').addEventListener('click', togglePinPanel);
	document.getElementById('coins-count').addEventListener('change', saveCoinsCount);
	document.getElementById('refresh-binance').addEventListener('click', () => fetchBinanceData());
	document.getElementById('binance-sort').addEventListener('change', () => fetchBinanceData());

	// Tab switching
	document.querySelectorAll('.tab-button').forEach(button => {
		button.addEventListener('click', () => {
			const tabName = button.getAttribute('data-tab');
			switchTab(tabName);
		});
	});

	// Load initial data based on current tab
	if (currentTab === 'coingecko') {
		fetchCoinGeckoData();
	} else if (currentTab === 'binance') {
		fetchBinanceData();
	}

	// Auto-refresh every 3 minutes
	setInterval(() => {
		if (currentTab === 'coingecko') {
			fetchCoinGeckoData();
		} else if (currentTab === 'binance') {
			fetchBinanceData();
		}
	}, 180000);
}); 