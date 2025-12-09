#!/usr/bin/env node
import { dockerImage } from './docker.js';
import { createAccount, deployCustomContract, initContract, approveCodehash } from './near.js';
import { deployPhalaWorkflow, getAppUrl } from './phala.js';
import { config } from './config.js';

async function main() {
    // Version check 
    // await versionCheck();

    // Builds and pushes the docker image if in sandbox mode
    if (config.deployment.environment === 'TEE' && config.deployment.docker) {
        dockerImage(config.deployment.docker.tag, config.deployment.docker.cache ? '' : '--no-cache');
    }

    // Create an account for the contract
    if (options.redeploy) {
        const accountCreated = await createAccount(contractId, masterAccount, contractAccount);
        if (!accountCreated) {
            return;
        }

        // Deploy the contract
        let contractDeployed = false;
        if (options.wasm) { // Deploy custom contract
            contractDeployed = await deployCustomContract(contractAccount, options.wasm);
        } else { // Deploy global contract
            contractDeployed = await deployGlobalContract(contractAccount, GLOBAL_CONTRACT_HASH);
        }
        if (!contractDeployed) {
            return;
        }
    }

    // Stop if --contract is set
    if (options.contract) {
        return;
    }

    // Initialize the contract
    if (options.redeploy) {
        const contractInitialized = await initContract(contractAccount, contractId, masterAccount);
        if (!contractInitialized) {
            return;
        }
    }

    // Approve the API codehash
    const apiCodehashApproved = await approveCodehash(masterAccount, contractId, API_CODEHASH);
    if (!apiCodehashApproved) {
        return;
    }

    // Approve the app codehash
    if (IS_SANDBOX) {
        const appCodehashApproved = await approveCodehash(masterAccount, contractId, NEW_APP_CODEHASH);
        if (!appCodehashApproved) {
            return;
        }
        
        if (options.phala) {
            // Deploy the app to Phala Cloud
            const appId = await deployPhalaWorkflow(PHALA_API_KEY, DOCKER_TAG);
            if (!appId) {
                return;
            }
            // Print the endpoint of the app
            if (options.endpoint) {
                await getAppUrl(appId, PHALA_API_KEY);
            }
        }
    } else {
        // Run the API locally
        if (!runApiLocally(API_CODEHASH)) {
            return;
        }
    }
}

main();