import JsBarcode from "jsbarcode";

/**
 * Print Product Sticker formatted and optimized for SNBC TVSE LP45 BPLE Thermal Printer
 * 
 * Hardware & Print Preferences:
 * - Printer: SNBC TVSE LP45 BPLE
 * - Stock Size: USER 101.6 mm × 152.4 mm (4 × 6 inch)
 * - Orientation: Portrait
 * - Print Method: Thermal Transfer (203 DPI)
 * - Media Type: Labels With Gaps
 * - Gap Height: 3.1 mm (Gap Offset: 0.0 mm)
 * - Post Print Action: Tear Off
 * 
 * @param {Object|Array} productOrList - Single product object or array of products
 * @param {Object} options - Print options
 * @param {'4x6'|'2up'|'1up'} [options.layout='4x6'] - Layout format ('4x6' default for SNBC TVSE LP45 BPLE)
 * @param {number} [options.copies] - Number of sticker copies to print (defaults to item quantity or 1)
 * @param {boolean} [options.autoPrint=true] - Automatically trigger browser print dialog
 * @param {string} [options.storeName='DRESSING CONCEPTS'] - Header store name
 */
export const printProductSticker = (productOrList, options = {}) => {
  if (!productOrList) return;

  const {
    layout = "4x6",
    copies: explicitCopies,
    autoPrint = true,
    storeName = "DRESSING CONCEPTS"
  } = options;

  const products = Array.isArray(productOrList) ? productOrList : [productOrList];
  if (products.length === 0) return;

  const is4x6 = layout === "4x6" || layout === "snbc-lp45";
  const is2Up = layout === "2up";

  const pageWidth = is4x6 ? "101.6mm" : (is2Up ? "100mm" : "50mm");
  const pageHeight = is4x6 ? "152.4mm" : "25mm";

  /**
   * Render 4x6 inch (101.6mm x 152.4mm) portrait sticker layout for SNBC TVSE LP45 BPLE
   * Preserves exact text elements, CODE128 barcode, centered text, equal margins, millimeter units
   */
  const render4x6StickerHTML = (product) => {
    if (!product) {
      return `<div class="sticker-4x6 blank-cell"></div>`;
    }

    const productCode = String(
      product.productCode || product.barcode || product.code || product.sku || product.id || "000000"
    ).trim();

    const productName =
      product.name || product.productName || product.description || "Product Item";

    const rawMrp = Number(product.mrp || product.MRP || product.sellPrice || product.price || 0);
    const rawSell = Number(
      product.sellPrice || product.discountAmount || product.sellingPrice || product.price || rawMrp
    );

    const mrpStr = rawMrp > 0 ? rawMrp.toFixed(2) : "0.00";
    const sellStr = rawSell > 0 ? rawSell.toFixed(2) : mrpStr;

    // Generate high-resolution CODE128 vector barcode for 203 DPI thermal head
    const svgNode = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    try {
      JsBarcode(svgNode, productCode, {
        format: "CODE128",
        width: 2.6,       // 2.6px bar width for 101.6mm portrait thermal printing
        height: 90,       // 90px height (~26mm)
        displayValue: false,
        margin: 0,
      });
    } catch (err) {
      console.error("JsBarcode error for code:", productCode, err);
    }
    const barcodeSvgHtml = svgNode.outerHTML;

    return `
      <div class="sticker-4x6">
        <div class="header">${storeName}</div>
        <div class="product-title" title="${productName}">${productName}</div>
        <div class="barcode-wrapper">${barcodeSvgHtml}</div>
        <div class="barcode-text">${productCode}</div>
        <div class="price-row">
          <span class="mrp">MRP: &#8377;${mrpStr}</span>
          <span class="price">PRICE: &#8377;${sellStr}</span>
        </div>
      </div>
    `;
  };

  /**
   * Render legacy 48mm x 23.5mm sticker cell for 2-Up / 1-Up 25mm rolls
   */
  const renderLegacyStickerHTML = (product) => {
    if (!product) {
      return `<div class="sticker-cell blank-cell"></div>`;
    }

    const productCode = String(
      product.productCode || product.barcode || product.code || product.id || "000000"
    ).trim();
    const productName =
      product.name || product.productName || product.description || "Product Item";

    const rawMrp = Number(product.mrp || product.MRP || product.sellPrice || product.price || 0);
    const rawSell = Number(
      product.sellPrice || product.discountAmount || product.sellingPrice || product.price || rawMrp
    );

    const mrpStr = rawMrp > 0 ? rawMrp.toFixed(2) : "0.00";
    const sellStr = rawSell > 0 ? rawSell.toFixed(2) : mrpStr;

    const svgNode = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    try {
      JsBarcode(svgNode, productCode, {
        format: "CODE128",
        width: 1.4,
        height: 30,
        displayValue: false,
        margin: 0,
      });
    } catch (err) {
      console.error("JsBarcode error:", err);
    }

    return `
      <div class="sticker-cell">
        <div class="header">${storeName}</div>
        <div class="product-title" title="${productName}">${productName}</div>
        <div class="barcode-wrapper">${svgNode.outerHTML}</div>
        <div class="barcode-text">${productCode}</div>
        <div class="price-row">
          <span class="mrp">MRP: &#8377;${mrpStr}</span>
          <span class="price">PRICE: &#8377;${sellStr}</span>
        </div>
      </div>
    `;
  };

  // Build Pages/Rows HTML for all requested copies
  let labelsHtml = "";

  products.forEach((prod) => {
    const totalCopies = explicitCopies !== undefined
      ? explicitCopies
      : (parseInt(prod.quantity, 10) > 0 ? parseInt(prod.quantity, 10) : 1);

    if (is4x6) {
      // 4x6 Portrait Layout for SNBC TVSE LP45 BPLE
      for (let c = 0; c < totalCopies; c++) {
        labelsHtml += `
          <div class="sticker-page-4x6">
            ${render4x6StickerHTML(prod)}
          </div>
        `;
      }
    } else if (is2Up) {
      // 2-Up Layout (100mm width x 25mm height)
      for (let c = 0; c < Math.ceil(totalCopies / 2); c++) {
        labelsHtml += `
          <div class="sticker-row">
            ${renderLegacyStickerHTML(prod)}
            ${renderLegacyStickerHTML(prod)}
          </div>
        `;
      }
    } else {
      // 1-Up Layout (50mm width x 25mm height)
      for (let c = 0; c < totalCopies; c++) {
        labelsHtml += `
          <div class="sticker-row">
            ${renderLegacyStickerHTML(prod)}
          </div>
        `;
      }
    }
  });

  // Complete Print HTML Document
  const fullHtmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Thermal Label Print - ${is4x6 ? "SNBC TVSE LP45 (101.6 x 152.4 mm)" : pageWidth + " x " + pageHeight}</title>
        <style>
          /* Thermal Printer Page Size & Zero Margin Rules */
          @page {
            size: ${pageWidth} ${pageHeight};
            margin: 0mm !important;
          }

          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          html, body {
            width: ${pageWidth};
            height: 100%;
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
            background: #f1f5f9;
            color: #000;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Interactive Preview Control Toolbar */
          .preview-toolbar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #0f172a;
            color: #f8fafc;
            padding: 12px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 13px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          }

          .preview-toolbar .info-group {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
          }

          .preview-toolbar .printer-badge {
            background: #0284c7;
            color: #ffffff;
            padding: 4px 10px;
            border-radius: 4px;
            font-weight: 700;
            font-size: 12px;
            letter-spacing: 0.3px;
          }

          .preview-toolbar .size-badge {
            background: #334155;
            color: #38bdf8;
            padding: 4px 10px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 12px;
          }

          .preview-toolbar .hint-text {
            color: #94a3b8;
            font-size: 11px;
          }

          .preview-toolbar button.print-btn {
            background: #16a34a;
            color: #ffffff;
            border: none;
            padding: 8px 22px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            transition: background 0.2s ease;
            box-shadow: 0 2px 6px rgba(22, 163, 74, 0.4);
          }

          .preview-toolbar button.print-btn:hover {
            background: #15803d;
          }

          .preview-container {
            margin-top: 65px;
            padding: 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
          }

          /* ============================================================ */
          /* 4x6 INCH (101.6mm x 152.4mm) SNBC TVSE LP45 THERMAL STICKER */
          /* ============================================================ */
          .sticker-page-4x6 {
            width: 101.6mm;
            height: 152.4mm;
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
            background: #ffffff;
            box-sizing: border-box;
            overflow: hidden;
            display: flex;
            justify-content: center;
            align-items: center;
            border: 1px dashed #cbd5e1;
            box-shadow: 0 8px 24px rgba(0,0,0,0.08);
          }

          .sticker-4x6 {
            width: 101.6mm;
            height: 152.4mm;
            padding: 8mm 8mm; /* Equal top, bottom, left, right safety margins */
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-around;
            align-items: center;
            text-align: center;
            background: #ffffff;
            overflow: hidden;
          }

          .blank-cell {
            visibility: hidden;
          }

          /* Header Store Title */
          .sticker-4x6 .header {
            font-size: 17pt;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #000000;
            line-height: 1.2;
            width: 100%;
            white-space: nowrap;
            overflow: visible;
            border-bottom: 0.8mm solid #000000;
            padding-bottom: 3mm;
            margin-bottom: 2mm;
            text-align: center;
          }

          /* Product Name */
          .sticker-4x6 .product-title {
            font-size: 18pt;
            font-weight: 800;
            line-height: 1.25;
            color: #000000;
            width: 100%;
            max-height: 22mm;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            text-align: center;
            margin: 3mm 0;
          }

          /* CODE128 Barcode Graphic */
          .sticker-4x6 .barcode-wrapper {
            width: 100%;
            height: 32mm;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 4mm 0 2mm 0;
            overflow: hidden;
          }

          .sticker-4x6 .barcode-wrapper svg {
            width: 100%;
            height: 100%;
            max-height: 32mm;
            object-fit: contain;
          }

          /* Barcode Code String */
          .sticker-4x6 .barcode-text {
            font-size: 14pt;
            font-family: 'Courier New', Courier, monospace;
            font-weight: 900;
            letter-spacing: 2px;
            line-height: 1;
            color: #000000;
            text-align: center;
            margin-bottom: 4mm;
          }

          /* Price Section */
          .sticker-4x6 .price-row {
            width: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 2.5mm;
            border-top: 0.8mm solid #000000;
            border-bottom: 0.8mm solid #000000;
            padding: 4mm 0;
            margin-top: 2mm;
            line-height: 1;
            text-align: center;
          }

          .sticker-4x6 .price-row .mrp {
            text-decoration: line-through;
            font-weight: 700;
            font-size: 14pt;
            color: #333333;
            text-align: center;
          }

          .sticker-4x6 .price-row .price {
            font-weight: 900;
            font-size: 26pt;
            color: #000000;
            letter-spacing: 0.5px;
            text-align: center;
          }

          /* ============================================================ */
          /* Legacy 2-Up / 1-Up (25mm height) fallback styling            */
          /* ============================================================ */
          .sticker-row {
            width: ${pageWidth};
            height: ${pageHeight};
            display: flex;
            flex-direction: row;
            justify-content: ${is2Up ? "space-between" : "center"};
            align-items: center;
            padding: 0 1mm;
            page-break-after: always;
            break-after: page;
            box-sizing: border-box;
            background: #ffffff;
            overflow: hidden;
            border: 1px dashed #cbd5e1;
          }

          .sticker-cell {
            width: 48mm;
            height: 23.5mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            text-align: center;
            padding: 0.6mm 1mm;
            overflow: hidden;
            background: #ffffff;
            box-sizing: border-box;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .sticker-cell .header {
            font-size: 7pt;
            font-weight: 900;
            text-transform: uppercase;
            width: 100%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            border-bottom: 0.8px solid #000;
            padding-bottom: 0.3mm;
          }

          .sticker-cell .product-title {
            font-size: 6.5pt;
            font-weight: 700;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
          }

          .sticker-cell .barcode-wrapper {
            width: 100%;
            height: 8.5mm;
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .sticker-cell .barcode-text {
            font-size: 6pt;
            font-family: monospace;
            font-weight: 800;
          }

          .sticker-cell .price-row {
            width: 100%;
            display: flex;
            justify-content: space-between;
            font-size: 6pt;
            border-top: 0.8px solid #000;
            padding-top: 0.3mm;
          }

          /* ============================================================ */
          /* PRINT MEDIA OVERRIDES FOR THERMAL PRINTER DRIVER             */
          /* ============================================================ */
          @media print {
            @page {
              size: ${pageWidth} ${pageHeight};
              margin: 0mm !important;
            }

            html, body {
              width: ${pageWidth} !important;
              height: ${pageHeight} !important;
              margin: 0mm !important;
              padding: 0mm !important;
              background: #ffffff !important;
              overflow: hidden !important;
            }

            .preview-toolbar {
              display: none !important;
            }

            .preview-container {
              margin: 0 !important;
              padding: 0 !important;
              display: block !important;
              width: ${pageWidth} !important;
            }

            .sticker-page-4x6 {
              border: none !important;
              box-shadow: none !important;
              width: 101.6mm !important;
              height: 152.4mm !important;
              margin: 0mm !important;
              padding: 0mm !important;
              page-break-after: always !important;
              break-after: page !important;
            }

            .sticker-4x6 {
              width: 101.6mm !important;
              height: 152.4mm !important;
              padding: 8mm 8mm !important;
              box-sizing: border-box !important;
              margin: 0 !important;
            }

            .sticker-row {
              border: none !important;
              width: ${pageWidth} !important;
              height: ${pageHeight} !important;
              page-break-after: always !important;
              break-after: page !important;
            }
          }
        </style>
      </head>
      <body>
        <!-- Top Control Toolbar -->
        <div class="preview-toolbar">
          <div class="info-group">
            <span class="printer-badge">🖨️ SNBC TVSE LP45 BPLE</span>
            <span class="size-badge">${is4x6 ? "Stock Size: 101.6 mm × 152.4 mm (4 × 6 inch)" : "Stock Size: " + pageWidth + " × " + pageHeight}</span>
            <span class="hint-text">Media: Labels with 3.1mm Gaps | Orientation: Portrait | Scale: 100% | Margins: None</span>
          </div>
          <div class="actions">
            <button class="print-btn" onclick="window.print()">🖨️ Print Labels Now</button>
          </div>
        </div>

        <!-- Print Preview Container -->
        <div class="preview-container">
          ${labelsHtml}
        </div>

        <script>
          ${
            autoPrint
              ? `
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          `
              : ""
          }
        </script>
      </body>
    </html>
  `;

  // Standard Popup Print Window
  let popupWindow = null;
  try {
    popupWindow = window.open("", "_blank", "width=850,height=650");
  } catch (err) {
    console.warn("window.open exception, falling back to iframe print:", err);
  }

  if (popupWindow && !popupWindow.closed) {
    try {
      popupWindow.document.open();
      popupWindow.document.write(fullHtmlContent);
      popupWindow.document.close();
      return;
    } catch (err) {
      console.warn("Writing to popup window failed, using iframe fallback:", err);
    }
  }

  // Fallback: Hidden iframe printing
  let printFrame = document.getElementById("sticker-print-iframe");
  if (!printFrame) {
    printFrame = document.createElement("iframe");
    printFrame.id = "sticker-print-iframe";
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";
    printFrame.style.visibility = "hidden";
    document.body.appendChild(printFrame);
  }

  const frameDoc = printFrame.contentWindow || printFrame.contentDocument;
  const doc = frameDoc.document || frameDoc;
  doc.open();
  doc.write(fullHtmlContent);
  doc.close();

  if (autoPrint) {
    setTimeout(() => {
      try {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
      } catch (err) {
        console.error("Iframe print trigger failed:", err);
      }
    }, 400);
  }
};

export default printProductSticker;
