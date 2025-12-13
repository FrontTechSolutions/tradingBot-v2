#!/usr/bin/env node

/**
 * 🏭 Vérification Configuration PRODUCTION
 */

process.env.ENVIRONMENT = 'PROD';
process.env.NODE_ENV = 'PROD';

const ConfigService = require('../src/config/ConfigService');
new ConfigService().displayConfigSummary();