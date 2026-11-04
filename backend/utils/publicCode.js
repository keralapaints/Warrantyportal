// Customer codes are the staff running numbers in SCRAMBLED form.
//
//   staff number   WR-2026-0020        (staff see this; counts up in order)
//   customer code  WR-K7M4-9QXD        (customers see this; looks random)
//
// The scrambling is a keyed, reversible mix (a small encryption). That means:
//   - the same staff number ALWAYS gives the same customer code, and the code can
//     always be turned back into exactly that staff number (decodePublicCode);
//   - two different staff numbers can never give the same customer code, so codes
//     are unique by construction;
//   - nobody without the secret key can work out how many registrations/claims
//     exist, or guess another person's code, because the codes show no order.
//
// The secret key is PUBLIC_CODE_SECRET (set it once in Render and never change it:
// changing it would make new codes disagree with codes already given out).

const crypto = require("crypto");

// Letters and digits that are hard to mix up when read out over the phone:
// no 0/O, no 1/I/L. 31 characters.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const BASE = ALPHABET.length; // 31
const HALF = BASE ** 4; // each half of the code is 4 characters = 923,521 values
const ROUNDS = 8;

// Staff number = prefix + year + running number. We fold year and running number
// into one number, scramble it, and write it as 8 characters.
const BASE_YEAR = 2020;
const MAX_YEAR = 2200;
const SEQ_LIMIT = 10_000_000; // up to 9,999,999 per kind per year

let warned = false;
function secret() {
  const s = process.env.PUBLIC_CODE_SECRET || process.env.JWT_SECRET;
  if (!s) throw new Error("PUBLIC_CODE_SECRET is not set");
  if (!process.env.PUBLIC_CODE_SECRET && !warned) {
    warned = true;
    console.warn(
      "WARNING: PUBLIC_CODE_SECRET is not set, so customer codes are being made with JWT_SECRET. " +
        "Set a separate PUBLIC_CODE_SECRET and never change it afterwards."
    );
  }
  return s;
}

const mod = (a) => ((a % HALF) + HALF) % HALF;

// The scrambling function used inside each round. `prefix` is mixed in so a claim
// and a registration with the same running number get different codes.
function mix(prefix, round, x) {
  const h = crypto.createHmac("sha256", secret()).update(`${prefix}:${round}:${x}`).digest();
  return h.readUIntBE(0, 6) % HALF;
}

function scramble(prefix, left, right) {
  for (let i = 0; i < ROUNDS; i += 1) [left, right] = [right, mod(left + mix(prefix, i, right))];
  return [left, right];
}

function unscramble(prefix, left, right) {
  for (let i = ROUNDS - 1; i >= 0; i -= 1) [left, right] = [mod(right - mix(prefix, i, left)), left];
  return [left, right];
}

function toChars(value) {
  let out = "";
  for (let i = 0; i < 4; i += 1) {
    out = ALPHABET[value % BASE] + out;
    value = Math.floor(value / BASE);
  }
  return out;
}

function fromChars(text) {
  let value = 0;
  for (const ch of text) value = value * BASE + ALPHABET.indexOf(ch);
  return value;
}

// "WR-2026-0020"  ->  "WR-K7M4-9QXD"
function encodePublicCode(staffNumber) {
  const m = /^(WR|KP|LI)-(\d{4})-(\d+)$/.exec(String(staffNumber || "").trim());
  if (!m) throw new Error(`Not a staff number: ${staffNumber}`);
  const [, prefix, yearText, seqText] = m;
  const year = Number(yearText);
  const seq = Number(seqText);
  if (year < BASE_YEAR || year > MAX_YEAR || seq < 1 || seq >= SEQ_LIMIT) {
    throw new Error(`Staff number out of range: ${staffNumber}`);
  }
  const n = (year - BASE_YEAR) * SEQ_LIMIT + seq;
  const [left, right] = scramble(prefix, Math.floor(n / HALF), n % HALF);
  return `${prefix}-${toChars(left)}-${toChars(right)}`;
}

// "WR-K7M4-9QXD"  ->  { prefix: "WR", staffNumber: "WR-2026-0020", ... }   (or null if it isn't a real code)
function decodePublicCode(code) {
  const m = new RegExp(`^(WR|KP|LI)-([${ALPHABET}]{4})-([${ALPHABET}]{4})$`).exec(String(code || "").trim().toUpperCase());
  if (!m) return null;
  const [, prefix, a, b] = m;
  const [left, right] = unscramble(prefix, fromChars(a), fromChars(b));
  const n = left * HALF + right;
  const year = BASE_YEAR + Math.floor(n / SEQ_LIMIT);
  const seq = n % SEQ_LIMIT;
  if (year > MAX_YEAR || seq < 1) return null; // scrambles to nothing sensible: not one of our codes
  return { prefix, year, sequence: seq, staffNumber: `${prefix}-${year}-${String(seq).padStart(4, "0")}` };
}

module.exports = { encodePublicCode, decodePublicCode, ALPHABET };