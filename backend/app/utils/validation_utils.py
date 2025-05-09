import re
from typing import Optional, Tuple, Dict


def validate_hsn_sac(code: str, is_service: bool = False) -> Tuple[bool, Optional[str]]:
    """
    Validates HSN (Harmonized System of Nomenclature) or SAC (Services Accounting Code)
    
    Args:
        code: The HSN or SAC code to validate
        is_service: True if validating a SAC code, False for HSN code
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not code:
        return False, "HSN/SAC code is required"
    
    # Remove any whitespace
    code = code.strip()
    
    if is_service:
        # SAC codes are 6 digits
        if not re.match(r'^\d{6}$', code):
            return False, "SAC code must be exactly 6 digits"
    else:
        # HSN codes can be 4, 6, or 8 digits (most common are 4 or 8)
        if not re.match(r'^\d{4}(\d{2}(\d{2})?)?$', code):
            return False, "HSN code must be 4, 6, or 8 digits"
    
    return True, None


def validate_gstin(gstin: str, country: str = "India") -> Tuple[bool, Optional[str]]:
    """
    Validates Indian Goods and Services Tax Identification Number (GSTIN)
    
    GSTIN structure: 
    - 15 characters
    - First 2 digits: State code
    - Next 10 characters: PAN number
    - Next character: Entity number
    - Next character: Alphabet 'Z' by default
    - Last character: Check digit
    
    Special case: "URP" is valid for foreign customers
    
    Args:
        gstin: The GSTIN to validate
        country: The country of the customer (default: "India")
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not gstin:
        return False, "GSTIN is required"
    
    # Remove whitespace and convert to uppercase
    gstin = gstin.strip().upper()
    
    # Special case for foreign customers with "URP"
    if gstin == "URP":
        if country == "India":
            return False, "URP GSTIN is only valid for foreign customers"
        return True, None
    
    # Check length
    if len(gstin) != 15:
        return False, "GSTIN must be exactly 15 characters"
    
    # Check format using regex
    # First 2 digits (state code) + 10 chars (PAN) + 1 digit (entity) + 1 char (Z) + 1 char (check digit)
    gstin_pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$'
    
    if not re.match(gstin_pattern, gstin):
        return False, "GSTIN format is invalid"
    
    # Validate state code (optional, can be expanded with full state code list)
    state_code = int(gstin[0:2])
    if not (1 <= state_code <= 38):
        return False, f"Invalid state code in GSTIN: {state_code}"
    
    return True, None


def get_state_from_gstin(gstin: str) -> Optional[str]:
    """
    Extract state name from GSTIN
    
    Args:
        gstin: The GSTIN
    
    Returns:
        State name or None if invalid GSTIN
    """
    if not gstin or len(gstin) < 2:
        return None
    
    state_code = gstin[0:2]
    
    # State code mapping
    state_codes: Dict[str, str] = {
        "01": "Jammu and Kashmir",
        "02": "Himachal Pradesh",
        "03": "Punjab",
        "04": "Chandigarh",
        "05": "Uttarakhand",
        "06": "Haryana",
        "07": "Delhi",
        "08": "Rajasthan",
        "09": "Uttar Pradesh",
        "10": "Bihar",
        "11": "Sikkim",
        "12": "Arunachal Pradesh",
        "13": "Nagaland",
        "14": "Manipur",
        "15": "Mizoram",
        "16": "Tripura",
        "17": "Meghalaya",
        "18": "Assam",
        "19": "West Bengal",
        "20": "Jharkhand",
        "21": "Odisha",
        "22": "Chhattisgarh",
        "23": "Madhya Pradesh",
        "24": "Gujarat",
        "25": "Daman and Diu",
        "26": "Dadra and Nagar Haveli",
        "27": "Maharashtra",
        "28": "Andhra Pradesh (before split)",
        "29": "Karnataka",
        "30": "Goa",
        "31": "Lakshadweep",
        "32": "Kerala",
        "33": "Tamil Nadu",
        "34": "Puducherry",
        "35": "Andaman and Nicobar Islands",
        "36": "Telangana",
        "37": "Andhra Pradesh (after split)",
        "38": "Ladakh"
    }
    
    return state_codes.get(state_code) 