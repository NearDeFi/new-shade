import type { DstackAttestation, TcbInfo, Collateral, EventLog } from "./tee";
import type {
  TcbInfoV05x as DstackTcbInfo,
  EventLog as DstackEventLog,
} from "@phala/dstack-sdk";

// Raw collateral response from the endpoint (hex strings for binary fields)
interface RawCollateral {
  pck_crl_issuer_chain?: string;
  root_ca_crl?: string; // hex string
  pck_crl?: string; // hex string
  tcb_info_issuer_chain?: string;
  tcb_info?: string;
  tcb_info_signature?: string; // hex string
  qe_identity_issuer_chain?: string;
  qe_identity?: string;
  qe_identity_signature?: string; // hex string
}

/**
 * Safely decodes a hex string to a byte array
 * @param hexStr - Hex string to decode
 * @returns Byte array as number[]
 * @throws Error if hex string is invalid
 */
function hexToBytes(hexStr: string | undefined): number[] {
  if (!hexStr || hexStr === "") {
    return [];
  }
  try {
    return Array.from(Buffer.from(hexStr, "hex"));
  } catch (error) {
    throw new Error(
      `Failed to decode hex string: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Transforms a quote from hex string to bytes array
 * @param quoteHex - Quote as hex string (may have 0x prefix)
 * @returns Quote as bytes array
 */
export function transformQuote(quoteHex: string): number[] {
  const cleanedHex = quoteHex.replace(/^0x/, "");
  return Array.from(Buffer.from(cleanedHex, "hex"));
}

/**
 * Transforms raw collateral response from the endpoint to Collateral structure
 * @param rawCollateral - Raw collateral from the endpoint (hex strings for binary fields)
 * @returns Collateral structure matching the contract interface
 */
export function transformCollateral(rawCollateral: RawCollateral): Collateral {
  return {
    pck_crl_issuer_chain: rawCollateral.pck_crl_issuer_chain || "",
    root_ca_crl: hexToBytes(rawCollateral.root_ca_crl),
    pck_crl: hexToBytes(rawCollateral.pck_crl),
    tcb_info_issuer_chain: rawCollateral.tcb_info_issuer_chain || "",
    tcb_info: rawCollateral.tcb_info || "",
    tcb_info_signature: hexToBytes(rawCollateral.tcb_info_signature),
    qe_identity_issuer_chain: rawCollateral.qe_identity_issuer_chain || "",
    qe_identity: rawCollateral.qe_identity || "",
    qe_identity_signature: hexToBytes(rawCollateral.qe_identity_signature),
  };
}

/**
 * Transforms dstack TcbInfo to contract interface TcbInfo structure
 * @param dstackTcbInfo - TcbInfo from dstack SDK
 * @returns TcbInfo structure matching the contract interface
 */
export function transformTcbInfo(dstackTcbInfo: DstackTcbInfo): TcbInfo {
  return {
    mrtd: dstackTcbInfo.mrtd || "",
    rtmr0: dstackTcbInfo.rtmr0 || "",
    rtmr1: dstackTcbInfo.rtmr1 || "",
    rtmr2: dstackTcbInfo.rtmr2 || "",
    rtmr3: dstackTcbInfo.rtmr3 || "",
    os_image_hash: dstackTcbInfo.os_image_hash || "",
    compose_hash: dstackTcbInfo.compose_hash || "",
    device_id: dstackTcbInfo.device_id || "",
    app_compose: dstackTcbInfo.app_compose || "",
    event_log: (dstackTcbInfo.event_log || []).map(
      (event: DstackEventLog): EventLog => ({
        imr: event.imr,
        event_type: event.event_type,
        digest: event.digest,
        event: event.event,
        event_payload: event.event_payload,
      }),
    ),
  };
}

/**
 * Creates a fake/empty DstackAttestation structure with all empty or zero values.
 * This is used when not running in a TEE environment.
 * The contract will accept this if requires_tee is false, or reject it if requires_tee is true.
 * @returns DstackAttestation with all empty/zero values
 */
export function getFakeAttestation(): DstackAttestation {
  return {
    quote: [], // empty array
    collateral: {
      pck_crl_issuer_chain: "",
      root_ca_crl: [],
      pck_crl: [],
      tcb_info_issuer_chain: "",
      tcb_info: "",
      tcb_info_signature: [],
      qe_identity_issuer_chain: "",
      qe_identity: "",
      qe_identity_signature: [],
    },
    tcb_info: {
      mrtd: "",
      rtmr0: "",
      rtmr1: "",
      rtmr2: "",
      rtmr3: "",
      os_image_hash: "",
      compose_hash: "",
      device_id: "",
      app_compose: "",
      event_log: [],
    },
  };
}
