# 🚀 To The Moon!

A Chrome extension that shows the top cryptocurrency gainers in the last 24 hours.

## Features

- 📈 Real-time tracking of top crypto gainers
- 💫 Clean and intuitive interface
- 🔄 Auto-updates every 3 minutes
- 📊 Detailed coin information including:
  - Price
  - Market Cap
  - Volume
  - Supply metrics
  - Price change percentage

## Installation

### From Chrome Web Store
*(Coming soon)*

### Manual Installation
1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Development

The extension is built using vanilla JavaScript and uses the CoinGecko API for cryptocurrency data.

### Project Structure 
```
extension/
├── manifest.json
├── assets/
│ └── icons/
│ ├── icon16.png
│ ├── icon32.png
│ ├── icon48.png
│ ├── icon128.png
│ └── icon256.png
└── popup/
├── popup.html
├── popup.css
└── popup.js
```
### API
Data is provided by the [CoinGecko API](https://www.coingecko.com/en/api)

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](https://choosealicense.com/licenses/mit/)
