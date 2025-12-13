# 🌍 Guide Configuration Multi-Environnements

## 📋 **Vue d'Ensemble**

Votre bot de trading supporte maintenant **3 environnements distincts** :

- **🔧 LOCAL** - Développement sur votre machine
- **🚀 DEV** - Serveur de développement/staging  
- **🏭 PROD** - Production avec argent réel

## 📁 **Structure des Fichiers de Configuration**

```
tradingBot-v2/
├── .env.example     # Template de base
├── .env.local       # Configuration LOCAL ✅
├── .env.dev         # Configuration DEV ✅  
├── .env.prod        # Configuration PROD ✅
├── start-local.bat  # Lancement Windows LOCAL
├── start-dev.bat    # Lancement Windows DEV
└── start-prod.bat   # Lancement Windows PROD
```

## ⚙️ **Configuration par Environnement**

### 🔧 **LOCAL - Développement**
- **Testnet** : ✅ Obligatoire (`BINANCE_TESTNET=true`)
- **Montant** : 10 USDC (petits tests)
- **Trades/jour** : 10 max
- **Logs** : DEBUG verbeux
- **DB** : `./trading-local.db`
- **Intervalle** : 5s (rapide pour tests)

### 🚀 **DEV - Staging**  
- **Testnet** : ✅ Obligatoire (`BINANCE_TESTNET=true`)
- **Montant** : 25 USDC (réaliste)
- **Trades/jour** : 25 max
- **Logs** : INFO avec monitoring
- **DB** : `./trading-dev.db`
- **Intervalle** : 10s (production)

### 🏭 **PROD - Production**
- **Testnet** : ❌ API réelle (`BINANCE_TESTNET=false`) 
- **Montant** : 100 USDC (à ajuster selon capital)
- **Trades/jour** : 100 max
- **Logs** : WARN optimisé
- **DB** : `/opt/trading-bot/data/trading-prod.db`
- **Limites** : Perte max 500 USDC/jour

## 🚀 **Commandes de Lancement**

### **Linux/Mac (Bash)**
```bash
# LOCAL - Développement
ENVIRONMENT=LOCAL node app.js

# DEV - Staging  
ENVIRONMENT=DEV node app.js

# PROD - Production (⚠️ ARGENT RÉEL)
ENVIRONMENT=PROD node app.js
```

### **Windows (Batch)**
```cmd
# LOCAL - Développement
start-local.bat

# DEV - Staging
start-dev.bat

# PROD - Production (⚠️ ARGENT RÉEL) 
start-prod.bat
```

### **Cross-Platform (NPM)**
```bash
# Vérifications config
npm run config:check       # Environnement détecté automatiquement

# Tests spécifiques  
node test-environments.js   # Teste les 3 environnements
```

## 🔍 **Vérification de Configuration**

### **Vérifier un Environnement Spécifique**
```bash
# LOCAL
ENVIRONMENT=LOCAL npm run config:check

# DEV  
ENVIRONMENT=DEV npm run config:check

# PROD
ENVIRONMENT=PROD npm run config:check
```

### **Test Complet des 3 Environnements**
```bash
node test-environments.js
```

## 🛡️ **Sécurité par Environnement**

### **🔧 LOCAL & DEV - Sécurisés**
```env
BINANCE_TESTNET=true          # ✅ Obligatoire
TRADE_AMOUNT=10-25            # Petits montants
MAX_DAILY_TRADES=10-25        # Limites basses
DEBUG_MODE=true               # Logs verbeux
```

### **🏭 PROD - Protection Renforcée**
```env
BINANCE_TESTNET=false         # ⚠️ API réelle
TRADE_AMOUNT=100              # Montant production
MAX_DAILY_TRADES=100          # Limite élevée
MAX_DAILY_LOSS=500            # Protection perte
MIN_BALANCE_USDC=50           # Solde minimum
```

## 🔄 **Détection Automatique d'Environnement**

Le bot détecte automatiquement l'environnement dans cet ordre :

1. **Variable `ENVIRONMENT`** (priorité max)
2. **Variable `NODE_ENV`** (fallback)  
3. **Défaut `LOCAL`** (si aucune variable)

```javascript
// Exemples de détection
ENVIRONMENT=PROD → PROD
NODE_ENV=development → LOCAL  
// Aucune variable → LOCAL
```

## 📊 **Différences de Configuration**

| Paramètre | LOCAL | DEV | PROD |
|-----------|-------|-----|------|
| **Testnet** | ✅ Oui | ✅ Oui | ❌ Non |
| **Montant Trade** | 10 USDC | 25 USDC | 100 USDC |
| **Max Trades/jour** | 10 | 25 | 100 |
| **Log Level** | DEBUG | INFO | WARN |
| **Monitoring** | ❌ | ✅ | ✅ |
| **Verbeux** | ✅ | ❌ | ❌ |
| **Perte Max/jour** | - | - | 500 USDC |

## 🎯 **Workflow Recommandé**

### **1. Développement (LOCAL)**
```bash
# 1. Créer/modifier .env.local avec vos clés testnet
# 2. Vérifier la config
ENVIRONMENT=LOCAL npm run config:check

# 3. Lancer le bot
ENVIRONMENT=LOCAL node app.js
```

### **2. Tests Staging (DEV)**  
```bash
# 1. Ajuster .env.dev pour des tests réalistes
# 2. Vérifier
ENVIRONMENT=DEV npm run config:check

# 3. Tests complets
ENVIRONMENT=DEV node app.js
```

### **3. Déploiement Production (PROD)**
```bash
# ⚠️ ATTENTION: ARGENT RÉEL !

# 1. Configurer .env.prod avec API réelle
# 2. Vérification critique
ENVIRONMENT=PROD npm run config:check

# 3. Lancement production
ENVIRONMENT=PROD node app.js
```

## 🔧 **Personnalisation Avancée**

### **Ajouter de Nouveaux Paramètres**

1. **Modifier les fichiers `.env.*`** :
```env
# Exemple: nouveau paramètre
MY_CUSTOM_PARAM=value_for_env
```

2. **Mettre à jour `ConfigService.js`** :
```javascript
// Dans loadConfiguration()
custom: {
    myParam: process.env.MY_CUSTOM_PARAM || 'default'
}
```

3. **Valeurs par défaut par environnement** :
```javascript
getDefaultCustomParam() {
    const values = {
        'LOCAL': 'dev_value',
        'DEV': 'staging_value', 
        'PROD': 'prod_value'
    };
    return values[this.environment] || 'fallback';
}
```

## 🚨 **Alertes de Sécurité**

### **⚠️ PROD Avec Testnet**
```
⚠️ ATTENTION: Testnet activé en PRODUCTION !
```

### **⚠️ DEV/LOCAL Avec API Réelle**  
```
⚠️ ATTENTION: API réelle en DEV, recommandé d'utiliser TESTNET !
```

### **🚨 PROD Mode Réel**
```
🚨 PRODUCTION: ARGENT RÉEL EN JEU !
```

## 📚 **Scripts Utiles**

```bash
# Test tous environnements
node test-environments.js

# Vérification rapide LOCAL
ENVIRONMENT=LOCAL npm run config:check

# Démarrage message stylisé
node test-startup-message.js

# Vérification architecture complète
node verify-setup.js
```

---

**🎉 Votre bot est maintenant configuré pour les 3 environnements !**

> 🔧 LOCAL → 🚀 DEV → 🏭 PROD avec sécurité et flexibilité maximales