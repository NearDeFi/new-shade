use dcap_qvl::{verify, QuoteCollateralV3};
use hex::{decode, encode};
use near_sdk::{
    env::{self, block_timestamp},
    near, require, log,
    store::{IterableMap, IterableSet},
    AccountId, Gas, NearToken, PanicOnDefault, Promise, Timestamp,
    json_types::U64,
};

mod chainsig;
mod collateral;
mod helper;
mod views;

pub type Codehash = String;

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    pub owner_id: AccountId,
    pub approved_codehashes: IterableSet<Codehash>,
    pub agents: IterableMap<AccountId, Agent>,
    pub tee_config: TEEConfig,
    pub mpc_contract_id: AccountId,
}

#[near(serializers = [json])]
pub struct Attestation {
    pub quote_hex: String,
    pub collateral: String,
    pub checksum: String,
    pub tcb_info: String,
}

#[near(serializers = [json, borsh])]
pub struct Agent {
    pub whitelisted: bool,
    pub codehash: Option<Codehash>,
    pub last_verified: Option<Timestamp>,
}

#[near(serializers = [json])]
#[derive(Clone)]
pub struct AgentView {
    pub account_id: AccountId,
    pub whitelisted: bool,
    pub verified: bool,
    pub codehash: Option<Codehash>,
    pub last_verified: Option<U64>,
}

#[near(serializers = [json, borsh])]
#[derive(Clone)]
pub enum TEEConfig {
    OnTransactionVerification,
    IntervalVerification(Timestamp),
    OneTimeVerification,
    NoVerification,
}

#[near]
impl Contract {
    #[init]
    #[private]
    pub fn init(owner_id: AccountId, mpc_contract_id: AccountId, tee_config: TEEConfig) -> Self {
        Self {
            owner_id,
            mpc_contract_id, // Set to v1.signer-prod.testnet for testnet, v1.signer for mainnet
            tee_config,
            approved_codehashes: IterableSet::new(b"a"),
            agents: IterableMap::new(b"b"),
        }
    }

    // Verify an agent, this need to be called by the agent itself
    pub fn verify_agent(&mut self, attestation: Attestation) -> bool {
        // Check that the agent is whitelisted
        self.agents
            .get(&env::predecessor_account_id())
            .expect("Agent needs to be whitelisted first");

        let (codehash, last_verified) = match self.tee_config {
            TEEConfig::OnTransactionVerification => {
                panic!("Attestation on transaction does not require an agent to generally verify");
            }
            TEEConfig::IntervalVerification(_) => {
                // update the last verified timestamp
                let codehash = self.check_attestation(attestation);
                (codehash, Some(block_timestamp()))
            }
            TEEConfig::OneTimeVerification => {
                let codehash = self.check_attestation(attestation);
                (codehash, None)
            }
            TEEConfig::NoVerification => ("not-in-a-tee".to_string(), None),
        };

        self.agents.insert(env::predecessor_account_id(), Agent {
            whitelisted: true,
            codehash: Some(codehash),
            last_verified: last_verified,
        });

        log!("Agent {} verified", env::predecessor_account_id());
        true
    }

    // Request a signature from the contract
    pub fn request_signature(
        &mut self,
        path: String,
        payload: String,
        key_type: String,
        attestation: Option<Attestation>,
    ) -> Promise {
        self.require_verified_agent(attestation);

        self.internal_request_signature(path, payload, key_type)
    }

    // Owner methods

    // Add a new codehash to the approved list
    pub fn approve_codehash(&mut self, codehash: String) {
        self.require_owner();
        self.approved_codehashes.insert(codehash);
    }

    // Remove a codehash from the approved list
    pub fn remove_codehash(&mut self, codehash: String) {
        self.require_owner();
        self.approved_codehashes.remove(&codehash);
    }

    // Whitelist an agent, it will still need to verify
    // Note: This will override any existing entry, including verified agents (will unverify them)
    pub fn whitelist_agent(&mut self, account_id: AccountId) {
        self.require_owner();
        self.agents.insert(account_id, Agent {
            whitelisted: true,
            codehash: None,
            last_verified: None,
        });
    }

    // Remove an agent from the list of agents
    pub fn remove_agent(&mut self, account_id: AccountId) {
        self.require_owner();
        self.agents.remove(&account_id);
    }

    // Update owner ID
    pub fn update_owner_id(&mut self, owner_id: AccountId) {
        self.require_owner();
        self.owner_id = owner_id;
    }

    // Update the MPC contract ID
    pub fn update_mpc_contract_id(&mut self, mpc_contract_id: AccountId) {
        self.require_owner();
        self.mpc_contract_id = mpc_contract_id;
    }
}
