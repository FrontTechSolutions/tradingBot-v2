/**
 * Modèle pour le statut du bot
 */
class BotStatus {
    constructor(data = {}) {
        this.symbol = data.symbol || null;
        this.status = data.status || 'IDLE';
        this.updatedAt = data.updated_at || Date.now();
    }

    /**
     * Vérifie si le bot est en position
     */
    isInPosition() {
        return this.status === 'IN_POSITION';
    }

    /**
     * Vérifie si le bot est inactif
     */
    isIdle() {
        return this.status === 'IDLE';
    }

    /**
     * Met à jour le statut
     */
    updateStatus(newStatus) {
        this.status = newStatus;
        this.updatedAt = Date.now();
    }

    /**
     * Convertit vers un format de base de données
     */
    toDatabaseFormat() {
        return {
            symbol: this.symbol,
            status: this.status,
            updated_at: this.updatedAt
        };
    }
}

module.exports = BotStatus;