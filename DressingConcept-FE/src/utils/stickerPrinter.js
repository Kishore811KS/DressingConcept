import JsBarcode from "jsbarcode";

/**
 * ================================================================
 * PRODUCT STICKER PRINTING
 * ================================================================
 *
 * Printer:
 *   SNBC TVSE LP45 BPLE (gap-sensing thermal label printer)
 *
 * PHYSICAL ROLL / STOCK (from printer driver "Stock" settings):
 *   101.6 mm  wide   (4 inch roll)
 *   25   mm  tall    (= ONE sticker row, NOT the whole sheet)
 *
 * STICKER:
 *   50 mm × 25 mm
 *
 * LAYOUT:
 *
 *   Roll width = 101.6 mm
 *
 *   0.8mm        50mm          50mm        0.8mm
 *   ├─────┬────────────────┬────────────────┬─────┤
 *         │    STICKER 1   │    STICKER 2   │
 *         │     50 × 25    │     50 × 25    │
 *         └────────────────┴────────────────┘
 *
 *   Horizontal gap = 0 mm
 *   Vertical gap   = 2.5 mm (physical gap between label rows)
 *
 * ----------------------------------------------------------------
 * WHY pageHeight = stickerHeight (THIS IS THE FIX)
 * ----------------------------------------------------------------
 * This printer detects each physical label edge with a gap sensor
 * and cuts/advances at the REAL label boundary — it does not care
 * what height Windows/the browser thinks a "page" is.
 *
 * The original code sent one big 152.4mm-tall "page" containing 5
 * rows. Since 152.4mm is not an exact multiple of one row's pitch
 * (25mm sticker + 2.5mm gap = 27.5mm), the printed image and the
 * physical label edges slowly drifted apart from row to row —
 * which is exactly the split/misaligned printing seen in testing.
 *
 * Fix: make every physical "page" exactly ONE label row tall
 * (pageHeight = stickerHeight). MAX_ROWS_PER_PAGE is derived from
 * pageHeight / stickerHeight, so this automatically becomes 1 —
 * every physical label gets its own page, and the printer's gap
 * sensor re-syncs at every single label. Drift can no longer
 * accumulate.
 *
 * The printer driver's Stock must ALSO be created as a single
 * 101.6mm × 25mm label (not 101.6 × 152.4mm) — see chat notes.
 * Both sides (browser + driver) must agree on what one "page" is.
 *
 * IMPORTANT:
 *   Every sticker is positioned absolutely.
 *   This prevents flexbox/browser print reflow from splitting
 *   the sticker content.
 *
 * PRINT:
 *   Scale = 100%
 *   Margins = None
 *   Fit to page = OFF
 *   Headers/Footers = OFF
 */

export const printProductSticker = (
  productOrList,
  options = {}
) => {
  if (!productOrList) return;

  const {
    copies: explicitCopies,

    autoPrint = true,

    storeName = "DRESSING CONCEPTS",

    // ============================================================
    // PHYSICAL PAGE SIZE
    //
    // pageWidth  = actual roll width from the printer driver Stock
    //              (measure the roll to confirm — driver reports
    //              101.6mm / 4 inch).
    //
    // pageHeight defaults to stickerHeight so that ONE physical
    // page = ONE physical label row. Do not set this back to the
    // full sheet height (152.4mm) — that reintroduces the drift
    // bug. If you ever need multiple rows per page again, only do
    // it after confirming the printer driver Stock is defined to
    // match that same multi-row height exactly.
    // ============================================================

    pageWidth = 101.6,
    pageHeight = stickerHeightDefault(options),

    // ============================================================
    // PHYSICAL STICKER SIZE
    // ============================================================

    stickerWidth = 50,
    stickerHeight = 25,

    // ============================================================
    // GAP BETWEEN STICKER ROWS
    // ============================================================

    rowGap = 2.5,

    // ============================================================
    // OPTIONAL POSITION ADJUSTMENTS
    //
    // Keep these as 0 initially.
    // Adjust only if physical printer calibration requires it.
    // ============================================================

    topOffset = 0,
    leftOffset = 0,
  } = options;

  // ==============================================================
  // PRODUCTS
  // ==============================================================

  const products = Array.isArray(productOrList)
    ? productOrList
    : [productOrList];

  if (products.length === 0) return;

  // ==============================================================
  // CONSTANTS
  // ==============================================================

  const PAGE_WIDTH = Number(pageWidth);
  const PAGE_HEIGHT = Number(pageHeight);

  const STICKER_WIDTH = Number(stickerWidth);
  const STICKER_HEIGHT = Number(stickerHeight);

  const ROW_GAP = Number(rowGap);

  // ==============================================================
  // VALIDATION
  // ==============================================================

  if (
    !Number.isFinite(PAGE_WIDTH) ||
    !Number.isFinite(PAGE_HEIGHT) ||
    !Number.isFinite(STICKER_WIDTH) ||
    !Number.isFinite(STICKER_HEIGHT)
  ) {
    console.error("Invalid sticker/page dimensions.");
    return;
  }

  // ==============================================================
  // HORIZONTAL POSITION
  //
  // Roll width = 101.6mm
  // Sticker 1 = 50mm
  // Sticker 2 = 50mm
  //
  // Remaining:
  //
  // 101.6 - 50 - 50 = 1.6mm
  //
  // Left/right = 0.8mm each
  //
  // (If you confirm the roll is actually 105mm, pass
  //  { pageWidth: 105 } in options and this recalculates to the
  //  original 2.5mm margins automatically.)
  // ==============================================================

  const SIDE_SPACE =
    (PAGE_WIDTH - STICKER_WIDTH * 2) / 2;

  const LEFT_STICKER_POSITION =
    SIDE_SPACE;

  const RIGHT_STICKER_POSITION =
    SIDE_SPACE + STICKER_WIDTH;

  // ==============================================================
  // ROWS PER PHYSICAL PAGE
  //
  // With pageHeight = stickerHeight (25mm) by default, this
  // evaluates to 1 — exactly one label row per physical page,
  // matching what the printer's gap sensor actually cuts at.
  // ==============================================================

  const MAX_ROWS_PER_PAGE = Math.max(
    1,
    Math.floor(
      (PAGE_HEIGHT + ROW_GAP) /
      (STICKER_HEIGHT + ROW_GAP)
    )
  );

  // ==============================================================
  // ESCAPE HTML
  // ==============================================================

  const escapeHtml = (value) => {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // ==============================================================
  // PRODUCT CODE
  // ==============================================================

  const getProductCode = (product) => {
    return String(
      product.productCode ||
      product.barcode ||
      product.code ||
      product.sku ||
      product.id ||
      "000000"
    ).trim();
  };

  // ==============================================================
  // PRODUCT NAME
  // ==============================================================

  const getProductName = (product) => {
    return (
      product.name ||
      product.productName ||
      product.description ||
      "Product Item"
    );
  };

  // ==============================================================
  // MRP
  // ==============================================================

  const getMrp = (product) => {
    return Number(
      product.mrp ??
      product.MRP ??
      product.sellPrice ??
      product.price ??
      0
    );
  };

  // ==============================================================
  // SELLING PRICE
  // ==============================================================

  const getSellingPrice = (product) => {
    const candidates = [
      product.discountAmount,
      product.discount_amount,
      product.Selling_Price,
      product["Selling Price"],
      product.sellPrice,
      product.sell_price,
      product.sellingPrice,
      product.price,
    ];
    for (const c of candidates) {
      if (c !== undefined && c !== null && c !== "" && !isNaN(Number(c)) && Number(c) > 0) {
        return Number(c);
      }
    }
    const mrp = getMrp(product);
    return mrp > 0 ? mrp : 0;
  };

  // ==============================================================
  // BARCODE GENERATION
  // ==============================================================

  const generateBarcode = (productCode) => {
    const svgNode =
      document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
      );

    try {
      JsBarcode(svgNode, productCode, {
        format: "CODE128",

        width: 1.5,

        height: 40,

        displayValue: false,

        margin: 0,

        marginTop: 0,
        marginBottom: 0,
        marginLeft: 0,
        marginRight: 0,
      });
    } catch (error) {
      console.error(
        "Barcode generation failed:",
        productCode,
        error
      );
    }

    return svgNode.outerHTML;
  };

  // ==============================================================
  // RENDER ONE EXACT 50 × 25 MM STICKER
  // ==============================================================

  const renderStickerHTML = (product) => {
    if (!product) {
      return `
        <div class="sticker blank-sticker"></div>
      `;
    }

    const productCode =
      getProductCode(product);

    const productName =
      getProductName(product);

    const rawMrp =
      getMrp(product);

    const rawSellingPrice =
      getSellingPrice(product);

    const mrpStr =
      Number.isFinite(rawMrp)
        ? rawMrp.toFixed(2)
        : "0.00";

    const sellingPriceStr =
      Number.isFinite(rawSellingPrice)
        ? rawSellingPrice.toFixed(2)
        : mrpStr;

    const barcodeSvg =
      generateBarcode(productCode);

    return `
      <div class="sticker">

        <!-- ==================================================
             STORE NAME
             ================================================== -->

        <div class="sticker-header">
          ${escapeHtml(storeName)}
        </div>

        <!-- ==================================================
             PRODUCT NAME
             ================================================== -->

        <div
          class="product-name"
          title="${escapeHtml(productName)}"
        >
          ${escapeHtml(productName)}
        </div>

        <!-- ==================================================
             BARCODE
             ================================================== -->

        <div class="barcode-container">
          ${barcodeSvg}
        </div>

        <!-- ==================================================
             BARCODE NUMBER
             ================================================== -->

        <div class="barcode-number">
          ${escapeHtml(productCode)}
        </div>

        <!-- ==================================================
             PRICE
             ================================================== -->

        <div class="price-section">

          <span class="mrp">
            MRP: &#8377;${mrpStr}
          </span>

          <span class="selling-price">
            PRICE: &#8377;${sellingPriceStr}
          </span>

        </div>

      </div>
    `;
  };

  // ==============================================================
  // CREATE ALL LABEL COPIES
  // ==============================================================

  const allLabels = [];

  products.forEach((product) => {
    if (!product) return;

    let totalCopies;

    // ------------------------------------------------------------
    // Explicit copies
    // ------------------------------------------------------------

    if (explicitCopies !== undefined) {
      totalCopies =
        Number(explicitCopies);
    } else {
      // ----------------------------------------------------------
      // Otherwise use product quantity
      // ----------------------------------------------------------

      const quantity =
        parseInt(product.quantity, 10);

      totalCopies =
        quantity > 0
          ? quantity
          : 1;
    }

    // ------------------------------------------------------------
    // Safety
    // ------------------------------------------------------------

    if (
      !Number.isFinite(totalCopies) ||
      totalCopies <= 0
    ) {
      totalCopies = 1;
    }

    totalCopies =
      Math.floor(totalCopies);

    // ------------------------------------------------------------
    // Add copies
    // ------------------------------------------------------------

    for (
      let i = 0;
      i < totalCopies;
      i++
    ) {
      allLabels.push(product);
    }
  });

  if (allLabels.length === 0) return;

  // ==============================================================
  // CREATE TWO STICKERS PER ROW
  //
  // IMPORTANT:
  // We are NOT using flexbox for sticker positioning.
  //
  // Sticker 1:
  //   left = 0.8mm  (SIDE_SPACE, recalculated from PAGE_WIDTH)
  //
  // Sticker 2:
  //   left = 50.8mm
  //
  // This guarantees:
  //
  // 0.8 + 50 + 50 + 0.8 = 101.6mm
  // ==============================================================

  const rows = [];

  for (
    let i = 0;
    i < allLabels.length;
    i += 2
  ) {
    const firstProduct =
      allLabels[i];

    const secondProduct =
      allLabels[i + 1] || null;

    rows.push(`
      <div class="sticker-row">

        ${renderStickerHTML(
      firstProduct
    )}

        ${secondProduct
        ? renderStickerHTML(
          secondProduct
        )
        : `
              <div class="sticker blank-sticker"></div>
            `
      }

      </div>
    `);
  }

  // ==============================================================
  // SPLIT INTO PHYSICAL PAGES
  //
  // With MAX_ROWS_PER_PAGE = 1 (the default), this puts exactly
  // one label row per physical page — one page per printer cut.
  // ==============================================================

  const pages = [];

  for (
    let i = 0;
    i < rows.length;
    i += MAX_ROWS_PER_PAGE
  ) {
    const pageRows =
      rows.slice(
        i,
        i + MAX_ROWS_PER_PAGE
      );

    pages.push(`
      <div class="print-page">

        ${pageRows.join("")}

      </div>
    `);
  }

  const pagesHtml =
    pages.join("");

  // ==============================================================
  // COMPLETE PRINT HTML
  // ==============================================================

  const fullHtmlContent = `
<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8" />

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
/>

<title>
  Dressing Concepts - Product Stickers
</title>

<style>

/* ==============================================================
   GLOBAL RESET
   ============================================================== */

*,
*::before,
*::after {
  box-sizing: border-box;

  margin: 0;
  padding: 0;
}


/* ==============================================================
   PHYSICAL PAGE
   ============================================================== */

@page {
  size: ${PAGE_WIDTH}mm ${PAGE_HEIGHT}mm;

  margin: 0 !important;
}


/* ==============================================================
   HTML / BODY
   ============================================================== */

html,
body {
  width: ${PAGE_WIDTH}mm;

  margin: 0;
  padding: 0;

  font-family:
    Arial,
    "Segoe UI",
    sans-serif;

  color: #000;

  background: #ddd;

  -webkit-print-color-adjust: exact !important;

  print-color-adjust: exact !important;
}


/* ==============================================================
   PREVIEW TOOLBAR
   ============================================================== */

.preview-toolbar {
  position: fixed;

  top: 0;
  left: 0;
  right: 0;

  height: 60px;

  background: #111827;

  color: white;

  display: flex;

  align-items: center;

  justify-content: space-between;

  padding: 8px 20px;

  z-index: 9999;

  font-size: 12px;
}


.info-group {
  display: flex;

  align-items: center;

  gap: 10px;

  flex-wrap: wrap;
}


.printer-badge {
  background: #0284c7;

  padding: 5px 10px;

  border-radius: 4px;

  font-weight: 700;
}


.size-badge,
.layout-badge {
  background: #374151;

  padding: 5px 10px;

  border-radius: 4px;

  font-weight: 600;
}


.print-btn {
  border: none;

  background: #16a34a;

  color: white;

  padding: 9px 18px;

  border-radius: 5px;

  cursor: pointer;

  font-size: 13px;

  font-weight: 700;
}


/* ==============================================================
   PREVIEW CONTAINER
   ============================================================== */

.preview-container {
  margin-top: 75px;

  padding: 20px;

  display: flex;

  flex-direction: column;

  align-items: center;

  gap: 20px;
}


/* ==============================================================
   PHYSICAL PAGE
   ============================================================== */

.print-page {
  position: relative;

  width: ${PAGE_WIDTH}mm;

  height: ${PAGE_HEIGHT}mm;

  box-sizing: border-box;

  margin: 0;

  padding: 0;

  background: white;

  overflow: hidden;

  page-break-after: always;

  break-after: page;

  box-shadow:
    0 4px 15px rgba(0, 0, 0, 0.15);
}


/* ==============================================================
   STICKER ROW
   ============================================================== */

/*
 * IMPORTANT:
 *
 * No flexbox here.
 *
 * Each row is a fixed physical PAGE_WIDTH × 25mm area.
 *
 * Sticker positions are controlled by absolute positioning.
 */

.sticker-row {
  position: relative;

  width: ${PAGE_WIDTH}mm;

  height: ${STICKER_HEIGHT}mm;

  margin:
    0 0 ${ROW_GAP}mm 0;

  padding: 0;

  display: block;

  overflow: hidden;

  box-sizing: border-box;

  page-break-inside: avoid;

  break-inside: avoid;

  flex-shrink: 0;
}


/* ==============================================================
   STICKER
   ============================================================== */

/*
 * EXACT PHYSICAL SIZE:
 *
 * Width  = 50mm
 * Height = 25mm
 *
 * Each sticker is absolutely positioned.
 */

.sticker {
  position: absolute;

  top: 0;

  width: ${STICKER_WIDTH}mm;

  min-width: ${STICKER_WIDTH}mm;

  max-width: ${STICKER_WIDTH}mm;

  height: ${STICKER_HEIGHT}mm;

  min-height: ${STICKER_HEIGHT}mm;

  max-height: ${STICKER_HEIGHT}mm;

  box-sizing: border-box;

  margin: 0;

  padding:
    0.5mm
    1.2mm
    0.3mm
    1.2mm;

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: flex-start;

  text-align: center;

  overflow: hidden;

  background: white;

  page-break-inside: avoid;

  break-inside: avoid;
}


/* ==============================================================
   FIRST STICKER
   ============================================================== */

.sticker-row > .sticker:first-child {
  left:
    ${LEFT_STICKER_POSITION}mm;
}


/* ==============================================================
   SECOND STICKER
   ============================================================== */

.sticker-row > .sticker:nth-child(2) {
  left:
    ${RIGHT_STICKER_POSITION}mm;
}


/* ==============================================================
   BLANK STICKER
   ============================================================== */

.blank-sticker {
  visibility: hidden !important;

  border: none !important;

  background: transparent !important;
}


/* ==============================================================
   STORE NAME
   ============================================================== */

.sticker-header {
  width: 100%;

  height: 2.8mm;

  flex: 0 0 2.8mm;

  font-size: 5.8pt;

  line-height: 2.8mm;

  font-weight: 900;

  text-transform: uppercase;

  white-space: nowrap;

  overflow: hidden;

  text-overflow: ellipsis;

  border-bottom:
    0.2mm solid #000;

  margin: 0;

  padding: 0;
}


/* ==============================================================
   PRODUCT NAME
   ============================================================== */

.product-name {
  width: 100%;

  height: 2.8mm;

  flex: 0 0 2.8mm;

  font-size: 5.8pt;

  line-height: 2.8mm;

  font-weight: 700;

  white-space: nowrap;

  overflow: hidden;

  text-overflow: ellipsis;

  margin: 0;

  padding: 0;
}


/* ==============================================================
   BARCODE CONTAINER
   ============================================================== */

.barcode-container {
  width: 100%;

  height: 7mm;

  flex: 0 0 7mm;

  display: flex;

  align-items: center;

  justify-content: center;

  overflow: hidden;

  margin:
    0.2mm 0 0 0;

  padding: 0;
}


/* ==============================================================
   BARCODE SVG
   ============================================================== */

.barcode-container svg {
  display: block;

  width: auto;

  max-width: 42mm;

  height: 6.5mm;

  max-height: 6.5mm;

  margin: 0;

  padding: 0;
}


/* ==============================================================
   BARCODE NUMBER
   ============================================================== */

.barcode-number {
  width: 100%;

  height: 2.2mm;

  flex: 0 0 2.2mm;

  font-family:
    "Courier New",
    monospace;

  font-size: 4.8pt;

  line-height: 2.2mm;

  font-weight: 700;

  white-space: nowrap;

  overflow: hidden;

  text-align: center;

  margin: 0;

  padding: 0;
}


/* ==============================================================
   PRICE SECTION
   ============================================================== */

.price-section {
  width: 100%;

  height: 5mm;

  flex: 0 0 5mm;

  display: flex;

  flex-direction: column;

  justify-content: center;

  align-items: center;

  border-top:
    0.2mm solid #000;

  margin:
    0.2mm 0 0 0;

  padding: 0;

  line-height: 1;

  overflow: hidden;
}


/* ==============================================================
   MRP
   ============================================================== */

.mrp {
  font-size: 4.8pt;

  line-height: 1.9mm;

  font-weight: 700;

  text-decoration: line-through;

  white-space: nowrap;
}


/* ==============================================================
   SELLING PRICE
   ============================================================== */

.selling-price {
  font-size: 6.8pt;

  line-height: 2.3mm;

  font-weight: 900;

  white-space: nowrap;
}


/* ==============================================================
   PRINT STYLES
   ============================================================== */

@media print {

  /* ------------------------------------------------------------
     PHYSICAL PAGE SIZE
     ------------------------------------------------------------ */

  @page {
    size:
      ${PAGE_WIDTH}mm
      ${PAGE_HEIGHT}mm;

    margin: 0 !important;
  }


  /* ------------------------------------------------------------
     HTML / BODY
     ------------------------------------------------------------ */

  html,
  body {
    width:
      ${PAGE_WIDTH}mm !important;

    height: auto !important;

    margin: 0 !important;

    padding: 0 !important;

    background: white !important;

    overflow: visible !important;

    -webkit-print-color-adjust: exact !important;

    print-color-adjust: exact !important;
  }


  /* ------------------------------------------------------------
     HIDE PREVIEW TOOLBAR
     ------------------------------------------------------------ */

  .preview-toolbar {
    display: none !important;
  }


  /* ------------------------------------------------------------
     PREVIEW CONTAINER
     ------------------------------------------------------------ */

  .preview-container {
    display: block !important;

    width:
      ${PAGE_WIDTH}mm !important;

    margin: 0 !important;

    padding: 0 !important;
  }


  /* ------------------------------------------------------------
     EXACT PHYSICAL PAGE
     ------------------------------------------------------------ */

  .print-page {
    position: relative !important;

    width:
      ${PAGE_WIDTH}mm !important;

    height:
      ${PAGE_HEIGHT}mm !important;

    margin: 0 !important;

    padding: 0 !important;

    overflow: hidden !important;

    background: white !important;

    box-shadow: none !important;

    page-break-after: always !important;

    break-after: page !important;
  }


  .print-page:last-child {
    page-break-after: avoid !important;

    break-after: avoid !important;
  }


  /* ------------------------------------------------------------
     EXACT STICKER ROW
     ------------------------------------------------------------ */

  .sticker-row {
    position: relative !important;

    width:
      ${PAGE_WIDTH}mm !important;

    height:
      ${STICKER_HEIGHT}mm !important;

    margin:
      0 0 ${ROW_GAP}mm 0 !important;

    padding: 0 !important;

    display: block !important;

    overflow: hidden !important;

    box-sizing: border-box !important;

    page-break-inside: avoid !important;

    break-inside: avoid !important;

    flex-shrink: 0 !important;
  }


  /* ------------------------------------------------------------
     EXACT 50 × 25 MM STICKER
     ------------------------------------------------------------ */

  .sticker {
    position: absolute !important;

    top: 0 !important;

    width:
      ${STICKER_WIDTH}mm !important;

    min-width:
      ${STICKER_WIDTH}mm !important;

    max-width:
      ${STICKER_WIDTH}mm !important;

    height:
      ${STICKER_HEIGHT}mm !important;

    min-height:
      ${STICKER_HEIGHT}mm !important;

    max-height:
      ${STICKER_HEIGHT}mm !important;

    box-sizing: border-box !important;

    margin: 0 !important;

    padding:
      0.5mm
      1.2mm
      0.3mm
      1.2mm !important;

    display: flex !important;

    flex-direction: column !important;

    align-items: center !important;

    justify-content: flex-start !important;

    text-align: center !important;

    overflow: hidden !important;

    background: white !important;

    page-break-inside: avoid !important;

    break-inside: avoid !important;
  }


  /* ------------------------------------------------------------
     FIRST STICKER POSITION
     ------------------------------------------------------------ */

  .sticker-row > .sticker:first-child {
    left:
      ${LEFT_STICKER_POSITION}mm !important;
  }


  /* ------------------------------------------------------------
     SECOND STICKER POSITION
     ------------------------------------------------------------ */

  .sticker-row > .sticker:nth-child(2) {
    left:
      ${RIGHT_STICKER_POSITION}mm !important;
  }


  /* ------------------------------------------------------------
     BARCODE CONTAINER
     ------------------------------------------------------------ */

  .barcode-container {
    width: 100% !important;

    height: 7mm !important;

    flex: 0 0 7mm !important;

    display: flex !important;

    align-items: center !important;

    justify-content: center !important;

    overflow: hidden !important;

    margin:
      0.2mm 0 0 0 !important;

    padding: 0 !important;
  }


  /* ------------------------------------------------------------
     BARCODE SVG
     ------------------------------------------------------------ */

  .barcode-container svg {
    display: block !important;

    width: auto !important;

    max-width: 42mm !important;

    height: 6.5mm !important;

    max-height: 6.5mm !important;

    margin: 0 !important;

    padding: 0 !important;
  }


  /* ------------------------------------------------------------
     BLANK STICKER
     ------------------------------------------------------------ */

  .blank-sticker {
    visibility: hidden !important;

    border: none !important;

    background: transparent !important;
  }


  /* ------------------------------------------------------------
     PREVENT CONTENT BREAKING
     ------------------------------------------------------------ */

  .sticker-header,
  .product-name,
  .barcode-container,
  .barcode-number,
  .price-section {
    page-break-inside: avoid !important;

    break-inside: avoid !important;
  }

}

</style>

</head>


<body>


<!-- ============================================================
     PREVIEW TOOLBAR
     ============================================================ -->

<div class="preview-toolbar">

  <div class="info-group">

    <span class="printer-badge">
      🖨️ SNBC TVSE LP45 BPLE
    </span>

    <span class="size-badge">
      Page:
      ${PAGE_WIDTH} × ${PAGE_HEIGHT} mm
    </span>

    <span class="layout-badge">
      Sticker:
      ${STICKER_WIDTH} × ${STICKER_HEIGHT} mm
    </span>

    <span class="layout-badge">
      2 Stickers / Row
    </span>

    <span class="layout-badge">
      Horizontal Gap: 0 mm
    </span>

    <span class="layout-badge">
      Row Gap: ${ROW_GAP} mm
    </span>

  </div>


  <button
    class="print-btn"
    onclick="window.print()"
  >
    🖨️ Print
  </button>

</div>


<!-- ============================================================
     PRINT PREVIEW
     ============================================================ -->

<div class="preview-container">

  ${pagesHtml}

</div>


<!-- ============================================================
     AUTO PRINT
     ============================================================ -->

${autoPrint
      ? `
      <script>

        window.addEventListener(
          "load",
          function () {

            setTimeout(
              function () {

                window.print();

              },
              700
            );

          }
        );

      </script>
    `
      : ""
    }


</body>

</html>
`;

  // ==============================================================
  // OPEN PRINT WINDOW
  // ==============================================================

  let popupWindow = null;

  try {
    popupWindow = window.open(
      "",
      "_blank",
      "width=1000,height=800"
    );
  } catch (error) {
    console.warn(
      "Popup opening failed:",
      error
    );
  }

  // ==============================================================
  // POPUP PRINT
  // ==============================================================

  if (
    popupWindow &&
    !popupWindow.closed
  ) {
    try {
      popupWindow.document.open();

      popupWindow.document.write(
        fullHtmlContent
      );

      popupWindow.document.close();

      return;
    } catch (error) {
      console.warn(
        "Popup printing failed. Using iframe fallback.",
        error
      );
    }
  }

  // ==============================================================
  // IFRAME FALLBACK
  // ==============================================================

  let printFrame =
    document.getElementById(
      "sticker-print-iframe"
    );

  if (!printFrame) {
    printFrame =
      document.createElement("iframe");

    printFrame.id =
      "sticker-print-iframe";

    printFrame.style.position =
      "fixed";

    printFrame.style.right =
      "0";

    printFrame.style.bottom =
      "0";

    printFrame.style.width =
      "0";

    printFrame.style.height =
      "0";

    printFrame.style.border =
      "0";

    printFrame.style.visibility =
      "hidden";

    document.body.appendChild(
      printFrame
    );
  }

  // ==============================================================
  // WRITE INTO IFRAME
  // ==============================================================

  const frameWindow =
    printFrame.contentWindow;

  const frameDocument =
    frameWindow.document;

  frameDocument.open();

  frameDocument.write(
    fullHtmlContent
  );

  frameDocument.close();

  // ==============================================================
  // PRINT AFTER RENDER
  // ==============================================================

  if (autoPrint) {
    setTimeout(
      () => {
        try {
          frameWindow.focus();

          frameWindow.print();
        } catch (error) {
          console.error(
            "Iframe print failed:",
            error
          );
        }
      },
      1000
    );
  }
};

// ==================================================================
// Helper: default pageHeight = one physical label row.
// Lets options.stickerHeight override the row height used for the
// default page size, without requiring pageHeight to be passed
// explicitly every time.
// ==================================================================

function stickerHeightDefault(options) {
  return Number(options.stickerHeight) || 25;
}

export default printProductSticker;