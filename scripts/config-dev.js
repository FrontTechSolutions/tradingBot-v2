#!/usr/bin/env node

/**
 * 🚀 Vérification Configuration DEV
 */

process.env.ENVIRONMENT = 'DEV';
process.env.NODE_ENV = 'DEV';

const ConfigService = require('../src/config/ConfigService');
new ConfigService().displayConfigSummary();