"""
Tally ERP Integration Module
Handles all Tally XML generation and API communication
"""
import uuid
import random
import requests
from typing import List, Optional


class TallyClient:
    """Client for communicating with Tally ERP via HTTP API"""
    
    def __init__(self, tally_url: str = "http://localhost:9000"):
        """
        Initialize Tally client
        
        Args:
            tally_url: URL of Tally HTTP Server (default: http://localhost:9000)
        """
        self.tally_url = tally_url
        self.headers = {"Content-Type": "application/xml"}
    
    def send_request(self, xml: str, timeout: int = 20) -> tuple[bool, str]:
        """
        Send XML request to Tally
        
        Args:
            xml: XML string to send
            timeout: Request timeout in seconds
            
        Returns:
            Tuple of (success: bool, response: str)
        """
        try:
            resp = requests.post(
                self.tally_url, 
                data=xml.encode("utf-8"), 
                headers=self.headers, 
                timeout=timeout
            )
            resp.raise_for_status()
            return True, resp.text
        except requests.exceptions.ConnectionError:
            return False, "Failed to connect to Tally. Please ensure Tally is running and HTTP Server is enabled."
        except requests.exceptions.Timeout:
            return False, f"Request to Tally timed out after {timeout} seconds."
        except requests.exceptions.RequestException as e:
            return False, f"Error communicating with Tally: {str(e)}"
    
    def create_ledger(self, company_name: str, ledger_name: str,
                     parent: str = "Sundry Debtors",
                     opening_balance: str = "0") -> tuple[bool, str]:
        """
        Create or update a ledger in Tally
        
        Args:
            company_name: Tally company name
            ledger_name: Name of the ledger to create
            parent: Parent group (default: Sundry Debtors)
            opening_balance: Opening balance (default: 0)
            
        Returns:
            Tuple of (success: bool, message: str)
        """
        xml = self._build_create_ledger_xml(company_name, ledger_name, parent, opening_balance)
        success, response = self.send_request(xml)
        if success:
            return True, f"Ledger '{ledger_name}' created/updated successfully"
        return False, response
    
    def import_vouchers(self, company_name: str, party_ledger: str, 
                       items: List[List[str]], contra_ledger: str = "Cash") -> tuple[bool, str]:
        """
        Import receipt vouchers to Tally
        
        Args:
            company_name: Tally company name
            party_ledger: Party ledger name
            items: List of invoice items (each item is [name, qty, um, net_price, net_worth, vat, gross])
            contra_ledger: Contra ledger (default: Cash)
            
        Returns:
            Tuple of (success: bool, message: str)
        """
        xml = self._build_receipt_vouchers_xml(company_name, party_ledger, items, contra_ledger)
        success, response = self.send_request(xml)
        if success:
            return True, f"Successfully imported {len(items)} vouchers"
        return False, response
    
    def _build_create_ledger_xml(self, company_name: str, ledger_name: str,
                                 parent: str = "Sundry Debtors",
                                 opening_balance: str = "0") -> str:
        """Build XML for creating a ledger"""
        return f"""
<ENVELOPE>
  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="{ledger_name}" RESERVEDNAME="">
            <NAME>{ledger_name}</NAME>
            <PARENT>{parent}</PARENT>
            <AFFECTSSTOCK>No</AFFECTSSTOCK>
            <ISBILLWISEON>Yes</ISBILLWISEON>
            <ISREVENUE>No</ISREVENUE>
            <OPENINGBALANCE>{opening_balance}</OPENINGBALANCE>
          </LEDGER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>
"""
    
    def _build_receipt_vouchers_xml(self, company_name: str, party_ledger: str, 
                                    items: List[List[str]], contra_ledger: str = "Purchase") -> str:
        """Build XML for receipt vouchers"""
        messages = []
        
        for i, item in enumerate(items):
            try:
                # Validate item has enough fields
                if not item or len(item) < 7 or item[1] == "":
                    print("Invalid item")
                    print(item)
                    continue
                
                qty = int(self._parse_number(item[1]))
                if qty == 0:
                  print("Quantity is 0")
                  print(item)
                  continue
                um = item[2]
                amt = float(self._parse_number(item[3]))
                net_worth = self._parse_number(item[4])
                vat = self._parse_number(item[5])
                gross = self._parse_number(item[6])
                
                dt = self._edu_safe_date_yyyyMMdd()
                vno = f"INV-{i+100:03d}"
                narration = f"{item[0]} | Qty: {qty} {um} | Rate: {amt}"
                guid = str(uuid.uuid4()).upper()
                
                messages.append(f"""
                <TALLYMESSAGE xmlns:UDF="TallyUDF">
      <VOUCHER VCHTYPE="Receipt" ACTION="Create" GUID="{guid}">
        <DATE>{dt}</DATE>
        <EFFECTIVEDATE>{dt}</EFFECTIVEDATE>
        <VOUCHERNUMBER>{vno}</VOUCHERNUMBER>
        <VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>
        <PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW>
        <NARRATION>{narration}</NARRATION>
        <PARTYLEDGERNAME>{party_ledger}</PARTYLEDGERNAME>

        <!-- Party ledger (Credit) -->
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>{party_ledger}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>-{amt}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>

        <!-- Cash/Bank (Debit) -->
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>{contra_ledger}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>{amt}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
      </VOUCHER>
    </TALLYMESSAGE>
        """)
                # print(messages)
            except (IndexError, ValueError, TypeError) as e:
                # Skip invalid items
                continue
        
        return f"""
<ENVELOPE>
  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        {''.join(messages)}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>
"""
    
    def _parse_number(self, num_str) -> float:
        """Parse number string, handling commas and percentages"""
        try:
            if isinstance(num_str, str):
                if ',' in num_str:
                    return float(num_str.replace(',', '').replace('%', '')) / 100
                else:
                    return float(num_str.replace('%', ''))
            return float(num_str)
        except (ValueError, AttributeError, TypeError):
            return 0
    
    def _edu_safe_date_yyyyMMdd(self) -> str:
        """
        Generate EDU-safe date for Tally Educational mode.
        EDU mode allows only 01 or 02 of any month, plus 31-Mar.
        Returns dates within FY 01-Apr-2024 to 31-Mar-2025.
        """
        months = [(2024, m) for m in range(4, 13)] + [(2025, m) for m in range(1, 4)]
        y, m = random.choice(months)
        if y == 2025 and m == 3:
            day = random.choice([1, 2, 31])
        else:
            day = random.choice([1, 2])
        
        return f"{y}{m:02d}{day:02d}"
