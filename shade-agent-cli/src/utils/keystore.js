import keytar from 'keytar';

// Service name for the keychain
const SERVICE_NAME = 'shade-agent-cli';

// TODO: Add libsecret check for Linux users
// On Linux, keytar requires libsecret to be installed:
//   Debian/Ubuntu: sudo apt-get install libsecret-1-dev
//   Red Hat-based: sudo yum install libsecret-devel
//   Arch Linux: sudo pacman -S libsecret
// We should add a check that detects if libsecret is available and provides
// helpful error messages if it's not installed.

/**
 * Get credentials for a network (testnet or mainnet)
 * @param {string} network - 'testnet' or 'mainnet'
 * @returns {Promise<{accountId: string, privateKey: string} | null>}
 */
export async function getCredentials(network) {
    try {
        const accountId = await keytar.getPassword(SERVICE_NAME, `${network}_account`);
        const privateKey = await keytar.getPassword(SERVICE_NAME, `${network}_privateKey`);
        
        if (!accountId || !privateKey) {
            return null;
        }
        
        return { accountId, privateKey };
    } catch (error) {
        // If keytar fails (e.g., libsecret not installed on Linux), return null
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
        await keytar.setPassword(SERVICE_NAME, `${network}_account`, accountId);
        await keytar.setPassword(SERVICE_NAME, `${network}_privateKey`, privateKey);
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
        const accountDeleted = await keytar.deletePassword(SERVICE_NAME, `${network}_account`);
        const keyDeleted = await keytar.deletePassword(SERVICE_NAME, `${network}_privateKey`);
        return accountDeleted || keyDeleted;
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
        const phalaKey = await keytar.getPassword(SERVICE_NAME, 'phala_key');
        return phalaKey;
    } catch (error) {
        throw error;
    }
}

/**
 * Set PHALA_KEY in keychain
 * @param {string} phalaKey - The PHALA API key
 * @returns {Promise<void>}
 */
export async function setPhalaKey(phalaKey) {
    try {
        await keytar.setPassword(SERVICE_NAME, 'phala_key', phalaKey);
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

