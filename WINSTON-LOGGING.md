# 📝 Système de Logging Winston - Guide d'Utilisation

## 🚀 **Nouveau Système de Logging**

Le bot utilise maintenant **Winston** pour un logging professionnel avec rotation automatique et archivage.

## 📋 **Fonctionnalités**

### ✅ **Logging Multi-Transport**
- **Console** : Logs colorés pour le développement
- **Fichier** : Logs persistants pour la production
- **Archive** : Rotation automatique des gros fichiers

### ✅ **Niveaux de Log**
- `error` : Erreurs critiques
- `warn` : Avertissements  
- `info` : Informations générales
- `debug` : Débogage (dev seulement)

### ✅ **Format Structuré**
```
2025-12-12 15:16:54 [TRADING]   [INFO]: Signal d'achat détecté | {"price":50000,"rsi":28.5}
```

## 🔧 **Configuration Automatique**

### **Environnement Développement**
```env
NODE_ENV=development
LOG_LEVEL=debug
```
- Fichier : `logs/trading-bot.log`
- Niveau : `debug` (tous les logs)
- Console : Colorée avec timestamps courts

### **Environnement Production**
```env
NODE_ENV=production  
LOG_LEVEL=info
```
- Fichier : `logs/trading-bot-prod.log`
- Niveau : `info` (pas de debug)
- Rotation : 5MB max, 5 fichiers

## 📝 **Utilisation dans le Code**

### **Import Standard**
```javascript
const { getLogger } = require('./src/utils/Logger');
const logger = getLogger();
```

### **Logs par Module**
```javascript
// Format: logger.niveau(module, message, données)
logger.info('BOT', 'Démarrage du trading');
logger.error('EXCHANGE', 'Erreur API', { code: 429, message: 'Rate limit' });
logger.debug('INDICATORS', 'RSI calculé', { value: 28.5 });
```

### **Logs avec Données Complexes**
```javascript
logger.info('TRADING', 'Position ouverte', {
  symbol: 'BTC/USDC',
  price: 50000,
  quantity: 0.001,
  indicators: { rsi: 28.5, bb_lower: 49500 }
});
```

### **Winston Direct (Avancé)**
```javascript
const { winston } = require('./src/utils/Logger');
winston.log('warn', 'Message direct', { custom: 'data' });
```

## 📁 **Structure des Logs**

```
logs/
├── trading-bot.log          # Dev logs
├── trading-bot-prod.log     # Production logs  
└── archive/                 # Archives automatiques
    ├── trading-bot-2025-12-12-14-16-54.log
    └── trading-bot-2025-12-12-15-30-22.log
```

## 🎛️ **Scripts NPM**

### **Archivage Manuel**
```bash
npm run logs:archive
# Déplace le log actuel vers archive/
```

### **Nettoyage Complet**
```bash
npm run logs:clean  
# Supprime tous les logs (attention !)
```

### **Vérification Config**
```bash
npm run config:check
# Affiche la config avec logs Winston
```

## 📊 **Exemples Concrets pour le Trading**

### **Démarrage du Bot**
```javascript
logger.info('BOT', 'Initialisation terminée', {
  symbol: 'BTC/USDC',
  timeframe: '5m',
  mode: 'INDICATORS'
});
```

### **Signaux de Trading**
```javascript
logger.info('SIGNALS', 'Signal d\'achat détecté', {
  reason: 'Prix < BB_inf ET RSI < 30',
  price: 49800,
  rsi: 28.5,
  bb_lower: 49500
});
```

### **Ordres Exécutés**
```javascript
logger.info('ORDERS', 'Ordre d\'achat exécuté', {
  orderId: 'BUY_123456',
  symbol: 'BTC/USDC',
  quantity: 0.001,
  price: 49850,
  fees: 0.000001
});
```

### **Erreurs avec Context**
```javascript
logger.error('EXCHANGE', 'Échec placement ordre', {
  error: 'Insufficient balance',
  required: 49.85,
  available: 30.50,
  symbol: 'BTC/USDC'
});
```

## 🔍 **Analyse des Logs**

### **Filtrer par Module**
```bash
# Logs de trading seulement
grep "\\[TRADING\\]" logs/trading-bot.log

# Erreurs seulement  
grep "\\[ERROR\\]" logs/trading-bot.log
```

### **Logs JSON pour Analyse**
```javascript
// Les métadonnées sont en JSON pour parsing facile
const logLine = "2025-12-12 15:16:54 [TRADING] [INFO]: Signal détecté | {\"rsi\":28.5}";
const jsonPart = logLine.split(' | ')[1];
const data = JSON.parse(jsonPart);
this.logger.info(data.rsi); // 28.5
```

## 🎯 **Avantages Winston vs Ancien Système**

| Fonctionnalité | Ancien | Winston |
|---------------|---------|----------|
| **Fichiers** | ❌ | ✅ Automatique |
| **Rotation** | ❌ | ✅ 5MB + Archive |
| **Couleurs** | ❌ | ✅ Dev friendly |
| **Niveaux** | ✅ Basic | ✅ Professionnel |
| **Métadonnées** | ✅ JSON | ✅ Structuré |
| **Performance** | ❌ | ✅ Optimisé |

## 🚀 **Migration Complète**

L'ancienne interface est conservée pour compatibilité :
```javascript
// Fonctionne toujours !
logger.info('MODULE', 'Message', { data: 'value' });
```

**Résultat** : Logs professionnels avec fichiers persistants, rotation automatique et format structuré pour l'analyse ! 🎉