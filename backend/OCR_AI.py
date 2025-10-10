# take image as parameter for the function and return the text
import pytesseract
from PIL import Image
import google.generativeai as genai
import os
import base64
from io import BytesIO
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure Gemini API
GEMINI_API_KEY = os.getenv('GOOGLE_API_KEY')
if not GEMINI_API_KEY:
    raise ValueError("Please set the GOOGLE_API_KEY in your .env file")

genai.configure(api_key=GEMINI_API_KEY)

SYSTEM_PROMPT = """     
You will get the extracted OCR text from a document like invoice and you need to return the data[in list datatype] in a structured form for relevant further processing or data entry using python. NO irrelevant context is required the response will be not read bu anny
"""

def process_with_gemini(text, system_prompt = SYSTEM_PROMPT, useModel = 'gemini-2.0-flash-lite'):
    """
    Send text to Gemini 2.0 API for processing with a system prompt
    """
    try:
        # Model can be changed.

        model = genai.GenerativeModel(useModel)
        response = model.generate_content(
            f"{system_prompt}\n\nDocument Text:\n{text}",
            generation_config={
                "temperature": 0.2,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 2048,
            },
        )
        return response.text
    except Exception as e:
        print(f"Error calling Gemini API: {str(e)}")
        return None

def ocr_ai(image_data, system_prompt = SYSTEM_PROMPT, useModel = 'gemini-2.0-flash-lite', is_base64=False):
    """
    Process image data from Firestore (bytes or base64 encoded) for OCR
    
    Args:
        image_data: Image data as bytes or base64 string
        system_prompt: System prompt for Gemini AI
        useModel: Gemini model to use
        is_base64: Whether the image_data is base64 encoded
    """
    try:
        # Handle base64 encoded data
        if is_base64:
            image_bytes = base64.b64decode(image_data)
        else:
            image_bytes = image_data
        
        # Create a file-like object from bytes
        image_file = BytesIO(image_bytes)
        
        # Perform OCR on the image
        image = Image.open(image_file)
        extracted_text = pytesseract.image_to_string(image)
        
        # Check if any text was extracted from the image
        if not extracted_text.strip():
            print("❌ Error: No text could be extracted from the image.")
            return None
        
        print("✅ Successfully extracted text from the image")
        print("🔍 Processing text with Gemini AI...")
        
        # Process the extracted text with Gemini
        response = process_with_gemini(extracted_text, system_prompt, useModel)
        
        if response:
            print("✅ Successfully processed text with Gemini AI")
            return response
        else:
            print("❌ Failed to process text with Gemini AI")
            return None
            
    except Exception as e:
        print(f"Error processing image data: {str(e)}")
        return None


def main():
    """
    Main function to demonstrate the OCR and AI processing workflow.
    Handles the complete pipeline from image to processed data.
    """
    # Path to the invoice image (update this to your image path)
    image_path = r"C:\Users\shash\Downloads\Invoice Sample\Invoice-0001.jpg"
    
    print(f"\n📄 Processing invoice: {image_path}")
    print("-" * 50)
    
    # Process the invoice image
    result = ocr_ai(image_path)
    
    print("\n" + "=" * 50)
    if result:
        print("🎉 Processing Complete!")
        print("-" * 50)
        print(result)
    else:
        print("❌ Processing failed. Please check the error messages above.")

if __name__ == "__main__":
    main()