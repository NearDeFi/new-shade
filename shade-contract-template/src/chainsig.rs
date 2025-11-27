use crate::*;

use near_sdk::ext_contract;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub enum Payload {
    Ecdsa(String),
    Eddsa(String),
}

#[derive(Debug, Serialize)]
pub struct SignRequest {
    pub payload_v2: Payload,
    pub path: String,
    pub domain_id: u64,
}
#[allow(dead_code)]
#[ext_contract(mpc_contract)]
trait MPCContract {
    fn sign(&self, request: SignRequest);
}

const GAS: Gas = Gas::from_tgas(10);
const ATTACHED_DEPOSIT: NearToken = NearToken::from_yoctonear(1);

pub fn internal_request_signature(path: String, payload: String, key_type: String) -> Promise {
    let (payload_v2, domain_id) = match key_type.as_str() {
        "Eddsa" => (Payload::Eddsa(payload), 1),
        _ => (Payload::Ecdsa(payload), 0),
    };

    let request = SignRequest {
        payload_v2,
        path,
        domain_id,
    };

    let account_id = env::current_account_id().to_string();
    let mpc_contract_id = if account_id.ends_with(".testnet") {
        "v1.signer-prod.testnet"
    } else if account_id.ends_with(".near") {
        "v1.signer"
    } else {
        panic!("Contract needs to be deployed to an account ending in .near or .testnet");
    };

    mpc_contract::ext(mpc_contract_id.parse().unwrap())
        .with_static_gas(GAS)
        .with_attached_deposit(ATTACHED_DEPOSIT)
        .sign(request)
}
