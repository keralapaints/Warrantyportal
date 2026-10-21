// Rules for when a warranty claim may be filed, kept in one place so the
// Claim page lookup (/warranty/verify) and the claim itself (POST /complaints)
// can never disagree.

const CONTACT = "warranty@keralapaints.com or +91 9539 320 999";

// Only these registration statuses may have claims filed against them.
// (Change this list if you decide claims should be allowed earlier or later.)
const CLAIMABLE_STATUSES = ["APPROVED", "WARRANTY_ISSUED"];

const STATUS_MESSAGES = {
  SUBMITTED:
    "Your registration is still being reviewed. You can file a claim once it has been approved. We'll email you as soon as that happens.",
  UNDER_VERIFICATION:
    "Your registration is still being reviewed. You can file a claim once it has been approved. We'll email you as soon as that happens.",
  REJECTED: `This registration wasn't approved, so a claim can't be filed against it. Please contact Kerala Paints at ${CONTACT}.`,
  CANCELLED: `This registration has been cancelled, so a claim can't be filed against it. Please contact Kerala Paints at ${CONTACT}.`,
};

function formatDate(date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

// "4 YEARS" -> 4, "1 YEAR" -> 1, anything unreadable -> null
function warrantyYears(period) {
  const match = String(period || "").match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// The warranty starts when painting is completed (Master Warranty Policy, clause 7).
// If the work was done in phases we use the LATEST completion date, so a later
// phase is never cut short; the company can still review phased jobs by hand.
function warrantyStart(registration) {
  const times = (registration.applications || [])
    .map((a) => (a.paintingCompletionDate ? new Date(a.paintingCompletionDate).getTime() : NaN))
    .filter((t) => !Number.isNaN(t));
  if (times.length) return new Date(Math.max(...times));
  return new Date(registration.purchaseDate || registration.createdAt);
}

function addYears(date, years) {
  const d = new Date(date.getTime());
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d;
}

const dayNumber = (d) => Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86400000);

// Per registered product: when its warranty ends and whether that is already past.
// The last day of the warranty still counts as covered.
function itemCoverage(registration, now = new Date()) {
  const start = warrantyStart(registration);
  return (registration.items || []).map((item) => {
    const years = warrantyYears(item.warrantyPeriod);
    if (years === null) return { product: item.product, expiresOn: null, expired: false }; // period unknown: don't block
    const expiresOn = addYears(start, years);
    return { product: item.product, expiresOn, expired: dayNumber(now) > dayNumber(expiresOn) };
  });
}

// Can this registration have a claim filed against it at all?
function claimEligibility(registration, now = new Date()) {
  const items = itemCoverage(registration, now);

  if (!CLAIMABLE_STATUSES.includes(registration.status)) {
    return {
      claimable: false,
      code: "NOT_APPROVED",
      message: STATUS_MESSAGES[registration.status] || `A claim can't be filed on this registration. Please contact Kerala Paints at ${CONTACT}.`,
      items,
    };
  }

  if (items.length > 0 && items.every((i) => i.expired)) {
    const latest = new Date(Math.max(...items.map((i) => i.expiresOn.getTime())));
    return {
      claimable: false,
      code: "EXPIRED",
      message:
        items.length === 1
          ? `The warranty on ${items[0].product} ended on ${formatDate(latest)}.`
          : `The warranty on every product in this registration has ended (the latest ended on ${formatDate(latest)}).`,
      items,
    };
  }

  return { claimable: true, code: "OK", message: "", items };
}

const norm = (v) => String(v ?? "").trim().toLowerCase();

// The customer chooses products from the registration. We never trust the item
// details they send back: we only use them to work out WHICH registered lines
// they mean, and then copy those lines from the registration itself.
function matchRequestedItems(registration, requested) {
  if (!Array.isArray(requested) || requested.length === 0) {
    return { error: "Select at least one product to claim on." };
  }
  const chosen = [];
  for (const r of requested) {
    if (!r || typeof r !== "object") return { error: "One or more of the selected products isn't on this registration." };
    const index = registration.items.findIndex(
      (it) =>
        norm(it.product) === norm(r.product) &&
        norm(it.packSize) === norm(r.packSize) &&
        norm(it.shadeType) === norm(r.shadeType) &&
        (!Array.isArray(r.batchNumbers) || r.batchNumbers.map(norm).join(",") === (it.batchNumbers || []).map(norm).join(","))
    );
    if (index === -1) return { error: "One or more of the selected products isn't on this registration." };
    if (!chosen.includes(index)) chosen.push(index);
  }
  return { indexes: chosen };
}

module.exports = { CLAIMABLE_STATUSES, claimEligibility, itemCoverage, matchRequestedItems, formatDate };