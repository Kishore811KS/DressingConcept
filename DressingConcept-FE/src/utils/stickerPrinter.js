import JsBarcode from "jsbarcode";

export const printProductSticker = (product) => {
  if (!product) return;

  const productCode = String(product.productCode || product.id || "").trim();
  const productName = product.name || "Product";
  const mrp = Number(product.mrp || 0).toFixed(2);
  const discountAmount = Number(product.discountAmount || 0).toFixed(2);

  // Render barcode to SVG element
  const svgNode = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  try {
    JsBarcode(svgNode, productCode || "0000", {
      format: "CODE128",
      width: 1.8,
      height: 45,
      displayValue: false,
      margin: 0,
    });
  } catch (err) {
    console.error("JsBarcode generation error:", err);
  }

  const barcodeSvgHtml = svgNode.outerHTML;

  const printWindow = window.open("", "_blank", "width=600,height=600");
  if (!printWindow) {
    alert("Please allow popup windows in your browser to print product stickers.");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Sticker Print - ${productCode}</title>
        <style>
          @page {
            size: auto;
            margin: 0mm;
          }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            margin: 0;
            padding: 10px;
            display: flex;
            justify-content: center;
            align-items: center;
            background: #fff;
            color: #000;
          }
          .sticker {
            width: 58mm;
            min-height: 38mm;
            border: 1px dashed #999;
            padding: 6px 8px;
            box-sizing: border-box;
            text-align: center;
            background: #fff;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .company-name {
            font-size: 13px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
            border-bottom: 1.5px solid #000;
            padding-bottom: 2px;
          }
          .product-name {
            font-size: 11px;
            font-weight: 600;
            line-height: 1.25;
            margin: 4px 0;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            word-break: break-word;
          }
          .barcode-container {
            margin: 2px 0;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .barcode-container svg {
            max-width: 100%;
            height: 36px;
          }
          .product-id {
            font-size: 10px;
            font-family: 'Courier New', Courier, monospace;
            font-weight: 700;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          .price-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid #000;
            padding-top: 3px;
            font-size: 11px;
          }
          .mrp {
            text-decoration: line-through;
            font-weight: 500;
            color: #333;
          }
          .discounted-price {
            font-weight: 800;
            font-size: 12px;
          }
          @media print {
            .sticker {
              border: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="sticker">
          <div class="company-name">Dressing Concept</div>
          <div class="product-name">${productName}</div>
          <div class="barcode-container">${barcodeSvgHtml}</div>
          <div class="product-id">${productCode}</div>
          <div class="price-container">
            <span class="mrp">MRP: &#8377;${mrp}</span>
            <span class="discounted-price">Price: &#8377;${discountAmount}</span>
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
