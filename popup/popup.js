async function fetchTopGainers() {
	try {
		// Получаем больше данных с нескольких страниц
		const pages = await Promise.all([
			fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=price_change_percentage_24h_desc&per_page=250&page=1&sparkline=false'),
			fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=price_change_percentage_24h_desc&per_page=250&page=2&sparkline=false'),
			fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=price_change_percentage_24h_desc&per_page=250&page=3&sparkline=false'),
			fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=price_change_percentage_24h_desc&per_page=250&page=4&sparkline=false')
		]);

		const responses = await Promise.all(pages.map(response => response.json()));
		const allCoins = responses.flat();

		const cryptoList = document.getElementById('crypto-list');
		document.getElementById('loading').style.display = 'none';
		cryptoList.innerHTML = '';

		// Фильтруем только по наличию процента изменения
		const validCoins = allCoins
			.filter(coin =>
				coin.price_change_percentage_24h != null &&
				!isNaN(coin.price_change_percentage_24h)
			)
			.sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
			.slice(0, 10);

		validCoins.forEach(coin => {
			const priceChange = coin.price_change_percentage_24h;
			const priceChangeClass = priceChange >= 0 ? 'positive' : 'negative';

			const coinElement = document.createElement('div');
			coinElement.className = 'crypto-item';

			const formattedPrice = coin.current_price.toLocaleString(undefined, {
				minimumFractionDigits: coin.current_price < 1 ? 6 : 2,
				maximumFractionDigits: 8
			});

			const formattedVolume = coin.total_volume.toLocaleString(undefined, {
				maximumFractionDigits: 0
			});

			const formattedMarketCap = coin.market_cap.toLocaleString(undefined, {
				maximumFractionDigits: 0
			});

			const formattedFullyDilutedValuation = coin.fully_diluted_valuation
				? coin.fully_diluted_valuation.toLocaleString(undefined, {
					maximumFractionDigits: 0
				})
				: 'N/A';

			const formattedCirculatingSupply = coin.circulating_supply.toLocaleString(undefined, {
				maximumFractionDigits: 0
			});

			const formattedTotalSupply = coin.total_supply
				? coin.total_supply.toLocaleString(undefined, {
					maximumFractionDigits: 0
				})
				: 'N/A';

			const formattedMaxSupply = coin.max_supply
				? coin.max_supply.toLocaleString(undefined, {
					maximumFractionDigits: 0
				})
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
	} catch (error) {
		console.error('Error:', error);
		document.getElementById('loading').textContent = 'Houston, we have a problem... 🛸';
	}
}

// Запускаем обновление данных
document.addEventListener('DOMContentLoaded', () => {
	fetchTopGainers();
	// Обновляем каждые 3 минуты
	setInterval(fetchTopGainers, 180000);
}); 