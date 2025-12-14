# 🤖 Trading Bot v2 - Architecture Modulaire

  - Pour démarrer l'application en mode développement :
    ```bash
    pm2 start tbv2-dev
    pm2 save
    ```

  - Pour démarrer l'application en mode développement :
    ```bash
    pm2 start tbv2-prod
    pm2 save
    ```
  

> **Bot de trading crypto automatisé avec Bollinger Bands + RSI et support OCO**

## 🚀 **Transformation Architecturale Complète**

**Avant** : Fichier monolithique de 850+ lignes  
**Après** : Architecture modulaire professionnelle avec séparation par domaines

## 📁 **Structure du Projet**

```
tradingBot-v2/
├── 📄 app.js                    # Point d'entrée simplifié (75 lignes)
├── 📂 src/
│   ├── 📂 config/
│   │   └── ConfigService.js       # Configuration centralisée
│   ├── 📂 models/
│   │   ├── BotStatus.js          # États du bot (IDLE/IN_POSITION)
│   │   ├── Position.js           # Gestion des positions
│   │   ├── Trade.js              # Historique des trades
│   │   └── TechnicalIndicators.js # Signaux techniques
│   ├── 📂 services/
│   │   ├── DatabaseService.js    # Persistance SQLite
│   │   ├── ExchangeService.js    # API Binance + OCO
│   │   ├── IndicatorService.js   # Calculs techniques
│   │   └── TradingService.js     # Logique de trading
│   └── 📂 utils/
│       └── Logger.js             # Winston logging
├── 📂 logs/                      # Logs rotatifs
├── 📄 trading.db                 # Base de données
├── 📋 ARCHITECTURE.md            # Guide d'architecture
├── 📋 WINSTON-LOGGING.md         # Guide Winston
└── 📋 REFACTORING.md            # Documentation refactoring
```

## ⚡ **Démarrage Rapide**

### **Installation**
```bash
cd tradingBot-v2
npm install
```

### **Configuration**
```bash
cp .env.example .env
# Éditer .env avec vos clés API
```

### **Lancement**
```bash
# Mode développement
NODE_ENV=development npm start

# Mode production  
NODE_ENV=production npm start
```

## 🎯 **Modes de Trading**

### **Mode INDICATORS (Recommandé)**
- **Stratégie** : Bollinger Bands + RSI
- **Signaux** : Prix < BB_inf ET RSI < 30 → Achat
- **Sortie** : Prix > BB_sup OU RSI > 70 → Vente
- **Config** : `TRADING_MODE=INDICATORS`

### **Mode OCO (Automatique)**
- **Stratégie** : Ordres OCO automatiques
- **Take Profit** : +2% par défaut
- **Stop Loss** : -1% par défaut  
- **Config** : `TRADING_MODE=OCO`

## 🔧 **Configuration Avancée**

### **Variables d'Environnement**
```env
# API Binance
BINANCE_API_KEY=your_api_key
BINANCE_SECRET_KEY=your_secret_key
BINANCE_TESTNET=true

# Trading
TRADING_SYMBOL=BTC/USDC
TRADING_TIMEFRAME=5m
TRADING_MODE=INDICATORS
TRADE_AMOUNT=50

# OCO Mode
OCO_TAKE_PROFIT_PERCENT=2.0
OCO_STOP_LOSS_PERCENT=1.0

# Sécurité
MAX_POSITION_COUNT=1
MIN_BALANCE_USDC=10

# Logging
NODE_ENV=development
LOG_LEVEL=debug
TICK_INTERVAL=10000
RSI_PERIOD=14
BB_PERIOD=20
BB_STDDEV=2
RSI_OVERSOLD=30
RSI_OVERBOUGHT=70
```

## Configuration

### Required Environment Variables

- `BINANCE_API_KEY`: Your Binance API key
- `BINANCE_SECRET`: Your Binance secret key
- `SYMBOL`: Trading pair (default: BTC/USDC)
- `TIMEFRAME`: Chart timeframe (default: 5m)
- `ORDER_SIZE`: Position size in base currency (default: 0.001)

### Optional Environment Variables

- `TICK_INTERVAL`: Time between market scans in milliseconds (default: 10000)
- `RSI_PERIOD`: RSI calculation period (default: 14)
- `BB_PERIOD`: Bollinger Bands period (default: 20)
- `BB_STDDEV`: Bollinger Bands standard deviation (default: 2)
- `RSI_OVERSOLD`: RSI oversold threshold (default: 30)
- `RSI_OVERBOUGHT`: RSI overbought threshold (default: 70)

## Setting Up Binance API

1. Log in to your Binance account
2. Go to API Management
3. Create a new API key
4. **Important Security Settings**:
   - Enable "Enable Spot & Margin Trading"
   - Restrict API access to your IP address
   - Do NOT enable futures or other unnecessary permissions
5. Copy the API key and secret to your `.env` file

⚠️ **Security Warning**: Never share your API keys or commit them to version control!

## Usage

### Start the Bot

```bash
npm start
```

### Development Mode (with debugging)

```bash
npm run dev
```

### Stop the Bot

Press `Ctrl+C` to gracefully shutdown the bot.

## Trading Strategy

### Entry Signal (Buy)
- Current price < Lower Bollinger Band
- AND RSI < 30 (oversold)
- Places a limit buy order at current bid price

### Exit Signal (Sell)
- Current price > Upper Bollinger Band  
- AND RSI > 70 (overbought)
- Places a limit sell order for entire position at current ask price

### Risk Management
- Uses limit orders to control execution price
- 30-second timeout for order fills
- Automatic order cancellation if not filled
- Position sizing controlled by ORDER_SIZE parameter
- Single position at a time (no pyramiding)

## Database Schema

The bot uses SQLite to persist state across restarts:

### Tables

1. **bot_status**: Single-row table tracking bot state (IDLE/IN_POSITION)
2. **position**: Current open position details
3. **trade_history**: Complete trade log for analysis

### Data Persistence

- All state changes use database transactions
- Prepared statements for security and performance
- WAL mode enabled for better concurrency
- Automatic schema creation on first run

## Monitoring and Logs

The bot provides comprehensive logging:

- Market data and indicator values
- Buy/sell signal detection
- Order placement and execution
- Profit/loss calculations
- Error handling and recovery

### Log Format
```
2025-12-12T08:00:00.000Z [INFO] Starting bot initialization...
2025-12-12T08:00:01.000Z [INFO] Current price: 43250.5, RSI: 28.5, BB Lower: 43100.0, BB Upper: 43400.0
2025-12-12T08:00:02.000Z [INFO] Buy signal detected!
```

## Performance Statistics

The bot tracks and logs performance metrics:
- Total number of trades
- Total profit/loss
- Current position status
- Statistics logged every 5 minutes

## Error Handling

- Graceful handling of network timeouts
- Automatic retry on transient errors
- Database transaction rollback on failures
- Comprehensive logging of all errors
- Graceful shutdown on system signals

## Safety Features

- Sandbox mode support (set `sandbox: true` in exchange config)
- Rate limiting enabled to prevent API bans
- Input validation for all configuration parameters
- Secure database operations with prepared statements
- No API keys in logs or error messages

## Testing

Before running with real funds:

1. **Test with small amounts**: Start with very small ORDER_SIZE
2. **Monitor logs**: Check that signals are being detected correctly
3. **Verify orders**: Ensure orders are being placed and filled as expected
4. **Check database**: Verify state persistence across restarts

## Troubleshooting

### Common Issues

1. **"BINANCE_API_KEY and BINANCE_SECRET are required"**
   - Check your `.env` file exists and contains valid API credentials

2. **"Symbol BTC/USDC not found on exchange"**
   - Verify the symbol exists and is correctly formatted
   - Check if the market is currently active

3. **"Insufficient market data for indicators"**
   - Wait for more candle data to accumulate
   - Reduce indicator periods if necessary

4. **Orders not filling**
   - Check account balance
   - Verify order size meets minimum requirements
   - Consider using market orders for testing (modify code)

### Database Issues

If you encounter database corruption:
1. Stop the bot
2. Delete `bot.db` file
3. Restart the bot (fresh database will be created)

## Disclaimer

This trading bot is for educational purposes. Cryptocurrency trading involves substantial risk of loss. Never trade with funds you cannot afford to lose. The authors are not responsible for any financial losses incurred through the use of this software.

Always test thoroughly with small amounts before running with significant capital.

## License

MIT License - see LICENSE file for details.