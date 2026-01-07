use crate::*;

#[near]
impl Contract {
    // Function to update the contract code
    // Review https://docs.near.org/smart-contracts/release/upgrade for more details
    pub fn update_contract(&self) -> Promise {
        assert!(
            env::predecessor_account_id() == self.owner_id,
            "Only the owner can update the code"
        );

        let code = env::input().expect("Error: No input").to_vec();

        Promise::new(env::current_account_id())
            .deploy_contract(code)
            .as_return()
    }
}
