/**
 * Point d'entrée pour tous les modèles
 */

const BotStatus = require('./BotStatus');
const Position = require('./Position');
const Trade = require('./Trade');
const TechnicalIndicators = require('./TechnicalIndicators');

module.exports = {
    BotStatus,
    Position,
    Trade,
    TechnicalIndicators
};