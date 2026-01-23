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
 * Converts a byte array to a hex string
 * @param bytes - Byte array to convert
 * @returns Hex string
 */
function bytesToHex(bytes: number[]): string {
  if (bytes.length === 0) {
    return "";
  }
  return Buffer.from(bytes).toString("hex");
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
 * Converts DstackAttestation to a format suitable for JSON serialization to the contract.
 * Converts byte arrays to hex strings for collateral fields that the contract expects as hex.
 * @param attestation - Attestation with arrays
 * @returns Attestation with hex strings for collateral byte arrays
 */
export function attestationForContract(
  attestation: DstackAttestation,
): {
  quote: number[];
  collateral: {
    pck_crl_issuer_chain: string;
    root_ca_crl: string; // hex string
    pck_crl: string; // hex string
    tcb_info_issuer_chain: string;
    tcb_info: string;
    tcb_info_signature: string; // hex string
    qe_identity_issuer_chain: string;
    qe_identity: string;
    qe_identity_signature: string; // hex string
  };
  tcb_info: TcbInfo;
} {
  return {
    quote: attestation.quote,
    collateral: {
      pck_crl_issuer_chain: attestation.collateral.pck_crl_issuer_chain,
      root_ca_crl: bytesToHex(attestation.collateral.root_ca_crl),
      pck_crl: bytesToHex(attestation.collateral.pck_crl),
      tcb_info_issuer_chain: attestation.collateral.tcb_info_issuer_chain,
      tcb_info: attestation.collateral.tcb_info,
      tcb_info_signature: bytesToHex(attestation.collateral.tcb_info_signature),
      qe_identity_issuer_chain: attestation.collateral.qe_identity_issuer_chain,
      qe_identity: attestation.collateral.qe_identity,
      qe_identity_signature: bytesToHex(
        attestation.collateral.qe_identity_signature,
      ),
    },
    tcb_info: attestation.tcb_info,
  };
}

/**
 * Creates a fake/empty DstackAttestation structure with all empty or zero values.
 * This is used when not running in a TEE environment.
 * The contract will accept this if requires_tee is false, or reject it if requires_tee is true.
 * @returns DstackAttestation with all empty/zero values
 */
export function getFakeAttestation(): DstackAttestation {
  // Zero-filled hex strings for required lengths:
  // - 48 bytes = 96 hex characters (for mrtd, rtmr0-3)
  // - 32 bytes = 64 hex characters (for compose_hash, device_id, signatures)
  const ZERO_48_BYTES_HEX = "0".repeat(96); // 48 bytes as hex
  const ZERO_32_BYTES_HEX = "0".repeat(64); // 32 bytes as hex

  return {
    quote: [], // empty array
    collateral: {
      pck_crl_issuer_chain: "",
      root_ca_crl: [], // Empty array - will be converted to hex string before sending
      pck_crl: [], // Empty array - will be converted to hex string before sending
      tcb_info_issuer_chain: "",
      tcb_info: "",
      // For signatures, use zero-filled arrays that match expected length (32 bytes = 64 hex chars)
      tcb_info_signature: new Array(32).fill(0), // 32 bytes of zeros
      qe_identity_issuer_chain: "",
      qe_identity: "",
      qe_identity_signature: new Array(32).fill(0), // 32 bytes of zeros
    },
    tcb_info: {
      mrtd: ZERO_48_BYTES_HEX, // 48 bytes (96 hex chars)
      rtmr0: ZERO_48_BYTES_HEX, // 48 bytes (96 hex chars)
      rtmr1: ZERO_48_BYTES_HEX, // 48 bytes (96 hex chars)
      rtmr2: ZERO_48_BYTES_HEX, // 48 bytes (96 hex chars)
      rtmr3: ZERO_48_BYTES_HEX, // 48 bytes (96 hex chars)
      os_image_hash: "", // Optional field, empty string will be converted to None in Rust
      compose_hash: ZERO_32_BYTES_HEX, // 32 bytes (64 hex chars)
      device_id: ZERO_32_BYTES_HEX, // 32 bytes (64 hex chars)
      app_compose: "",
      event_log: [],
    },
  };
}
