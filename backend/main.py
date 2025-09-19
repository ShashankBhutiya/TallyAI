from flask import Flask, request, jsonify
from flask_cors import CORS
from google.cloud import firestore
import os
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize Firestore client
db = firestore.Client()

@app.route('/upload-invoice', methods=['POST'])
def upload_invoice():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    try:
        # Process the file with AI (placeholder for actual processing)
        extracted_data = process_invoice_with_ai(file)
        
        # Save to Firestore
        doc_ref = db.collection('invoices').document()
        invoice_data = {
            'fileName': file.filename,
            'uploadedAt': datetime.utcnow(),
            'status': 'Processed',
            'data': extracted_data
        }
        doc_ref.set(invoice_data)
        
        return jsonify({
            'message': 'File processed successfully',
            'data': invoice_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def process_invoice_with_ai(file):
    """
    Placeholder function for AI processing.
    In a real application, this would use OCR and NLP to extract data from the invoice.
    """
    # Simulate processing
    return {
        'invoiceNumber': 'INV-' + str(datetime.now().timestamp())[-6:],
        'date': datetime.now().strftime('%Y-%m-%d'),
        'customerName': 'Sample Customer',
        'totalAmount': '1,234.56',
        'items': [
            {'description': 'Sample Item 1', 'quantity': 2, 'price': '123.45', 'total': '246.90'},
            {'description': 'Sample Item 2', 'quantity': 1, 'price': '987.65', 'total': '987.65'}
        ]
    }

if __name__ == '__main__':
    app.run(debug=True, port=5000)
