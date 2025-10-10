from flask import Flask, request, jsonify
from flask_cors import CORS
from google.cloud import firestore
import os
import requests
import random
import uuid
import json
from datetime import datetime
# import pytesseract
# from PIL import Image
# import google.generativeai as genai
import logging
# import time
# import xml.etree.ElementTree as ET

import invoice_processor as InvoiceProcessor
import OCR_AI 

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
global_counter = 0
# Configure logging for production-grade diagnostics
logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("ai-tally-agent")

# Global environment variables
try:
    # Initialize Firestore client
    db = firestore.Client()
    logger.info("Firestore client initialized successfully.")

    # # Configure Gemini API from environment variable
    # GEMINI_API_KEY = os.environ.get('GOOGLE_API_KEY')
    # if not GEMINI_API_KEY:
    #     raise ValueError("GOOGLE_API_KEY environment variable not set.")
    # genai.configure(api_key=GEMINI_API_KEY)
    # logger.info("Gemini API configured successfully.")

    # Configuration for Tally and voucher defaults
    TALLY_URL = os.environ.get("TALLY_URL", "http://localhost:9000")
    TALLY_COMPANY = os.environ.get("TALLY_COMPANY", "A")
    TALLY_LEDGER = os.environ.get("TALLY_LEDGER", "Main Ledger")
    TALLY_REQUEST_TIMEOUT = float(os.environ.get("TALLY_REQUEST_TIMEOUT", "20"))
    TALLY_MAX_RETRIES = int(os.environ.get("TALLY_MAX_RETRIES", "3"))
    TALLY_RETRY_BACKOFF_BASE = float(os.environ.get("TALLY_RETRY_BACKOFF_BASE", "0.5"))
except Exception as e:
    logger.exception(f"Failed to initialize a service: {e}")
    db = None
    GEMINI_API_KEY = None
    # Provide safe fallbacks so app can still start (but endpoint will guard usage)
    TALLY_URL = os.environ.get("TALLY_URL", "http://localhost:9000")
    TALLY_COMPANY = os.environ.get("TALLY_COMPANY", "A")
    TALLY_LEDGER = os.environ.get("TALLY_LEDGER", "Main Ledger")
    TALLY_REQUEST_TIMEOUT = float(os.environ.get("TALLY_REQUEST_TIMEOUT", "20"))
    TALLY_MAX_RETRIES = int(os.environ.get("TALLY_MAX_RETRIES", "3"))
    TALLY_RETRY_BACKOFF_BASE = float(os.environ.get("TALLY_RETRY_BACKOFF_BASE", "0.5"))

SYSTEM_PROMPT = """
You will get the extracted OCR text from a document like an invoice. Your task is to return the data in a structured JSON format for data entry. The JSON should be a single object containing the following keys: 'invoiceNumber', 'date', 'customerName', 'totalAmount', and 'items'. The 'items' key should be an array of objects, each with 'description', 'quantity', 'price', and 'total'. Do not include any other text or context. Return only the JSON object.
"""



@app.route('/upload-invoice', methods=['POST'])
def upload_invoice():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    # if not db or not GEMINI_API_KEY:
    #     return jsonify({'error': 'Backend services are not initialized'}), 500
    
    try:
        # Step 1: Process the invoice file with OCR and Gemini
        # extracted_data = OCR/_AI.ocr_ai(file.read(), is_base64=False)
        # # print(extracted_data)
        # if not extracted_data:
        #     return jsonify({'error': 'Failed to process invoice with AI'}), 500

        # Step 2: Push data to Tally
        success, message = InvoiceProcessor.InvoiceProcessor().process_file(file)
        print(success, message)
        # tally_status = tally_result.get('tally_status', 'Failed')
        # tally_response = tally_result.get('response') or ''
        # tally_error = tally_result.get('error')

        # if tally_status.lower() == 'failed':
        #     logger.error(
        #         "Tally integration failed",
        #         extra={
        #             "file": file.filename,
        #             "error": tally_error,
        #         },
        #     )
        #     # Optionally, return 502 to indicate upstream dependency failure
        #     return jsonify({
        #         'message': 'Invoice processed but failed to push to Tally',
        #         'tallyStatus': tally_status,
        #         'tallyError': tally_error,
        #         'data': extracted_data,
        #     }), 502

        # Step 3: Save the extracted data to Firestore
        # invoices_ref = db.collection('artifacts').document('default-app-id').collection('public').document('data').collection('invoices')
        # doc_ref = invoices_ref.add({
        #     'fileName': file.filename,
        #     'status': tally_status,
        #     'data': extracted_data,
        #     'tallyResponse': tally_response,
        #     'tallyError': tally_error,
        #     'uploadedAt': firestore.SERVER_TIMESTAMP
        # })
        
        # return jsonify({
        #     'message': 'Invoice processed and saved successfully',
        #     'tallyStatus': tally_status,
        #     'tallyResponse': tally_response,
        #     'tallyError': tally_error,
        #     'invoiceId': doc_ref[1].id
        # }), 200
        return jsonify({
            'message': 'Invoice processed successfully',
            'status': success,
            'data': extracted_data,
            'message': message
             }), 200
    except Exception as e:
        logger.exception(f"An error occurred while processing invoice: {e}")
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
