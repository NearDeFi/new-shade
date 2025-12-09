import fs from 'fs';
import { NEAR } from '@near-js/tokens';
import { config } from './config.js';

// Sleep for the specified number of milliseconds
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function tgasToGas(tgas) {
    return BigInt(tgas) * BigInt(1000000000000);
}

export async function createAccount(contractId, masterAccount, contractAccount) {
    // Use only the first provider for existence check to avoid failover on AccountDoesNotExist
    // Check if the contract account exists and delete it if it does
    try {
        await contractAccount.getBalance();
        console.log("Account already exists, deleting...");
        await contractAccount.deleteAccount(masterAccount.accountId);
        console.log("Account deleted successfully");
        await sleep(1000);
    } catch (e) {
        if (e.type === 'AccountDoesNotExist') {
            console.log("Account does not exist, creating new one...");
        } else {
            console.log('Error checking account existence', e);
            await contractAccount.deleteAccount(masterAccount.accountId);
            console.log("Account deleted successfully");
            await sleep(1000);
        }
    }

    // Create the contract account
    try {
        console.log('Creating account...');
        await masterAccount.createAccount(
            contractId,
            await masterAccount.getSigner().getPublicKey(),
            NEAR.toUnits(config.deployment.deploy_custom.funding_amount),
        );
        console.log('Contract account created:', contractId);
        await sleep(1000);
        return true;
    } catch (e) {
        console.log('Error creating account', e);
        return false;
    }
}

export async function deployCustomContract(contractAccount, wasmPath) {
    try {
        // Deploys the contract bytes (requires more funding)
        const file = fs.readFileSync(wasmPath);
        await contractAccount.deployContract(file);
        console.log('Custom contract deployed:', contractAccount.accountId);
        await sleep(1000);
        return true;
    } catch (e) {
        console.log('Error deploying custom contract', e);
        return false;
    }
}

export async function initContract(contractAccount, contractId, masterAccount) {
    // Initializes the contract based on deployment config
    try {
        const initCfg = config.deployment.deploy_custom?.init;
        if (!initCfg) {
            throw new Error('Missing init configuration in deployment');
        }

        const methodName = initCfg.method_name;
        const args =
            typeof initCfg.args === 'string'
                ? JSON.parse(initCfg.args)
                : initCfg.args;

        const initRes = await contractAccount.callFunctionRaw({
            contractId,
            methodName,
            args,
            gas: tgasToGas(initCfg.tgas),
        });
        console.log('Contract initialized:', initRes.status.SuccessValue === '');
        await sleep(1000);
        return true;
    } catch (e) {
        console.log('Error initializing contract', e);
        return false;
    }
}

export async function approveCodehash(masterAccount, contractId, codehash) {
    // Approves the specified codehash based on deployment config
    try {
        const approveCfg = config.deployment.approve_codehash;
        if (!approveCfg) {
            throw new Error('Missing approve_codehash configuration in deployment');
        }

        const args =
            typeof approveCfg.args === 'string'
                ? JSON.parse(approveCfg.args)
                : approveCfg.args;

        const approveRes = await masterAccount.callFunctionRaw({
            contractId,
            methodName: approveCfg.method_name,
            args,
            gas: tgasToGas(approveCfg.tgas),
        });
        console.log('Codehash approved:', approveRes.status.SuccessValue === '');
        await sleep(1000);
        return true;
    } catch (e) {
        console.log('Error approving codehash', e);
        return false;
    }
}