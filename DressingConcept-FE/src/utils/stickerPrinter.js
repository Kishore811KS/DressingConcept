import JsBarcode from "jsbarcode";

/**
 * Print Product Sticker formatted for TVS LP-45 & Standard Thermal Printers
 * 
 * Supports:
 * - 2-Up Roll (Default): 100mm x 25mm (2 stickers side-by-side)
 * - 1-Up Roll: 50mm x 25mm (single sticker per row)
 * 
 * @param {Object} product - Product data object
 * @param {Object} options - Print configuration options
 * @param {'2up'|'1up'} [options.layout='2up'] - Sticker layout format
 * @param {number} [options.copies=1] - Number of sticker rows/copies to print
 * @param {boolean} [options.autoPrint=true] - Automatically trigger browser print dialog
 */
export const printProductSticker = (product, options = {}) => {
  if (!product) return;

  const { layout = "2up", copies = 1, autoPrint = true } = options;

  const productCode = String(product.productCode || product.barcode || product.id || "000000").trim();
  const productName = product.name || product.productName || "Product Item";
  const mrp = Number(product.mrp || product.price || 0).toFixed(2);
  const discountAmount = Number(product.discountAmount || product.price || mrp).toFixed(2);

  // Optimized Barcode rendering for 203 DPI Thermal Printers (TVS LP-45)
  const svgNode = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  try {
    JsBarcode(svgNode, productCode, {
      format: "CODE128",
      width: 1.8,       // 1.8px bar width = optimal scan resolution on 203 DPI
      height: 38,        // 38px height (~4.8mm)
      displayValue: false,
      margin: 0,
    });
  } catch (err) {
    console.error("JsBarcode generation error:", err);
  }

  const barcodeSvgHtml = svgNode.outerHTML;

  const printWindow = window.open("", "_blank", "width=750,height=450");
  if (!printWindow) {
    alert("Please allow popup windows in your browser to view & print barcode stickers.");
    return;
  }

  // Single sticker unit template
  const renderStickerHTML = () => `
    <div class="sticker-cell">
      <div class="header">DRESSING CONCEPT</div>
      <div class="product-title" title="${productName}">${productName}</div>
      <div class="barcode-wrapper">${barcodeSvgHtml}</div>
      <div class="barcode-text">${productCode}</div>
      <div class="price-row">
        <span class="mrp">MRP: &#8377;${mrp}</span>
        <span class="price">PRICE: &#8377;${discountAmount}</span>
      </div>
    </div>
  `;

  // Determine paper layout dimensions
  const is2Up = layout === "2up";
  const pageWidth = is2Up ? "100mm" : "50mm";
  const pageHeight = "25mm";

  // Build requested sticker rows
  let rowsHtml = "";
  for (let i = 0; i < copies; i++) {
    rowsHtml += `
      <div class="sticker-row">
        ${renderStickerHTML()}
        ${is2Up ? renderStickerHTML() : ""}
      </div>
    `;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Barcode Sticker Preview - ${productCode}</title>
        <style>
          /* Thermal Page Dimensions */
          @page {
            size: ${pageWidth} ${pageHeight};
            margin: 0mm;
          }

          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          html, body {
            width: ${pageWidth};
            height: ${pageHeight};
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #f4f4f5;
            color: #000;
            -webkit-print-color-adjust: exact;
          }

          /* Control bar for screen view */
          .preview-toolbar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #1e293b;
            color: #fff;
            padding: 8px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 13px;
            z-index: 9999;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          }

          .preview-toolbar button {
            background: #3b82f6;
            color: #fff;
            border: none;
            padding: 6px 14px;
            border-radius: 4px;
            font-weight: 600;
            cursor: pointer;
          }
          .preview-toolbar button:hover {
            background: #2563eb;
          }

          .preview-container {
            margin-top: 50px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 15px;
          }

          /* Print Row Layout */
          .sticker-row {
            width: ${pageWidth};
            height: ${pageHeight};
            display: flex;
            justify-content: ${is2Up ? "space-between" : "center"};
            align-items: center;
            padding: 0.5mm 1mm;
            page-break-after: always;
            box-sizing: border-box;
            background: #fff;
            overflow: hidden;
            border: 1px dashed #cbd5e1;
          }

          /* Individual 50mm x 25mm Sticker Cell */
          .sticker-cell {
            width: 48.5mm;
            height: 24mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            text-align: center;
            padding: 1mm 1.5mm;
            overflow: hidden;
            background: #fff;
            box-sizing: border-box;
          }

          .header {
            font-size: 7.5pt;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            line-height: 1;
            width: 100%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            border-bottom: 0.8px solid #000;
            padding-bottom: 0.5mm;
          }

          .product-title {
            font-size: 6.5pt;
            font-weight: 700;
            line-height: 1.1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
            margin-top: 0.4mm;
          }

          .barcode-wrapper {
            width: 100%;
            height: 9.5mm;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0.3mm 0;
            overflow: hidden;
          }

          .barcode-wrapper svg {
            width: 100%;
            height: 100%;
            max-height: 9.5mm;
            object-fit: contain;
          }

          .barcode-text {
            font-size: 6.5pt;
            font-family: 'Courier New', Courier, monospace;
            font-weight: 800;
            letter-spacing: 0.5px;
            line-height: 1;
          }

          .price-row {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 6.5pt;
            border-top: 0.8px solid #000;
            padding-top: 0.5mm;
            line-height: 1;
          }

          .mrp {
            text-decoration: line-through;
            font-weight: 600;
            font-size: 6pt;
          }

          .price {
            font-weight: 900;
            font-size: 7pt;
          }

          @media print {
            .preview-toolbar {
              display: none !important;
            }
            .preview-container {
              margin-top: 0 !important;
              padding: 0 !important;
            }
            html, body {
              width: ${pageWidth};
              height: ${pageHeight};
              background: #fff;
            }
            .sticker-row {
              border: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="preview-toolbar">
          <span>Sticker Preview (${is2Up ? "2-Up 100x25mm" : "1-Up 50x25mm"})</span>
          <button onclick="window.print()">🖨️ Print Now</button>
        </div>

        <div class="preview-container">
          ${rowsHtml}
        </div>

        <script>
          ${autoPrint ? `
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          ` : ""}
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

