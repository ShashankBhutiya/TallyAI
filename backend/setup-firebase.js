const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Initialize Firebase Admin
const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);

admin.initializeApp({
  credential: cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = getFirestore();

async function setupFirestore() {
  try {
    console.log('Setting up Firestore collections and indexes...');
    
    // Create the invoices collection with a sample document
    const invoiceRef = db.collection('invoices').doc('sample-invoice');
    await invoiceRef.set({
      fileName: 'sample-invoice.pdf',
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'Processed',
      data: {
        invoiceNumber: 'INV-001',
        date: new Date().toISOString().split('T')[0],
        customerName: 'Sample Customer',
        totalAmount: '1,234.56',
        items: [
          { description: 'Sample Item 1', quantity: 2, price: '123.45', total: '246.90' },
          { description: 'Sample Item 2', quantity: 1, price: '987.65', total: '987.65' }
        ]
      }
    }, { merge: true });

    console.log('Firestore setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error setting up Firestore:', error);
    process.exit(1);
  }
}

// Run the setup
setupFirestore();
