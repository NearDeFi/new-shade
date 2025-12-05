use crate::*;

#[near]
impl Contract {
    // Get the TEE configuration
    pub fn get_tee_config(&self) -> TEEConfig {
        self.tee_config.clone()
    }

    // Get the list of approved codehashes
    pub fn get_approved_codehashes(
        &self,
        from_index: &Option<u32>,
        limit: &Option<u32>,
    ) -> Vec<String> {
        let from = from_index.unwrap_or(0);
        let limit = limit.unwrap_or(self.approved_codehashes.len() as u32);

        self.approved_codehashes
            .iter()
            .skip(from as usize)
            .take(limit as usize)
            .map(|codehash| codehash.clone())
            .collect()
    }

    // Get the details of an agent
    pub fn get_agent(&self, account_id: AccountId) -> Option<AgentView> {
        self.agents.get(&account_id).map(|agent| AgentView {
            account_id: account_id.clone(),
            verified: self.is_verified_agent(account_id.clone()),
            whitelisted: agent.whitelisted,
            codehash: agent.codehash.clone(),
            last_verified: agent.last_verified.map(|t| U64::from(t)),
        })
    }

    // Get the list of agents and their details
    pub fn get_agents(&self, from_index: &Option<u32>, limit: &Option<u32>) -> Vec<AgentView> {
        let from = from_index.unwrap_or(0);
        let limit = limit.unwrap_or(self.agents.len() as u32);

        self.agents
            .iter()
            .skip(from as usize)
            .take(limit as usize)
            .map(|(account_id, agent)| AgentView {
                account_id: account_id.clone(),
                verified: self.is_verified_agent(account_id.clone()),
                whitelisted: agent.whitelisted,
                codehash: agent.codehash.clone(),
                last_verified: agent.last_verified.map(|t| U64::from(t)),
            })
            .collect()
    }
}