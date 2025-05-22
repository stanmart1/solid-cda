const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Ensure the receipts directory exists
const receiptsDir = path.join(__dirname, '..', 'private', 'receipts');
if (!fs.existsSync(receiptsDir)) {
  fs.mkdirSync(receiptsDir, { recursive: true });
}

/**
 * Generates a PDF receipt for a payment record.
 * @param {object} paymentRecord - The payment record object.
 * @param {object} user - The user object associated with the payment.
 * @returns {Promise<string>} - The path to the generated PDF file.
 */
const generateReceipt = async (paymentRecord, user) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const fileName = `receipt-${paymentRecord.transactionReference || paymentRecord._id}.pdf`;
    const filePath = path.join(receiptsDir, fileName);

    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Header
    doc
      .fontSize(20)
      .text('Payment Receipt', { align: 'center' })
      .moveDown();

    // CDA Info (Placeholder - replace with actual CDA name from config or .env)
    doc.fontSize(16).text('Community Development Association', { align: 'center' });
    // doc.fontSize(10).text('CDA Address Line 1', { align: 'center' });
    // doc.fontSize(10).text('CDA Contact Info', { align: 'center' });
    doc.moveDown(2);

    // Payment Details
    doc.fontSize(12);
    doc.text(`Date: ${new Date(paymentRecord.paymentDate || paymentRecord.createdAt).toLocaleDateString()}`);
    doc.text(`Receipt No: ${paymentRecord.transactionReference || paymentRecord._id}`);
    doc.moveDown();

    doc.text(`Paid By: ${user.firstName} ${user.lastName}`);
    doc.text(`Email: ${user.email}`);
    doc.moveDown();

    doc.text('Payment Details:', { underline: true });
    doc.moveDown(0.5);
    doc.text(`Description: ${paymentRecord.paymentFor}`);
    doc.text(`Amount: ${paymentRecord.currency} ${paymentRecord.amount.toFixed(2)}`);
    doc.text(`Payment Method: ${paymentRecord.paymentMethod}`);
    if (paymentRecord.flutterwaveTransactionId) {
      doc.text(`Flutterwave Tx ID: ${paymentRecord.flutterwaveTransactionId}`);
    }
    doc.moveDown();

    // Status Stamp
    if (paymentRecord.status === 'successful') {
      doc
        .fontSize(25)
        .fillColor('green')
        .text('PAID', {
          align: 'center',
          opacity: 0.5,
          // You can also add rotation or place it as a watermark
        })
        .fillColor('black'); // Reset color
    } else {
      doc
        .fontSize(20)
        .fillColor('red')
        .text(`Status: ${paymentRecord.status.toUpperCase()}`, {
            align: 'center',
            opacity: 0.5,
        })
        .fillColor('black');
    }
    doc.moveDown(2);

    // Footer
    doc.fontSize(10).text('Thank you for your payment.', { align: 'center' });

    doc.end();

    writeStream.on('finish', () => {
      // Return a relative path for storage in DB, or absolute if needed elsewhere
      resolve(path.join('private', 'receipts', fileName));
    });

    writeStream.on('error', (err) => {
      console.error('Error generating receipt PDF:', err);
      reject(err);
    });
  });
};

module.exports = {
  generateReceipt,
};
