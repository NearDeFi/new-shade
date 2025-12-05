use crate::*;

#[near]
impl Contract {
    // Require the caller to be the owner
    pub(crate) fn require_owner(&mut self) {
        require!(env::predecessor_account_id() == self.owner_id, "Caller is not the owner");
    }

    // Check the attestation is valid 
    pub(crate) fn check_attestation(&mut self, attestation: Attestation) -> Codehash {
        let codehash = collateral::verify_attestation(attestation);
        require!(self.approved_codehashes.contains(&codehash), "Agent's codehash is not approved");
        codehash
    }

    // Require the caller to have a verified agent
    pub(crate) fn require_verified_agent(&mut self, attestation: Option<Attestation>) {
        match self.tee_config {
            TEEConfig::OnTransactionVerification => {
                self
                    .agents
                    .get(&env::predecessor_account_id())
                    .expect("Agent is not whitelisted");
                if attestation.is_none() {
                    panic!("Attestation is required for each transaction");
                }
                self.check_attestation(attestation.unwrap());
            }
            TEEConfig::IntervalVerification(verification_interval) => {
                let agent = self
                    .agents
                    .get(&env::predecessor_account_id())
                    .expect("Agent is not whitelisted");
                let codehash = agent.codehash.as_ref().expect("Agent is not verified");
                require!(self.approved_codehashes.contains(codehash), "Agent's codehash is not approved");

                let last_verified = agent.last_verified.expect("Agent is not verified");
                if block_timestamp() > last_verified + verification_interval {
                    panic!("Agent needs to be verified again");
                }
            }
            TEEConfig::OneTimeVerification => {
                let agent = self
                    .agents
                    .get(&env::predecessor_account_id())
                    .expect("Agent is not whitelisted");
                let codehash = agent.codehash.as_ref().expect("Agent is not verified");
                require!(self.approved_codehashes.contains(codehash), "Agent's codehash is not approved");
            }
            TEEConfig::NoVerification => {
                let agent = self
                    .agents
                    .get(&env::predecessor_account_id())
                    .expect("Agent is not whitelisted");
                require!(agent.codehash.is_some(), "Agent is not verified");
            },
        };
    }

    // Helper for view calls to check if the agent is verified
    pub(crate) fn is_verified_agent(&self, agent_account_id: AccountId) -> bool {
        match self.tee_config {
            TEEConfig::OnTransactionVerification => {
                false
            }
            TEEConfig::IntervalVerification(verification_interval) => {
                let agent = match self.agents.get(&agent_account_id) {
                    Some(agent) => agent,
                    None => return false,
                };
                let codehash = match agent.codehash.as_ref() {
                    Some(codehash) => codehash,
                    None => return false,
                };
                if !self.approved_codehashes.contains(codehash) {
                    return false;
                }
                let last_verified = match agent.last_verified {
                    Some(timestamp) => timestamp,
                    None => return false,
                };
                block_timestamp() < last_verified + verification_interval
            }
            TEEConfig::OneTimeVerification => {
                let agent = match self.agents.get(&agent_account_id) {
                    Some(agent) => agent,
                    None => return false,
                };
                let codehash = match agent.codehash.as_ref() {
                    Some(codehash) => codehash,
                    None => return false,
                };
                self.approved_codehashes.contains(codehash)
            }
            TEEConfig::NoVerification => {
                true
            },
        }
    }



}