"""
Invoice Processing Module
Handles OCR extraction and Tally integration for invoice images
"""
import os
import threading
from typing import Callable, List, Optional

from tally_client import TallyClient
import OCR_AI

class InvoiceProcessor:
    """
    Processes invoice images using OCR and sends data to Tally ERP
    """
    
    def __init__(self, company_name: str = "A", ledger_name: str = "New Fresh Ledger",
                 contra_ledger: str = "Cash", tally_url: str = "http://localhost:9000"):
        """
        Initialize invoice processor
        
        Args:
            company_name: Tally company name (must match exactly)
            ledger_name: Ledger name to create/use for invoices
            contra_ledger: Contra ledger for receipts (default: Cash)
            tally_url: Tally HTTP Server URL
        """
        self.company_name = company_name
        self.ledger_name = ledger_name
        self.contra_ledger = contra_ledger
        self.tally_client = TallyClient(tally_url)
        self._processing = False
    
    def process(self, folder: str, status_callback: Callable[[str], None],
                error_callback: Optional[Callable[[str], None]] = None,
                success_callback: Optional[Callable[[], None]] = None) -> None:
        """
        Process invoices in a background thread (non-blocking)
        
        Args:
            folder: Folder containing invoice images
            status_callback: Callback for status updates (called from background thread)
            error_callback: Callback for error messages (optional)
            success_callback: Callback when processing completes successfully (optional)
        """
        if self._processing:
            if error_callback:
                error_callback("Processing already in progress. Please wait.")
            return
        
        # Run processing in background thread
        thread = threading.Thread(
            target=self._process_internal,
            args=(folder, status_callback, error_callback, success_callback),
            daemon=True
        )
        thread.start()
    
    def _process_internal(self, folder: str, status_callback: Callable[[str], None],
                         error_callback: Optional[Callable[[str], None]],
                         success_callback: Optional[Callable[[], None]]) -> None:
        """Internal processing method that runs in background thread"""
        self._processing = True
        
        try:
            # Validate folder
            if not folder or not os.path.isdir(folder):
                if error_callback:
                    error_callback("Invalid folder selected")
                return
            
            status_callback("Starting invoice processing...")
            
            # Import OCR module (lazy import to avoid startup delay)
            try:
                import OCR_AI
            except ImportError as e:
                if error_callback:
                    error_callback(f"OCR_AI module not found: {str(e)}")
                return
            
            # Process all image files
            mainlist: List[List[str]] = []
            files = [f for f in os.listdir(folder) 
                    if os.path.isfile(os.path.join(folder, f)) and 
                    self._is_image_file(f)]
            
            if not files:
                if error_callback:
                    error_callback("No image files found in the selected folder")
                return
            
            total_files = len(files)
            status_callback(f"Found {total_files} image(s) to process...")
            
            # Process each image
            processed_count = 0
            for idx, filename in enumerate(files, start=1):
                try:
                    image_path = os.path.join(folder, filename)
                    status_callback(f"Processing {filename} ({idx}/{total_files})...")
                    
                    # Run OCR
                    ocr_result = OCR_AI.ocr_ai(
                        image_path,
                        system_prompt=(
                            "This is extracted OCR text i need a 2d array of with 0th index of the index(0 based) "
                            "is item name and 1st index is quantity and 2nd is 'um'(present in the invoice), 3rd being net price, "
                            "4th being the net_worth, 5th being vat, 6th being gross, return a '\\n' sepreated string for each item "
                            "and '|' sepreated values, no additional context or text formatiing is required just the required "
                        )
                    )
                    
                    if ocr_result is None or not ocr_result.strip():
                        status_callback(f"Skipping {filename} - OCR returned no data")
                        continue
                    
                    # Parse OCR result
                    templist = ocr_result.split("\n")
                    for i in range(len(templist)):
                        templist[i] = templist[i].split("|")
                    
                    mainlist += templist
                    processed_count += 1
                    
                except Exception as e:
                    status_callback(f"Error processing {filename}: {str(e)}")
                    continue
            
            if not mainlist:
                if error_callback:
                    error_callback(f"No invoice data extracted from {total_files} file(s)")
                return
            
            status_callback(f"Extracted {len(mainlist)} line item(s) from {processed_count} file(s)")
            
            # Create/update ledger in Tally
            status_callback("Creating ledger in Tally...")
            success, message = self.tally_client.create_ledger(
                self.company_name,
                self.ledger_name
            )
            
            if not success:
                if error_callback:
                    error_callback(f"Failed to create ledger: {message}")
                return
            
            status_callback(message)
            
            # Import vouchers to Tally
            status_callback("Importing vouchers to Tally...")
            success, message = self.tally_client.import_vouchers(
                self.company_name,
                self.ledger_name,
                mainlist,
                self.contra_ledger
            )
            
            if not success:
                if error_callback:
                    error_callback(f"Failed to import vouchers: {message}")
                return
            
            status_callback(f"✓ Success! {message}")
            
            if success_callback:
                success_callback()
                
        except Exception as e:
            if error_callback:
                error_callback(f"Unexpected error: {str(e)}")
        finally:
            self._processing = False
    
    def _is_image_file(self, filename: str) -> bool:
        """Check if file is a supported image format"""
        image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.gif'}
        return os.path.splitext(filename.lower())[1] in image_extensions
    
    def is_processing(self) -> bool:
        """Check if processing is currently in progress"""
        return self._processing


    def process_file(self, file) -> tuple:
        """Process a single invoice file"""
        # Read file data instead of just filename
        file_data = file.read()

        # Import OCR module (lazy import to avoid startup delay)
        try:
            import OCR_AI
        except ImportError as e:
            print(f"OCR module not found: {str(e)}")
            return False, f"OCR module not found: {str(e)}"

        # Run OCR with file data (bytes) instead of filename
        ocr_result = OCR_AI.ocr_ai(
            file_data,  # Pass actual file data (bytes)
            is_base64=False,  # File data is raw bytes, not base64
            system_prompt=(
                "This is extracted OCR text i need a 2d array of with 0th index of the index(0 based) "
                "is item name and 1st index is quantity and 2nd is 'um'(present in the invoice), 3rd being net price, "
                "4th being the net_worth, 5th being vat, 6th being gross, return a '\\n' sepreated string for each item "
                "and '|' sepreated values, no additional context or text formatiing is required just the required "
            )
        )

        if ocr_result is None or not ocr_result.strip():
            return False, "OCR Or AI returned no data"

        # Parse OCR result
        templist = ocr_result.split("\n")
        for i in range(len(templist)):
            templist[i] = templist[i].split("|")

        # Create/update ledger in Tally
        success, message = self.tally_client.create_ledger(
            self.company_name,
            self.ledger_name
        )

        if not success:
            return False, f"Failed to create ledger: {message}"

        # Import vouchers to Tally
        success, message = self.tally_client.import_vouchers(
            self.company_name,
            self.ledger_name,
            templist,
            self.contra_ledger
        )

        if not success:
            return False, f"Failed to import vouchers: {message}"

        return success, message