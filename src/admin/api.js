/* eslint-disable */
// TODO: Remove previous line and work through linting issues at next edit

'use strict';

const uuidv4 = require('uuid/v4');
const { get, put, post, buildUrl } = require('../requests/requests');


/**
 * Get account details
 *
 * @returns {object}
 */
async function getAccountById(endpoint, participantName, accountId, logger) {
    const accountIdNum = Number(accountId);
    const accounts = await getParticipantAccounts(endpoint, participantName, logger);
    const account = accounts.find(a => a.id === accountIdNum);
    if (account === undefined) {
        throw new Error(`Couldn't find account with id ${accountId}`);
    }
    return account;
}

async function getAccountByType(endpoint, participantName, currency, accountType, logger) {
    const accounts = await getParticipantAccounts(endpoint, participantName, logger);
    const account = accounts
                        .filter(a => a.currency === currency)
                        .find(ac => ac.ledgerAccountType === accountType);
    if (account === undefined) {
        throw new Error(`Couldn't find account with id ${accountId}`);
    }
    return account;
}



/**
 * Get all participant accounts
 *
 * @returns {object}
 */
async function getParticipantAccounts(endpoint, participantName, logger) {
    const accounts = await get(`participants/${participantName}/accounts`, { endpoint, logger });
    return accounts;
}


/**
 * Get a single participant's information
 *
 * @returns {object}
 */
async function getParticipant(endpoint, participantName, logger) {
    return await get(`participants/${participantName}`, { endpoint, logger });
}


/**
 * Get the list of all participants
 *
 * @returns {object}
 */
async function getParticipants(endpoint, logger) {
    return await get('participants', { endpoint, logger });
}

/**
 * Gets a list of email addresses for a participant
 * 
 * @returns {object}
 */
async function getParticipantEmailAddresses(endpoint, participantName, logger) {
    const participantEndpoints = await get(buildUrl('participants', participantName, 'endpoints'), { endpoint, logger });
    const emailAddresses = participantEndpoints.filter(a => a.type.endsWith("_EMAIL"));
    return emailAddresses;
}

/**
 * Updates participant email address for a notification type
 * @returns {object}
 */
async function updateEmailAddress(endpoint, dfspName, emailType, newEmailAddress, logger) {
    const newEndPoint = { type : emailType, value : newEmailAddress };
    return await post(buildUrl('participants', dfspName, 'endpoints'), newEndPoint , { endpoint, logger });
}


/**
 * Get net debit cap for a given dfsp+currency
 *
 * @returns {object}
 */
async function getNDC(endpoint, dfspName, currency, logger) {
    const limits = await get(buildUrl('participants', dfspName, 'limits'), { endpoint, logger });
    const ndc = limits.find(l => l.currency === currency && l.limit.type === 'NET_DEBIT_CAP');
    if (ndc === undefined) {
        throw new Error(`Couldn't find ${currency} net debit cap for participant ${dfspName}`);
    }
    // Looks like:
    // {
    //   "currency": "XOF",
    //   "limit": {
    //     "type": "NET_DEBIT_CAP",
    //     "value": 10000,
    //     "alarmPercentage": 10
    //   }
    // }
    return ndc;
}


/**
 * Set net debit cap for a given dfsp+currency
 *
 * @returns {object}
 */
async function setNDC(endpoint, dfspName, currency, newAmount, logger) {
    const ndc = await getNDC(endpoint, dfspName, currency);
    const newNDC = { currency, limit: { ...ndc.limit, value: newAmount } };
    return await put(buildUrl('participants', dfspName, 'limits'), newNDC, { endpoint, logger });
}


/**
 * Get participant from account ID
 *
 * @returns {object}
 */
async function getParticipantByAccountId(endpoint, accountId, logger) {
    const participants = await get('participants', { endpoint, logger });
    // match participant account id to get the fsp name
    const fsp = participants.find(p => -1 !== p.accounts.findIndex(a => a.id === accountId));
    if (fsp.name === undefined) {
        throw new Error(`Couldn't find fsp with account ID ${accountId}`);
    }
    return fsp;
}


/**
 * Prepare DFSP funds out for reconciliation
 *
 * @returns {object}
 */
async function fundsOutPrepareReserve(endpoint, accountId, amount, currency, reason, logger) {
    // TODO: should really take the participant as argument
    const fsp = await getParticipantByAccountId(endpoint, accountId);
    return await participantFundsOutPrepareReserve(endpoint, fsp.name, accountId, amount, currency, reason, logger);
}


/**
 * Prepare DFSP funds out for reconciliation
 *
 * @returns {object}
 */
async function participantFundsOutPrepareReserve(endpoint, participantName, accountId, amount, currency, reason, logger, { transferId = uuidv4() } = {}) {
    // TODO: should really take the participant as argument
    await post(`participants/${participantName}/accounts/${accountId}`, {
        transferId,
        externalReference: 'string', // TODO: something useful
        action: 'recordFundsOutPrepareReserve',
        reason,
        amount: {
            amount,
            currency
        }
    }, { endpoint, logger });
    return { transferId };
}


/**
 * Prepare, reserve, commit DFSP funds in for reconciliation
 *
 * @returns {object}
 */
async function fundsInReserve(endpoint, accountId, amount, reason, currency, logger) {
    // TODO: should really take the participant as argument
    const fsp = await getParticipantByAccountId(endpoint, accountId);
    return participantFundsInReserve(endpoint, fsp.name, accountId, amount, reason, currency, logger);
}


/**
 * Prepare, reserve, commit DFSP funds in for reconciliation
 *
 * @returns {object}
 */
async function participantFundsInReserve(endpoint, participantName, accountId, amount, reason, currency, logger, { transferId = uuidv4() } = {}) {
    await post(`participants/${participantName}/accounts/${accountId}`, {
        transferId,
        externalReference: 'string', // TODO: something useful
        action: 'recordFundsIn',
        reason,
        amount: {
            amount,
            currency
        }
    }, { endpoint, logger });
    return { transferId };
}

/**
 * Set the isActive flag for a participant
 *
 * @returns {object}
 */
async function setParticipantIsActiveFlag(endpoint, dfspName, value, logger) {
    const payload = { isActive: value };
    return await put(buildUrl('participants', dfspName), payload, { endpoint, logger });
}

module.exports = {
    fundsInReserve,
    fundsOutPrepareReserve,
    getAccountById,
    getAccountByType,
    getParticipantAccounts,
    getParticipantEmailAddresses,
    getNDC,
    getParticipantByAccountId,
    getParticipants,
    getParticipant,
    participantFundsInReserve,
    participantFundsOutPrepareReserve,
    setNDC,
    setParticipantIsActiveFlag,
    updateEmailAddress
};