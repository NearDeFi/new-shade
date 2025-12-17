import { Entry } from '@napi-rs/keyring';

// Service name for the keychain
const SERVICE_NAME = 'shade-agent-cli';

// Check if its needs libsecret for linux

/**
 * Get credentials for a network (testnet or mainnet)
 * @param {string} network - 'testnet' or 'mainnet'
 * @returns {Promise<{accountId: string, privateKey: string} | null>}
 */
export async function getCredentials(network) {
    try {
        const accountEntry = new Entry(SERVICE_NAME, `${network}_account`);
        const keyEntry = new Entry(SERVICE_NAME, `${network}_privateKey`);
        
        const accountId = accountEntry.getPassword();
        const privateKey = keyEntry.getPassword();
        
        // getPassword() returns null if entry doesn't exist
        if (!accountId || !privateKey) {
            return null;
        }
        
        return { accountId, privateKey };
    } catch (error) {
        // If @napi-rs/keyring fails (e.g., libsecret not installed on Linux), throw error
        // The error will be caught and handled by the calling code
        throw error;
    }
}

/**
 * Set credentials for a network (testnet or mainnet)
 * @param {string} network - 'testnet' or 'mainnet'
 * @param {string} accountId - The account ID
 * @param {string} privateKey - The private key
 * @returns {Promise<void>}
 */
export async function setCredentials(network, accountId, privateKey) {
    try {
        const accountEntry = new Entry(SERVICE_NAME, `${network}_account`);
        const keyEntry = new Entry(SERVICE_NAME, `${network}_privateKey`);
        
        accountEntry.setPassword(accountId);
        keyEntry.setPassword(privateKey);
    } catch (error) {
        throw error;
    }
}

/**
 * Delete credentials for a network
 * @param {string} network - 'testnet' or 'mainnet'
 * @returns {Promise<boolean>} - true if credentials were deleted, false if not found
 */
export async function deleteCredentials(network) {
    try {
        const accountEntry = new Entry(SERVICE_NAME, `${network}_account`);
        const keyEntry = new Entry(SERVICE_NAME, `${network}_privateKey`);
        
        // Check if credentials exist before deleting
        const exists = await hasCredentials(network);
        
        // deletePassword() doesn't throw if entry doesn't exist
        accountEntry.deletePassword();
        keyEntry.deletePassword();
        
        return exists;
    } catch (error) {
        throw error;
    }
}

/**
 * Check if credentials exist for a network
 * @param {string} network - 'testnet' or 'mainnet'
 * @returns {Promise<boolean>}
 */
export async function hasCredentials(network) {
    try {
        const credentials = await getCredentials(network);
        return credentials !== null;
    } catch (error) {
        return false;
    }
}

/**
 * Get PHALA_KEY from keychain
 * @returns {Promise<string | null>}
 */
export async function getPhalaKey() {
    try {
        const phalaEntry = new Entry(SERVICE_NAME, 'phala_key');
        const phalaKey = phalaEntry.getPassword();
        return phalaKey;
    } catch (error) {
        // Entry doesn't exist or other error
        return null;
    }
}

/**
 * Set PHALA_KEY in keychain
 * @param {string} phalaKey - The PHALA API key
 * @returns {Promise<void>}
 */
export async function setPhalaKey(phalaKey) {
    try {
        const phalaEntry = new Entry(SERVICE_NAME, 'phala_key');
        phalaEntry.setPassword(phalaKey);
    } catch (error) {
        throw error;
    }
}

/**
 * Check if PHALA_KEY exists
 * @returns {Promise<boolean>}
 */
export async function hasPhalaKey() {
    try {
        const phalaKey = await getPhalaKey();
        return phalaKey !== null;
    } catch (error) {
        return false;
    }
}

/**
 * Delete PHALA_KEY from keychain
 * @returns {Promise<boolean>} - true if key was deleted, false if not found
 */
export async function deletePhalaKey() {
    try {
        const phalaEntry = new Entry(SERVICE_NAME, 'phala_key');
        const exists = await hasPhalaKey();
        phalaEntry.deletePassword();
        return exists;
    } catch (error) {
        throw error;
    }
}
