try {
  const pdfParse = require('pdf-parse');
  console.log("pdf-parse loaded successfully");
} catch (e) {
  console.error("Error loading pdf-parse:", e.message);
}

if (typeof DOMMatrix === 'undefined') {
    console.log("DOMMatrix is indeed NOT defined globally");
}
