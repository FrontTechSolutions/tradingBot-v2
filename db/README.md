# 📁 Dossier des Bases de Données

Ce dossier contient toutes les bases de données SQLite du bot de trading.

## 📊 Structure des Bases de Données

### **🔧 LOCAL - Développement**
- **Fichier** : `trading-local.db`
- **Usage** : Tests et développement local
- **Données** : Trades testnet, positions de test

### **🚀 DEV - Staging**
- **Fichier** : `trading-dev.db`
- **Usage** : Tests de validation avant production
- **Données** : Simulation conditions réelles avec testnet

### **🏭 PROD - Production**
- **Fichier** : `trading-prod.db`
- **Usage** : Données réelles de production
- **Données** : Vrais trades, positions réelles, argent réel

## 🛡️ Sécurité

- ✅ Chaque environnement a sa propre base isolée
- ✅ Aucun risque de corruption croisée
- ✅ Sauvegarde possible par environnement

## 🔧 Maintenance

```bash
# Voir les bases de données
dir db\*.db

# Sauvegarde
copy db\trading-local.db db\backup-local-%date%.db

# Reset développement (SAFE)
del db\trading-local.db
del db\trading-dev.db

# ⚠️ JAMAIS supprimer trading-prod.db sans backup !
```

## 📋 Schéma des Tables

Chaque base de données contient :

- **bot_status** — État actuel du bot (IDLE/IN_POSITION)
- **position** — Position ouverte actuelle (avec support OCO et stop-loss natif)
	- `highest_price` : plus haut atteint depuis l'achat (pour trailing stop)
	- `stop_loss_order_id` : identifiant de l'ordre stop-loss natif placé sur l'exchange (permet de détecter si la position a été liquidée automatiquement)
- **trade_history** — Historique complet des trades