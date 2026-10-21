// Builds the customer's "Warranty Registration Acknowledgement" PDF in the browser
// from the data they just submitted — nothing is sent to or stored on the server.

const NAVY = [11, 31, 58];
const TEAL = [15, 138, 128];
const INK = [11, 31, 42];
const MUTED = [86, 105, 122];
const LINE = [214, 224, 224];
const TINT = [232, 245, 243];

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;

// jsPDF's built-in fonts only cover Latin characters. Anything else would print
// as garbage, so swap it for "?" and tell the reader (see `lossy` below).
function makeSanitizer() {
  const state = { lossy: false };
  const clean = (value) => {
    const text = String(value ?? "").replace(/\s+/g, " ").trim();
    return text.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, () => {
      state.lossy = true;
      return "?";
    });
  };
  return { clean, state };
}

function fmtDate(value) {
  if (!value) return "";
  const d = new Date(String(value).length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function buildWarrantyPdf(JsPDF, { token, status, form, claimUrl }) {
  const doc = new JsPDF({ unit: "pt", format: "a4" });
  const { clean, state } = makeSanitizer();
  let y = 0;

  const setColor = (rgb) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  const ensureSpace = (needed) => {
    if (y + needed > PAGE_H - 70) {
      doc.addPage();
      y = 48;
    }
  };

  // ---- Header band ----
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, 86, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  setColor([255, 255, 255]);
  doc.text("KERALA PAINTS", MARGIN, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Warranty Registration Acknowledgement", MARGIN, 60);
  doc.setFontSize(8.5);
  doc.text("Kerala Paints Industries Private Limited", PAGE_W - MARGIN, 40, { align: "right" });
  doc.text("Healthy Paint  |  Healthy Living", PAGE_W - MARGIN, 54, { align: "right" });

  y = 112;

  // ---- Reference ----
  setColor(MUTED);
  doc.setFontSize(9);
  doc.text("REGISTRATION REFERENCE", MARGIN, y);
  y += 24;
  doc.setFont("courier", "bold");
  doc.setFontSize(24);
  setColor(TEAL);
  doc.text(clean(token), MARGIN, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColor(MUTED);
  doc.text(`Submitted: ${fmtDate(new Date().toISOString())}`, PAGE_W - MARGIN, y - 14, { align: "right" });
  const statusLabel = clean(String(status || "SUBMITTED").replace(/_/g, " ")).toLowerCase();
  doc.text(`Status: ${statusLabel} - under review`, PAGE_W - MARGIN, y, { align: "right" });
  y += 22;

  // ---- Claim box ----
  const boxH = 96;
  doc.setFillColor(...TINT);
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.8);
  doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 6, 6, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setColor(TEAL);
  doc.text("TO CLAIM YOUR WARRANTY, KEEP THESE TWO DETAILS", MARGIN + 16, y + 22);

  const colX2 = MARGIN + CONTENT_W / 2 + 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setColor(MUTED);
  doc.text("Invoice number", MARGIN + 16, y + 44);
  doc.text("Registered mobile number", colX2, y + 44);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  setColor(INK);
  doc.text(clean(form.invoiceNumber) || "-", MARGIN + 16, y + 64);
  doc.text(clean(form.mobileNumber) || "-", colX2, y + 64);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setColor(MUTED);
  doc.text(`File a claim at: ${clean(claimUrl)}`, MARGIN + 16, y + 84);
  y += boxH + 26;

  // ---- Helpers for sections ----
  const sectionTitle = (title) => {
    ensureSpace(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setColor(TEAL);
    doc.text(title.toUpperCase(), MARGIN, y);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.6);
    doc.line(MARGIN, y + 6, PAGE_W - MARGIN, y + 6);
    y += 24;
  };

  // Two-column list of label/value pairs; skips empty values.
  const pairs = (rows) => {
    const visible = rows.filter(([, v]) => clean(v));
    const colW = CONTENT_W / 2 - 10;
    for (let i = 0; i < visible.length; i += 2) {
      const left = visible[i];
      const right = visible[i + 1];
      const lines = (pair) =>
        pair ? doc.setFont("helvetica", "normal").setFontSize(10).splitTextToSize(clean(pair[1]), colW) : [];
      const leftLines = lines(left);
      const rightLines = lines(right);
      const h = 12 + Math.max(leftLines.length, rightLines.length) * 13 + 8;
      ensureSpace(h);

      const draw = (pair, ls, x) => {
        if (!pair) return;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        setColor(MUTED);
        doc.text(pair[0], x, y);
        doc.setFontSize(10);
        setColor(INK);
        doc.text(ls, x, y + 13);
      };
      draw(left, leftLines, MARGIN);
      draw(right, rightLines, MARGIN + CONTENT_W / 2 + 10);
      y += h;
    }
    y += 4;
  };

  // ---- Customer ----
  sectionTitle("Customer");
  pairs([
    ["Name", form.customerName],
    ["Mobile number", form.mobileNumber],
    ["Alternate mobile", form.alternateMobile],
    ["Email", form.email],
    ["Customer type", form.customerType],
  ]);

  // ---- Site ----
  sectionTitle("Site");
  const address = [form.houseNo, form.street].filter((v) => clean(v)).join(", ");
  pairs([
    ["Site / building", form.siteName],
    ["Address", address],
    ["Panchayat / municipality / corporation", form.panchayat],
    ["District / state", [form.siteDistrict, form.siteState].filter(Boolean).join(", ")],
    ["PIN code", form.pincode],
    ["Property type", form.propertyType],
    ["Painting type", form.paintingType],
    ["Approx. building age", form.buildingAge ? `${form.buildingAge} years` : ""],
  ]);

  // ---- Purchase ----
  sectionTitle("Purchase");
  pairs([
    ["Purchase date", fmtDate(form.purchaseDate)],
    ["Invoice number", form.invoiceNumber],
    ["Outlet / dealer", form.outlet],
    ["District / state", [form.purchaseDistrict, form.purchaseState].filter(Boolean).join(", ")],
  ]);

  // ---- Products table ----
  sectionTitle("Products registered");
  const cols = [
    { label: "Product", w: 135 },
    { label: "Pack size", w: 55 },
    { label: "Containers", w: 58 },
    { label: "Shade", w: 70 },
    { label: "Batch number(s)", w: 112 },
    { label: "Warranty", w: 85 },
  ];
  const drawHeaderRow = () => {
    doc.setFillColor(...NAVY);
    doc.rect(MARGIN, y - 12, CONTENT_W, 20, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    setColor([255, 255, 255]);
    let x = MARGIN + 6;
    cols.forEach((c) => {
      doc.text(c.label, x, y + 1);
      x += c.w;
    });
    y += 20;
  };
  drawHeaderRow();
  (form.items || []).forEach((it, idx) => {
    const cells = [
      clean(it.product),
      clean(it.packSize),
      clean(it.containers),
      clean(it.shadeType),
      clean(Array.isArray(it.batchNumbers) ? it.batchNumbers.join(", ") : it.batchNumbersText),
      clean(it.warrantyPeriod || it.warranty || ""),
    ];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const wrapped = cells.map((c, i) => doc.splitTextToSize(c || "-", cols[i].w - 8));
    const rowH = Math.max(...wrapped.map((w) => w.length)) * 12 + 10;
    if (y + rowH > PAGE_H - 70) {
      doc.addPage();
      y = 56;
      drawHeaderRow();
    }
    if (idx % 2 === 0) {
      doc.setFillColor(246, 250, 250);
      doc.rect(MARGIN, y - 10, CONTENT_W, rowH, "F");
    }
    setColor(INK);
    let x = MARGIN + 6;
    wrapped.forEach((lines, i) => {
      doc.text(lines, x, y + 1);
      x += cols[i].w;
    });
    y += rowH;
  });
  y += 14;

  // ---- Application ----
  if ((form.applications || []).length) {
    sectionTitle("Application");
    form.applications.forEach((a, i) => {
      ensureSpace(60);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      setColor(INK);
      doc.text(`${i + 1}. ${clean(a.applicationArea)} - ${fmtDate(a.paintingStartDate)} to ${fmtDate(a.paintingCompletionDate)}`, MARGIN, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setColor(MUTED);
      const detail = [
        a.paintedAreaSqft ? `${clean(a.paintedAreaSqft)} sq ft` : "",
        a.topcoats ? `${clean(a.topcoats)} topcoat(s)` : "",
        a.applicationMethod ? clean(a.applicationMethod) : "",
        a.painterName ? `Painter: ${clean(a.painterName)}${a.painterMobile ? ` (${clean(a.painterMobile)})` : ""}` : "",
      ]
        .filter(Boolean)
        .join("   |   ");
      const lines = doc.splitTextToSize(detail, CONTENT_W);
      doc.text(lines, MARGIN, y);
      y += lines.length * 12 + 10;
    });
    y += 2;
  }

  // ---- Painting system ----
  const system = [];
  if (form.puttyUsed) system.push(`Putty: ${clean(form.puttyUsed)}${form.puttyUsed === "Yes" && form.puttyBrand ? ` (${clean(form.puttyBrand)})` : ""}`);
  if (form.primerUsed) {
    const brand = [form.primerBrand, form.primerProductName].filter((v) => clean(v)).map(clean).join(" ");
    system.push(`Primer: ${clean(form.primerUsed)}${form.primerUsed === "Yes" && brand ? ` (${brand})` : ""}`);
  }
  if (form.baseCoatUsed) system.push(`Base coat / sealer: ${clean(form.baseCoatUsed)}${form.baseCoatUsed === "Yes" && form.baseCoatDetails ? ` (${clean(form.baseCoatDetails)})` : ""}`);
  if (system.length) {
    sectionTitle("Painting system");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setColor(INK);
    const lines = doc.splitTextToSize(system.join("     "), CONTENT_W);
    ensureSpace(lines.length * 13 + 10);
    doc.text(lines, MARGIN, y);
    y += lines.length * 13 + 14;
  }

  // ---- What happens next ----
  ensureSpace(110);
  y += 4;
  doc.setFillColor(248, 250, 250);
  doc.setDrawColor(...LINE);
  doc.roundedRect(MARGIN, y, CONTENT_W, 92, 6, 6, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  setColor(NAVY);
  doc.text("What happens next", MARGIN + 14, y + 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColor(INK);
  const next = doc.splitTextToSize(
    "Your registration is now under review. This document acknowledges that it was received - it is not the approval. " +
      "You will be emailed at the address above once it is approved. To raise a claim later, use the Claim Warranty page " +
      "with the invoice number and mobile number shown at the top of this document. Please keep your original purchase invoice.",
    CONTENT_W - 28
  );
  doc.text(next, MARGIN + 14, y + 36);
  y += 92;

  if (state.lossy) {
    y += 14;
    ensureSpace(24);
    doc.setFontSize(8);
    setColor(MUTED);
    doc.text(
      "Note: some details were entered using characters this PDF cannot display (shown as ?). They are saved correctly in your registration.",
      MARGIN,
      y,
      { maxWidth: CONTENT_W }
    );
  }

  // ---- Footer on every page ----
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.6);
    doc.line(MARGIN, PAGE_H - 52, PAGE_W - MARGIN, PAGE_H - 52);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    setColor(MUTED);
    doc.text(
      "Subject to the Kerala Paints Master Warranty Policy (KP-MWP-01/2026) and the applicable product-specific terms.",
      MARGIN,
      PAGE_H - 38
    );
    doc.text("warranty@keralapaints.com  |  +91 9539 320 999  |  www.keralapaints.com", MARGIN, PAGE_H - 27);
    doc.text(`Page ${p} of ${pages}`, PAGE_W - MARGIN, PAGE_H - 27, { align: "right" });
  }

  return doc;
}

export async function downloadWarrantyPdf({ token, status, form, claimUrl }) {
  // Loaded on demand so the PDF library isn't part of the main bundle.
  const { jsPDF } = await import("jspdf");
  const doc = buildWarrantyPdf(jsPDF, { token, status, form, claimUrl });
  doc.save(`Warranty-Registration-${String(token).replace(/[^A-Za-z0-9-]/g, "")}.pdf`);
}