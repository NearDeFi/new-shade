use crate::*;

#[near]
impl Contract {
    // Function to update the contract code
    // Input format: [gas_bytes (8 bytes u64 little-endian)] + [wasm_code_bytes...]
    // See tests/update_contract_tests.rs for an example of how to call this function
    pub fn update_contract(&mut self) -> Promise {
        self.require_owner();

        let input = env::input().expect("Error: No input").to_vec();

        require!(
            input.len() >= 8,
            "Input must be at least 8 bytes: first 8 bytes are gas (u64), followed by WASM code"
        );

        // First 8 bytes are gas (u64 in little-endian)
        let gas_bytes: [u8; 8] = input[0..8].try_into().unwrap();
        let gas_tgas = u64::from_le_bytes(gas_bytes);

        // Rest is the WASM code
        let code = input[8..].to_vec();

        require!(!code.is_empty(), "WASM code cannot be empty");

        Promise::new(env::current_account_id())
            .deploy_contract(code)
            .function_call(
                "migrate".to_string(),
                b"".to_vec(),
                NearToken::from_near(0),
                Gas::from_tgas(gas_tgas),
            )
            .as_return()
    }
}
