from typing import Dict, List, Tuple, Any
import tempfile
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, KeepTogether, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm, cm
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from io import BytesIO
from jinja2 import Environment, FileSystemLoader
import os
from pathlib import Path
import decimal
from datetime import datetime

from app.models import Invoice, BusinessProfile, Customer, InvoiceItem, Product, TaxType

# Set decimal precision for currency formatting
decimal.getcontext().prec = 2


def calculate_tax(subtotal: float, tax_rate: float, tax_type: TaxType) -> Dict[str, float]:
    """
    Calculate tax based on tax type (IGST or CGST+SGST)
    """
    if tax_type == TaxType.IGST:
        igst = subtotal * (tax_rate / 100)
        return {
            "tax_amount": igst,
            "cgst": 0,
            "sgst": 0,
            "igst": igst
        }
    else:  # CGST_SGST
        cgst = subtotal * (tax_rate / 200)  # Half rate for CGST
        sgst = subtotal * (tax_rate / 200)  # Half rate for SGST
        return {
            "tax_amount": cgst + sgst,
            "cgst": cgst,
            "sgst": sgst,
            "igst": 0
        }


def num_to_words(num):
    """
    Convert a number to words representation for Indian Rupees
    """
    def _get_words(n):
        units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 
                'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
        tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
        
        if n < 20:
            return units[n]
        
        if n < 100:
            return tens[n // 10] + ('' if n % 10 == 0 else ' ' + units[n % 10])
        
        if n < 1000:
            return units[n // 100] + ' Hundred' + ('' if n % 100 == 0 else ' and ' + _get_words(n % 100))
        
        if n < 100000:
            return _get_words(n // 1000) + ' Thousand' + ('' if n % 1000 == 0 else ' ' + _get_words(n % 1000))
        
        if n < 10000000:
            return _get_words(n // 100000) + ' Lakh' + ('' if n % 100000 == 0 else ' ' + _get_words(n % 100000))
        
        return _get_words(n // 10000000) + ' Crore' + ('' if n % 10000000 == 0 else ' ' + _get_words(n % 10000000))
    
    # Handle zero
    if num == 0:
        return 'Zero'
    
    # Split the number into integer and decimal parts
    int_part = int(num)
    decimal_part = int(round((num - int_part) * 100))
    
    # Convert integer part to words
    words = _get_words(int_part)
    
    # Add decimal part if present
    if decimal_part > 0:
        words += ' and ' + _get_words(decimal_part) + ' Paise'
    
    return words


def generate_invoice_pdf(
    invoice: Invoice,
    business_profile: BusinessProfile,
    customer: Customer,
    items: List[Tuple[InvoiceItem, Product]]
) -> bytes:
    """
    Generate PDF from invoice data using ReportLab with enhanced professional styling
    """
    try:
        print("Initializing PDF generation...")
        buffer = BytesIO()
        
        # Make sure all required attributes are available
        if not hasattr(business_profile, 'name') or not business_profile.name:
            print("Warning: Business name is missing")
            business_profile.name = "Business Name"
            
        if not hasattr(business_profile, 'gstin') or not business_profile.gstin:
            print("Warning: Business GSTIN is missing")
            business_profile.gstin = "N/A"
            
        if not hasattr(business_profile, 'address') or not business_profile.address:
            print("Warning: Business address is missing")
            business_profile.address = ""
            
        if not hasattr(business_profile, 'state') or not business_profile.state:
            print("Warning: Business state is missing")
            business_profile.state = ""
            
        if not hasattr(customer, 'name') or not customer.name:
            print("Warning: Customer name is missing")
            customer.name = "Customer"
            
        if not hasattr(customer, 'address') or not customer.address:
            print("Warning: Customer address is missing")
            customer.address = ""
            
        if not hasattr(customer, 'state') or not customer.state:
            print("Warning: Customer state is missing")
            customer.state = ""
        
        # Create PDF document with A4 paper size (more standard for invoices)
        print("Creating PDF document...")
        buffer = BytesIO()
        
        # Use a slightly smaller page size for more compact layout
        page_width, page_height = A4
        
        # Create a custom canvas to check page count
        class PageCounterCanvas(canvas.Canvas):
            def __init__(self, *args, **kwargs):
                canvas.Canvas.__init__(self, *args, **kwargs)
                self.pages = []
                
            def showPage(self):
                self.pages.append(dict(self.__dict__))
                self._startPage()
                
            def save(self):
                page_count = len(self.pages)
                for page in self.pages:
                    self.__dict__.update(page)
                    self.draw_page_number(page_count)
                    canvas.Canvas.showPage(self)
                canvas.Canvas.save(self)
                
            def draw_page_number(self, page_count):
                if page_count > 1:
                    self.setFont("Helvetica", 7)
                    self.drawRightString(
                        page_width - 10*mm, 
                        10*mm, 
                        f"Page {self._pageNumber} of {page_count}"
                    )
        
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=10*mm,
            leftMargin=10*mm,
            topMargin=10*mm,
            bottomMargin=10*mm,
            title=f"Invoice {invoice.invoice_number}"
        )
        
        # Define professional color scheme with lighter colors
        primary_color = colors.HexColor('#4285F4')  # Google blue
        secondary_color = colors.HexColor('#34A853')  # Google green
        accent_color = colors.HexColor('#FBBC05')  # Google yellow
        light_color = colors.HexColor('#F8F9FA')    # Very light gray for alternating rows
        border_color = colors.HexColor('#E0E0E0')  # Light gray for borders
        text_color = colors.HexColor('#202124')  # Dark gray for text
        
        # Get base styles
        styles = getSampleStyleSheet()
        elements = []
        
        print("Adding styles...")
        # Add custom styles with unique names to avoid conflicts
        try:
            # Title style
            styles.add(ParagraphStyle(
                name='InvoiceTitle',
                parent=styles['Heading1'],
                fontSize=14,
                alignment=TA_CENTER,
                textColor=primary_color,
                spaceAfter=3*mm,
                fontName='Helvetica-Bold',
            ))
            
            # Heading styles
            styles.add(ParagraphStyle(
                name='InvoiceHeading',
                parent=styles['Heading2'],
                fontSize=12,
                textColor=primary_color,
                spaceAfter=2*mm,
                fontName='Helvetica-Bold',
            ))
            
            styles.add(ParagraphStyle(
                name='InvoiceSubheading',
                parent=styles['Heading3'],
                fontSize=10,
                textColor=secondary_color,
                spaceAfter=1*mm,
                fontName='Helvetica-Bold',
            ))
            
            # Text alignment styles
            styles.add(ParagraphStyle(
                name='InvoiceRight',
                parent=styles['Normal'],
                alignment=TA_RIGHT,
                fontSize=8,
                textColor=text_color,
            ))
            
            styles.add(ParagraphStyle(
                name='InvoiceCenter',
                parent=styles['Normal'],
                alignment=TA_CENTER,
                fontSize=8,
                textColor=text_color,
            ))
            
            styles.add(ParagraphStyle(
                name='InvoiceBold',
                parent=styles['Normal'],
                fontName='Helvetica-Bold',
                fontSize=8,
                textColor=text_color,
            ))
            
            styles.add(ParagraphStyle(
                name='InvoiceNormal',
                parent=styles['Normal'],
                fontSize=8,
                leading=10,
                textColor=text_color,
            ))
            
            styles.add(ParagraphStyle(
                name='InvoiceSmall',
                parent=styles['Normal'],
                fontSize=7,
                leading=9,
                textColor=colors.darkgray,
            ))
            
            styles.add(ParagraphStyle(
                name='InvoiceTotal',
                parent=styles['Normal'],
                fontName='Helvetica-Bold',
                fontSize=9,
                alignment=TA_RIGHT,
                textColor=primary_color,
            ))
            
            styles.add(ParagraphStyle(
                name='InvoiceFooter',
                parent=styles['Normal'],
                fontSize=7,
                alignment=TA_CENTER,
                textColor=colors.darkgray,
            ))
            
            # Section title style
            styles.add(ParagraphStyle(
                name='SectionTitle',
                parent=styles['Normal'],
                fontName='Helvetica-Bold',
                fontSize=9,
                textColor=primary_color,
                spaceBefore=2*mm,
                spaceAfter=1*mm,
            ))
            
        except Exception as style_error:
            print(f"Warning: Error adding styles: {str(style_error)}")
            # Continue with existing styles
        
        # Format dates
        print("Adding business details...")
        due_date_str = "N/A"
        if invoice.due_date:
            try:
                due_date_str = invoice.due_date.strftime("%d-%m-%Y")
            except:
                print("Warning: Could not format due date")
                due_date_str = str(invoice.due_date)
        
        invoice_date_str = "N/A"
        if invoice.invoice_date:
            try:
                invoice_date_str = invoice.invoice_date.strftime("%d-%m-%Y")
            except:
                print("Warning: Could not format invoice date")
                invoice_date_str = str(invoice.invoice_date)
        
        # Create a professional header with company name and document type
        # Add a colored background header bar
        header_data = [[
            Paragraph(f'<b>{business_profile.name.upper()}</b>', styles.get('InvoiceTitle', styles['Heading1'])),
            Paragraph('<b>TAX INVOICE</b>', styles.get('InvoiceHeading', styles['Heading2']))
        ]]
        
        header_table = Table(header_data, colWidths=[doc.width * 0.6, doc.width * 0.4])
        header_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        
        elements.append(header_table)
        
        # Add a horizontal line under the header
        elements.append(Table([['']], colWidths=[doc.width], 
                             style=TableStyle([
                                ('LINEBELOW', (0, 0), (-1, 0), 0.5, accent_color),
                                ('BOTTOMPADDING', (0, 0), (-1, 0), 1),
                             ])))
        elements.append(Spacer(1, 2*mm))
        
        # Create a 2-column layout for business and customer info to save space
        # Left column: Business info, Right column: Customer info
        business_info = [
            [Paragraph('<b>FROM:</b>', styles.get('SectionTitle', styles['Normal'])), 
             Paragraph('<b>TO:</b>', styles.get('SectionTitle', styles['Normal']))],
            [Paragraph(f'<b>{business_profile.name}</b>', styles.get('InvoiceBold', styles['Normal'])),
             Paragraph(f'<b>{customer.name}</b>', styles.get('InvoiceBold', styles['Normal']))],
            [Paragraph(f'<b>GSTIN:</b> {business_profile.gstin}', styles.get('InvoiceNormal', styles['Normal'])),
             Paragraph(f'<b>GSTIN:</b> {customer.gstin if customer.gstin else "N/A"}', styles.get('InvoiceNormal', styles['Normal']))],
            [Paragraph(f'{business_profile.address}', styles.get('InvoiceNormal', styles['Normal'])),
             Paragraph(f'{customer.address}', styles.get('InvoiceNormal', styles['Normal']))],
            [Paragraph(f'{business_profile.state}', styles.get('InvoiceNormal', styles['Normal'])),
             Paragraph(f'{customer.state}', styles.get('InvoiceNormal', styles['Normal']))],
        ]
        
        # Create a table with a light background for the business and customer info
        contact_table = Table(business_info, colWidths=[doc.width/2, doc.width/2])
        contact_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('BACKGROUND', (0, 0), (0, 0), light_color),  # Background for "FROM" header
            ('BACKGROUND', (1, 0), (1, 0), light_color),  # Background for "TO" header
        ]))
        
        elements.append(contact_table)
        elements.append(Spacer(1, 3*mm))
        
        # Invoice details in a compact format
        invoice_details = [
            [Paragraph('<b>INVOICE DETAILS</b>', styles.get('SectionTitle', styles['Normal']))],
            [Paragraph(f'<b>Invoice #:</b> {invoice.invoice_number} &nbsp;&nbsp; <b>Date:</b> {invoice_date_str} &nbsp;&nbsp; <b>Due Date:</b> {due_date_str}', 
                      styles.get('InvoiceNormal', styles['Normal']))],
        ]
        
        if hasattr(invoice, 'reference_number') and invoice.reference_number:
            invoice_details.append([Paragraph(f'<b>Reference:</b> {invoice.reference_number}', 
                                            styles.get('InvoiceNormal', styles['Normal']))])
        
        invoice_table = Table(invoice_details, colWidths=[doc.width])
        invoice_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('BACKGROUND', (0, 0), (0, 0), light_color),  # Background for header
        ]))
        
        elements.append(invoice_table)
        elements.append(Spacer(1, 3*mm))
        
        # Invoice items
        print("Adding invoice items...")
        try:
            tax_type = invoice.tax_type
            if not tax_type:
                print("Warning: Tax type is missing, defaulting to CGST_SGST")
                tax_type = TaxType.CGST_SGST
        except Exception as e:
            print(f"Error getting tax type: {str(e)}")
            tax_type = TaxType.CGST_SGST
        
        # Add section title for items
        elements.append(Paragraph('<b>INVOICE ITEMS</b>', styles.get('SectionTitle', styles['Normal'])))
        elements.append(Spacer(1, 1*mm))
        
        # Create better-looking headers with professional styling
        if tax_type == TaxType.IGST:
            item_headers = ['#', 'Item', 'HSN', 'Qty', 'Rate', 'Amount', 'IGST %', 'IGST', 'Total']
        else:  # CGST_SGST
            item_headers = ['#', 'Item', 'HSN', 'Qty', 'Rate', 'Amount', 'CGST %', 'CGST', 'SGST %', 'SGST', 'Total']
        
        # Create an array of header cells with proper style
        styled_headers = []
        for header in item_headers:
            styled_headers.append(Paragraph(f'<b>{header}</b>', styles.get('InvoiceBold', styles['Normal'])))
        
        item_data = [styled_headers]
        
        for idx, (item, product) in enumerate(items, 1):
            try:
                # Safely get product attributes
                product_name = product.name if hasattr(product, 'name') and product.name else "Product"
                product_hsn = product.hsn_sac if hasattr(product, 'hsn_sac') and product.hsn_sac else "N/A"
                product_unit = product.unit if hasattr(product, 'unit') and product.unit else ""
                
                # Safely get item attributes with defaults
                try:
                    quantity = float(item.quantity) if hasattr(item, 'quantity') else 0
                except (TypeError, ValueError):
                    print(f"Warning: Invalid quantity for item {idx}")
                    quantity = 0
                    
                try:
                    rate = float(item.rate) if hasattr(item, 'rate') else 0
                except (TypeError, ValueError):
                    print(f"Warning: Invalid rate for item {idx}")
                    rate = 0
                    
                try:
                    subtotal = float(item.subtotal) if hasattr(item, 'subtotal') else 0
                except (TypeError, ValueError):
                    print(f"Warning: Invalid subtotal for item {idx}")
                    subtotal = quantity * rate
                    
                try:
                    tax_rate = float(item.tax_rate) if hasattr(item, 'tax_rate') else 0
                except (TypeError, ValueError):
                    print(f"Warning: Invalid tax rate for item {idx}")
                    tax_rate = 0
                    
                try:
                    item_total = float(item.total) if hasattr(item, 'total') else 0
                except (TypeError, ValueError):
                    print(f"Warning: Invalid total for item {idx}")
                    # Calculate a reasonable default
                    item_total = subtotal * (1 + tax_rate/100)
                
                # Get tax amounts with safe defaults
                try: 
                    cgst = float(item.cgst) if hasattr(item, 'cgst') else 0
                except (TypeError, ValueError):
                    cgst = subtotal * (tax_rate/200)
                    
                try:
                    sgst = float(item.sgst) if hasattr(item, 'sgst') else 0
                except (TypeError, ValueError):
                    sgst = subtotal * (tax_rate/200)
                    
                try:
                    igst = float(item.igst) if hasattr(item, 'igst') else 0
                except (TypeError, ValueError):
                    igst = subtotal * (tax_rate/100)
                
                # Create a product description that includes any additional description if available
                product_description = product_name
                if hasattr(item, 'description') and item.description:
                    # Limit description length to prevent layout issues
                    short_desc = item.description[:50] + "..." if len(item.description) > 50 else item.description
                    product_description = f"{product_name}<br/><font size='7'>{short_desc}</font>"
                elif hasattr(product, 'description') and product.description:
                    # Limit description length to prevent layout issues
                    short_desc = product.description[:50] + "..." if len(product.description) > 50 else product.description
                    product_description = f"{product_name}<br/><font size='7'>{short_desc}</font>"
                
                if tax_type == TaxType.IGST:
                    row = [
                        str(idx),
                        Paragraph(product_description, styles.get('InvoiceNormal', styles['Normal'])),
                        product_hsn,
                        f"{quantity} {product_unit}",
                        f"{rate:.2f}",
                        f"{subtotal:.2f}",
                        f"{tax_rate:.1f}%",
                        f"{igst:.2f}",
                        Paragraph(f"<b>{item_total:.2f}</b>", styles.get('InvoiceBold', styles['Normal'])),
                    ]
                else:  # CGST_SGST
                    row = [
                        str(idx),
                        Paragraph(product_description, styles.get('InvoiceNormal', styles['Normal'])),
                        product_hsn,
                        f"{quantity} {product_unit}",
                        f"{rate:.2f}",
                        f"{subtotal:.2f}",
                        f"{tax_rate/2:.1f}%",
                        f"{cgst:.2f}",
                        f"{tax_rate/2:.1f}%",
                        f"{sgst:.2f}",
                        Paragraph(f"<b>{item_total:.2f}</b>", styles.get('InvoiceBold', styles['Normal'])),
                    ]
                
                item_data.append(row)
            except Exception as item_error:
                print(f"Error processing item {idx}: {str(item_error)}")
                # Add a placeholder row to avoid breaking the table
                if tax_type == TaxType.IGST:
                    item_data.append([str(idx), "Error processing item", "", "", "", "", "", "", ""])
                else:
                    item_data.append([str(idx), "Error processing item", "", "", "", "", "", "", "", "", ""])
        
        print(f"Created data for {len(item_data)-1} items")
        
        # Set column widths based on tax type - make more compact
        if tax_type == TaxType.IGST:
            col_widths = [
                12,                    # Item number column
                doc.width * 0.28,      # Item description
                doc.width * 0.08,      # HSN/SAC
                doc.width * 0.07,      # Qty
                doc.width * 0.07,      # Rate
                doc.width * 0.09,      # Amount
                doc.width * 0.06,      # IGST %
                doc.width * 0.09,      # IGST
                doc.width * 0.10,      # Total
            ]
        else:
            col_widths = [
                12,                    # Item number column
                doc.width * 0.24,      # Item description
                doc.width * 0.07,      # HSN/SAC
                doc.width * 0.06,      # Qty
                doc.width * 0.06,      # Rate
                doc.width * 0.08,      # Amount
                doc.width * 0.05,      # CGST %
                doc.width * 0.07,      # CGST
                doc.width * 0.05,      # SGST %
                doc.width * 0.07,      # SGST
                doc.width * 0.09,      # Total
            ]
        
        # Create items table with improved styling and height limits
        items_table = Table(item_data, colWidths=col_widths, repeatRows=1)
        
        # Define the table style with alternating row colors and better borders
        table_style = [
            # Header styling
            ('BACKGROUND', (0, 0), (-1, 0), primary_color),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 3),
            ('TOPPADDING', (0, 0), (-1, 0), 3),
            
            # Content styling
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),  # Center the item numbers
            ('ALIGN', (3, 1), (-1, -1), 'RIGHT'),  # Right align numeric columns
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            
            # Grid styling - more subtle borders
            ('GRID', (0, 0), (-1, -1), 0.5, border_color),
            ('LINEBELOW', (0, 0), (-1, 0), 0.5, primary_color),  # Thicker line below header
            
            # Row padding - reduce padding to make more compact
            ('TOPPADDING', (0, 1), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 2),
        ]
        
        # Add alternating row colors for better readability
        for i in range(1, len(item_data)):
            if i % 2 == 0:
                table_style.append(('BACKGROUND', (0, i), (-1, i), light_color))
        
        # Apply the style
        items_table.setStyle(TableStyle(table_style))
        
        # Wrap the table in a try-except to handle potential layout errors
        try:
            # Limit the maximum height of each row to prevent layout errors
            for i, row in enumerate(item_data):
                for j, cell in enumerate(row):
                    if isinstance(cell, Paragraph):
                        # Limit paragraph height
                        cell.wrapOn(doc, col_widths[j], 30*mm)
            
            elements.append(items_table)
        except Exception as table_error:
            print(f"Warning: Error with items table: {str(table_error)}")
            # Create a simpler table as fallback
            simple_headers = ['#', 'Item', 'Qty', 'Rate', 'Amount', 'Tax', 'Total']
            simple_data = [simple_headers]
            
            for idx, (item, product) in enumerate(items, 1):
                product_name = product.name if hasattr(product, 'name') and product.name else "Product"
                quantity = float(item.quantity) if hasattr(item, 'quantity') else 0
                rate = float(item.rate) if hasattr(item, 'rate') else 0
                subtotal = float(item.subtotal) if hasattr(item, 'subtotal') else 0
                tax_amount = float(item.tax_amount) if hasattr(item, 'tax_amount') else 0
                item_total = float(item.total) if hasattr(item, 'total') else 0
                
                simple_data.append([
                    str(idx),
                    product_name,
                    f"{quantity}",
                    f"{rate:.2f}",
                    f"{subtotal:.2f}",
                    f"{tax_amount:.2f}",
                    f"{item_total:.2f}",
                ])
            
            simple_table = Table(simple_data, repeatRows=1)
            simple_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), primary_color),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 0.5, border_color),
            ]))
            
            elements.append(simple_table)
        
        elements.append(Spacer(1, 3*mm))
        
        # Tax summary with better formatting
        print("Adding tax summary...")
        try:
            subtotal_value = float(invoice.subtotal) if hasattr(invoice, 'subtotal') and invoice.subtotal is not None else 0
        except (TypeError, ValueError):
            print("Warning: Invalid subtotal value")
            subtotal_value = 0
        
        # Initialize tax values    
        cgst_total = 0
        sgst_total = 0
        igst_total = 0
        
        # Get tax values safely
        if tax_type == TaxType.CGST_SGST:
            try:
                cgst_total = float(invoice.cgst_total) if hasattr(invoice, 'cgst_total') and invoice.cgst_total is not None else 0
            except (TypeError, ValueError):
                print("Warning: Invalid CGST value")
                
            try:
                sgst_total = float(invoice.sgst_total) if hasattr(invoice, 'sgst_total') and invoice.sgst_total is not None else 0
            except (TypeError, ValueError):
                print("Warning: Invalid SGST value")
        else:
            try:
                igst_total = float(invoice.igst_total) if hasattr(invoice, 'igst_total') and invoice.igst_total is not None else 0
            except (TypeError, ValueError):
                print("Warning: Invalid IGST value")
        
        # Get discount amount if available
        discount_amount = 0
        try:
            if hasattr(invoice, 'discount_amount') and invoice.discount_amount is not None:
                discount_amount = float(invoice.discount_amount)
        except (TypeError, ValueError):
            print("Warning: Invalid discount amount")
        
        # Get round-off amount if available
        round_off = 0
        try:
            if hasattr(invoice, 'round_off') and invoice.round_off is not None:
                round_off = float(invoice.round_off)
        except (TypeError, ValueError):
            print("Warning: Invalid round-off amount")
        
        # Calculate total
        try:
            total_value = float(invoice.total) if hasattr(invoice, 'total') and invoice.total is not None else 0
        except (TypeError, ValueError):
            print("Warning: Invalid total value")
            # Calculate a reasonable default
            if tax_type == TaxType.CGST_SGST:
                total_value = subtotal_value + cgst_total + sgst_total - discount_amount + round_off
            else:
                total_value = subtotal_value + igst_total - discount_amount + round_off
        
        # Add section title for summary
        elements.append(Paragraph('<b>INVOICE SUMMARY</b>', styles.get('SectionTitle', styles['Normal'])))
        elements.append(Spacer(1, 1*mm))
        
        # Creating a more professional-looking summary section
        summary_data = [
            ['Subtotal:', Paragraph(f'₹{subtotal_value:.2f}', styles.get('InvoiceRight', styles['Normal']))],
        ]
        
        # Add appropriate tax rows
        if tax_type == TaxType.CGST_SGST:
            summary_data.extend([
                ['CGST:', Paragraph(f'₹{cgst_total:.2f}', styles.get('InvoiceRight', styles['Normal']))],
                ['SGST:', Paragraph(f'₹{sgst_total:.2f}', styles.get('InvoiceRight', styles['Normal']))],
            ])
        else:
            summary_data.append(['IGST:', Paragraph(f'₹{igst_total:.2f}', styles.get('InvoiceRight', styles['Normal']))])
        
        # Add discount if present
        if discount_amount > 0:
            summary_data.append(['Discount:', Paragraph(f'₹{discount_amount:.2f}', styles.get('InvoiceRight', styles['Normal']))])
        
        # Add round-off if present
        if round_off != 0:
            summary_data.append(['Round Off:', Paragraph(f'₹{round_off:.2f}', styles.get('InvoiceRight', styles['Normal']))])
        
        # Add total with bold styling
        summary_data.append(['', ''])  # Empty row for spacing
        summary_data.append([
            Paragraph('<b>TOTAL:</b>', styles.get('InvoiceTotal', styles['Normal'])),
            Paragraph(f'<b>₹{total_value:.2f}</b>', styles.get('InvoiceTotal', styles['Normal']))
        ])
        
        # Format the summary table with a professional look
        summary_table = Table(summary_data, colWidths=[doc.width * 0.7, doc.width * 0.3])
        summary_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LINEABOVE', (0, -1), (1, -1), 0.5, primary_color),  # Line above total
            ('TOPPADDING', (0, -1), (1, -1), 3),  # Extra padding for total
            ('BOTTOMPADDING', (0, -1), (1, -1), 3),  # Extra padding for total
            ('BACKGROUND', (0, -1), (1, -1), light_color),  # Background color for total row
        ]))
        
        elements.append(summary_table)
        elements.append(Spacer(1, 3*mm))
        
        # Add amount in words in a more compact format
        amount_in_words = num_to_words(total_value)
        elements.append(Paragraph(f'<b>Amount in Words:</b> {amount_in_words} Rupees Only', styles.get('InvoiceSmall', styles['Normal'])))
        elements.append(Spacer(1, 3*mm))
        
        # Notes section if available - make more compact
        if hasattr(invoice, 'notes') and invoice.notes:
            print("Adding notes...")
            elements.append(Paragraph('<b>NOTES:</b>', styles.get('SectionTitle', styles['Normal'])))
            elements.append(Spacer(1, 1*mm))
            
            # Create a bordered box for notes
            notes_table = Table([[Paragraph(invoice.notes, styles.get('InvoiceSmall', styles['Normal']))]], 
                               colWidths=[doc.width])
            notes_table.setStyle(TableStyle([
                ('BOX', (0, 0), (-1, -1), 0.5, border_color),
                ('BACKGROUND', (0, 0), (-1, -1), light_color),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ]))
            
            elements.append(notes_table)
            elements.append(Spacer(1, 3*mm))
        
        # Add payment terms and bank details if available - make more compact
        payment_info = []
        if hasattr(business_profile, 'bank_name') and business_profile.bank_name:
            payment_info.append(Paragraph('<b>BANK DETAILS:</b>', styles.get('InvoiceSmall', styles['Normal'])))
            if hasattr(business_profile, 'bank_name'):
                payment_info.append(Paragraph(f'<b>Bank:</b> {business_profile.bank_name}', styles.get('InvoiceSmall', styles['Normal'])))
            if hasattr(business_profile, 'account_number'):
                payment_info.append(Paragraph(f'<b>Account No:</b> {business_profile.account_number}', styles.get('InvoiceSmall', styles['Normal'])))
            if hasattr(business_profile, 'ifsc_code'):
                payment_info.append(Paragraph(f'<b>IFSC Code:</b> {business_profile.ifsc_code}', styles.get('InvoiceSmall', styles['Normal'])))
            
            # Add payment info in a bordered box
            if payment_info:
                payment_table = Table([[item] for item in payment_info], colWidths=[doc.width * 0.5])
                payment_table.setStyle(TableStyle([
                    ('BOX', (0, 0), (-1, -1), 0.5, border_color),
                    ('BACKGROUND', (0, 0), (0, 0), light_color),  # Only color the header
                    ('TOPPADDING', (0, 0), (-1, -1), 2),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
                    ('LEFTPADDING', (0, 0), (-1, -1), 4),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 4),
                ]))
                elements.append(payment_table)
                elements.append(Spacer(1, 3*mm))
        
        # Footer with thank you note and signature - make more compact
        print("Adding footer...")
        elements.append(Paragraph('<b>THANK YOU FOR YOUR BUSINESS!</b>', styles.get('InvoiceCenter', styles['Normal'])))
        elements.append(Spacer(1, 2*mm))
        
        footer_data = [
            ['', Paragraph(f'For {business_profile.name}', styles.get('InvoiceRight', styles['Normal']))],
            ['', ''],
            ['', Paragraph('<b>Authorized Signatory</b>', styles.get('InvoiceRight', styles['Normal']))],
        ]
        
        footer_table = Table(footer_data, colWidths=[doc.width * 0.6, doc.width * 0.4])
        footer_table.setStyle(TableStyle([
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        elements.append(footer_table)
        elements.append(Spacer(1, 5*mm))
        
        # Final footer with company info and disclaimer
        disclaimer = (
            "This is a computer-generated invoice and requires no signature. "
            "Generated by GSTInvoicePro on " + datetime.now().strftime("%d-%m-%Y %H:%M:%S")
        )
        elements.append(Table([[Paragraph(disclaimer, styles.get('InvoiceFooter', styles['Normal']))]], 
                             colWidths=[doc.width],
                             style=TableStyle([
                                 ('ALIGN', (0, 0), (0, 0), 'CENTER'),
                                 ('LINEABOVE', (0, 0), (0, 0), 0.5, border_color),
                                 ('TOPPADDING', (0, 0), (0, 0), 3),
                             ])))
        
        # Build PDF with custom canvas
        print("Building PDF...")
        try:
            # Try to build the PDF with all elements
            doc.build(elements, canvasmaker=PageCounterCanvas)
        except Exception as layout_error:
            print(f"Warning: Layout error in PDF generation: {str(layout_error)}")
            # If there's a layout error, try a more simplified version
            try:
                # Create a simplified version with fewer elements
                simplified_elements = []
                
                # Add only essential elements (header, basic info, summary)
                for element in elements:
                    # Skip complex tables and keep only simple elements
                    if not isinstance(element, Table) or len(element._cellvalues) < 5:
                        simplified_elements.append(element)
                
                # Create a simple note about the simplified version
                simplified_elements.append(Spacer(1, 5*mm))
                simplified_elements.append(Paragraph(
                    "Note: This is a simplified invoice due to layout constraints. Please contact support for a detailed version.",
                    styles.get('InvoiceSmall', styles['Normal'])
                ))
                
                # Build the simplified PDF
                doc = SimpleDocTemplate(
                    buffer,
                    pagesize=A4,
                    rightMargin=10*mm,
                    leftMargin=10*mm,
                    topMargin=10*mm,
                    bottomMargin=10*mm,
                    title=f"Invoice {invoice.invoice_number} (Simplified)"
                )
                doc.build(simplified_elements)
            except Exception as simplified_error:
                print(f"Error creating simplified PDF: {str(simplified_error)}")
                # If even the simplified version fails, create an ultra-simple PDF with no styles
                try:
                    print("Attempting ultra-simple PDF fallback...")
                    ultra_buffer = BytesIO()
                    c = canvas.Canvas(ultra_buffer, pagesize=letter)
                    c.setFont("Helvetica", 14)
                    c.drawString(72, 700, "Error Generating Invoice PDF")
                    c.setFont("Helvetica", 10)
                    c.drawString(72, 670, "An error occurred while generating the PDF:")
                    c.drawString(72, 650, str(layout_error)[:100])  # Limit error message length
                    c.drawString(72, 630, "Please check the server logs for more details.")
                    c.save()
                    ultra_pdf = ultra_buffer.getvalue()
                    ultra_buffer.close()
                    print("Created ultra-simple PDF fallback")
                    return ultra_pdf
                except:
                    # If even this fails, return a simple error message as PDF
                    print("Using emergency text-only PDF")
                    simple_buffer = BytesIO()
                    simple_buffer.write(b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Resources<<>>/Contents 4 0 R>>endobj 4 0 obj<</Length 68>>stream\nBT\n/F1 12 Tf\n72 700 Td\n(Error Generating Invoice PDF) Tj\nET\nendstream\nendobj\ntrailer<</Size 5/Root 1 0 R>>\n%%EOF")
                    simple_pdf = simple_buffer.getvalue()
                    simple_buffer.close()
                    return simple_pdf
        
        # Get PDF data from buffer
        pdf_data = buffer.getvalue()
        buffer.close()
        
        print("PDF generation completed successfully")
        return pdf_data
        
    except Exception as e:
        print(f"Error in generate_invoice_pdf: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Create a simple error PDF as fallback
        try:
            print("Attempting to create error fallback PDF...")
            error_buffer = BytesIO()
            doc = SimpleDocTemplate(
                error_buffer,
                pagesize=letter,
                rightMargin=72,
                leftMargin=72,
                topMargin=72,
                bottomMargin=72
            )
            
            # Use only built-in styles to avoid any style conflicts
            styles = getSampleStyleSheet()
            elements = []
            
            # Use only default styles without adding custom ones
            elements.append(Paragraph('Error Generating Invoice PDF', styles['Heading1']))
            elements.append(Spacer(1, 0.25*inch))
            elements.append(Paragraph('An error occurred while generating the PDF:', styles['Normal']))
            elements.append(Paragraph(str(e), styles['Normal']))
            elements.append(Spacer(1, 0.25*inch))
            elements.append(Paragraph('Please check the server logs for more details.', styles['Normal']))
            
            # Use very simple elements to minimize potential errors
            doc.build(elements)
            
            fallback_pdf = error_buffer.getvalue()
            error_buffer.close()
            print("Created fallback error PDF")
            return fallback_pdf
            
        except Exception as fallback_error:
            print(f"Critical error creating fallback PDF: {str(fallback_error)}")
            # If even the fallback fails, create an ultra-simple PDF with no styles
            try:
                print("Attempting ultra-simple PDF fallback...")
                ultra_buffer = BytesIO()
                c = canvas.Canvas(ultra_buffer, pagesize=letter)
                c.setFont("Helvetica", 14)
                c.drawString(72, 700, "Error Generating Invoice PDF")
                c.setFont("Helvetica", 10)
                c.drawString(72, 670, "An error occurred while generating the PDF:")
                c.drawString(72, 650, str(e)[:100])  # Limit error message length
                c.drawString(72, 630, "Please check the server logs for more details.")
                c.save()
                ultra_pdf = ultra_buffer.getvalue()
                ultra_buffer.close()
                print("Created ultra-simple PDF fallback")
                return ultra_pdf
            except:
                # If even this fails, return a simple error message as PDF
                print("Using emergency text-only PDF")
                simple_buffer = BytesIO()
                simple_buffer.write(b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Resources<<>>/Contents 4 0 R>>endobj 4 0 obj<</Length 68>>stream\nBT\n/F1 12 Tf\n72 700 Td\n(Error Generating Invoice PDF) Tj\nET\nendstream\nendobj\ntrailer<</Size 5/Root 1 0 R>>\n%%EOF")
                simple_pdf = simple_buffer.getvalue()
                simple_buffer.close()
                return simple_pdf 


def generate_invoice_pdf_html(
    invoice: Invoice,
    business_profile: BusinessProfile,
    customer: Customer,
    items: List[Tuple[InvoiceItem, Product]]
) -> bytes:
    """
    Generate PDF from invoice data using HTML/CSS via WeasyPrint
    This provides a more reliable and easier to maintain alternative to ReportLab
    """
    try:
        print("Initializing HTML-based PDF generation...")
        
        # Load the HTML template
        template_dir = Path(__file__).parent.parent / 'templates'
        env = Environment(loader=FileSystemLoader(str(template_dir)))
        template = env.get_template('invoice.html')
        
        # Format dates
        invoice_date_str = "N/A"
        if invoice.invoice_date:
            try:
                invoice_date_str = invoice.invoice_date.strftime("%d-%m-%Y")
            except:
                invoice_date_str = str(invoice.invoice_date)
                
        due_date_str = "N/A"
        if invoice.due_date:
            try:
                due_date_str = invoice.due_date.strftime("%d-%m-%Y")
            except:
                due_date_str = str(invoice.due_date)
        
        # Calculate amount in words
        total_value = float(invoice.total) if hasattr(invoice, 'total') and invoice.total is not None else 0
        amount_in_words = num_to_words(total_value)
        
        # Prepare context for the template
        context = {
            'invoice': invoice,
            'business': business_profile,
            'customer': customer,
            'items': items,
            'amount_in_words': amount_in_words,
            'generation_time': datetime.now().strftime("%d-%m-%Y %H:%M:%S")
        }
        
        # Render HTML
        html_content = template.render(**context)
        
        try:
            # Try to use WeasyPrint if available
            from weasyprint import HTML, CSS
            from weasyprint.text.fonts import FontConfiguration
            
            # Add custom CSS for better styling
            css_content = """
            @page {
                size: A4;
                margin: 1.5cm;
            }
            body {
                font-family: Arial, sans-serif;
                font-size: 10pt;
                color: #202124;
            }
            .invoice-box {
                max-width: 800px;
                margin: auto;
                padding: 20px;
                border: 1px solid #eee;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.15);
                font-size: 10pt;
                line-height: 1.2;
            }
            .invoice-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 20px;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
            }
            table th {
                background-color: #4285F4;
                color: white;
                font-weight: bold;
                padding: 5px;
                text-align: left;
                font-size: 9pt;
            }
            table td {
                padding: 5px;
                border-bottom: 1px solid #eee;
                font-size: 9pt;
            }
            table tr:nth-child(even) {
                background-color: #f8f9fa;
            }
            .total {
                font-weight: bold;
                font-size: 11pt;
                text-align: right;
            }
            .amount-in-words {
                font-style: italic;
                font-size: 9pt;
                margin-bottom: 10px;
            }
            .footer {
                margin-top: 20px;
                text-align: center;
                color: #777;
                font-size: 8pt;
            }
            """
            
            font_config = FontConfiguration()
            html = HTML(string=html_content)
            css = CSS(string=css_content)
            
            # Generate PDF
            pdf_content = html.write_pdf(stylesheets=[css], font_config=font_config)
            print(f"HTML-based PDF generated successfully, size: {len(pdf_content)} bytes")
            return pdf_content
            
        except ImportError:
            # If WeasyPrint is not available, try xhtml2pdf
            try:
                import xhtml2pdf.pisa as pisa
                
                # Create PDF
                pdf_buffer = BytesIO()
                pisa.CreatePDF(html_content, dest=pdf_buffer)
                pdf_content = pdf_buffer.getvalue()
                pdf_buffer.close()
                
                print(f"xhtml2pdf-based PDF generated successfully, size: {len(pdf_content)} bytes")
                return pdf_content
                
            except ImportError:
                # If xhtml2pdf is not available, fall back to ReportLab
                print("HTML PDF libraries not available, falling back to ReportLab")
                return generate_invoice_pdf(invoice, business_profile, customer, items)
                
    except Exception as e:
        print(f"Error in generate_invoice_pdf_html: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Fall back to ReportLab if HTML generation fails
        return generate_invoice_pdf(invoice, business_profile, customer, items)


def generate_gst_irp_json(
    invoice: Invoice,
    business_profile: BusinessProfile,
    customer: Customer,
    items: List[Tuple[InvoiceItem, Product]]
) -> dict:
    """
    Generate JSON in the IRP schema format required by the Indian GST e-invoice system.
    This format is compliant with the GST portal for manual upload and e-invoice generation.
    
    Returns a dictionary that can be converted to JSON for upload to the GST portal.
    """
    try:
        # Format dates
        invoice_date_str = ""
        if invoice.invoice_date:
            try:
                # GST portal requires date in DD/MM/YYYY format
                invoice_date_str = invoice.invoice_date.strftime("%d/%m/%Y")
            except:
                invoice_date_str = ""
        
        # Determine document type
        doc_type = "INV"  # Default to invoice
        if hasattr(invoice, 'document_type'):
            if invoice.document_type == DocumentType.CREDIT_NOTE:
                doc_type = "CRN"
            elif invoice.document_type == DocumentType.DEBIT_NOTE:
                doc_type = "DBN"
        
        # Determine supply type
        supply_type_code = "B2B"  # Default to B2B
        if hasattr(invoice, 'supply_type'):
            if invoice.supply_type == SupplyType.B2C:
                supply_type_code = "B2C"
            elif invoice.supply_type == SupplyType.EXPORT:
                supply_type_code = "EXPWOP"  # Export without payment
        
        # Get transaction details
        transaction_details = {
            "TaxSch": "GST",
            "SupTyp": supply_type_code,
            "RegRev": "N",  # Reverse charge - default to No
            "EcmGstin": None,  # E-commerce GSTIN if applicable
            "IgstOnIntra": "N"  # IGST on intra-state supply - default to No
        }
        
        # Get document details
        document_details = {
            "Typ": doc_type,
            "No": invoice.invoice_number,
            "Dt": invoice_date_str
        }
        
        # Get seller (business) details
        seller_details = {
            "Gstin": business_profile.gstin,
            "LglNm": business_profile.name,
            "TrdNm": business_profile.name,  # Trade name, using the same as legal name
            "Addr1": business_profile.address.split('\n')[0] if business_profile.address else "",
            "Addr2": " ".join(business_profile.address.split('\n')[1:]) if business_profile.address and len(business_profile.address.split('\n')) > 1 else "",
            "Loc": business_profile.state,
            "Pin": business_profile.pincode if hasattr(business_profile, 'pincode') else "",
            "Stcd": get_state_code(business_profile.state),  # Get state code from state name
            "Ph": business_profile.phone if hasattr(business_profile, 'phone') else "",
            "Em": business_profile.email if hasattr(business_profile, 'email') else ""
        }
        
        # Get buyer (customer) details
        buyer_details = {
            "Gstin": customer.gstin if customer.gstin else "URP",  # URP for unregistered person
            "LglNm": customer.name,
            "TrdNm": customer.name,  # Trade name, using the same as legal name
            "Pos": get_state_code(customer.state),  # Place of supply - state code
            "Addr1": customer.address.split('\n')[0] if customer.address else "",
            "Addr2": " ".join(customer.address.split('\n')[1:]) if customer.address and len(customer.address.split('\n')) > 1 else "",
            "Loc": customer.state,
            "Pin": customer.pincode if hasattr(customer, 'pincode') else "",
            "Stcd": get_state_code(customer.state),  # Get state code from state name
            "Ph": customer.phone if hasattr(customer, 'phone') else "",
            "Em": customer.email if hasattr(customer, 'email') else ""
        }
        
        # Process items
        item_list = []
        for idx, (item, product) in enumerate(items, 1):
            # Get basic item details
            product_name = product.name if hasattr(product, 'name') and product.name else "Product"
            hsn_sac = product.hsn_sac if hasattr(product, 'hsn_sac') and product.hsn_sac else ""
            quantity = float(item.quantity) if hasattr(item, 'quantity') else 0
            rate = float(item.rate) if hasattr(item, 'rate') else 0
            unit = product.unit if hasattr(product, 'unit') else "NOS"  # Default to NOS (Numbers)
            
            # Calculate values
            taxable_value = float(item.subtotal) if hasattr(item, 'subtotal') else 0
            
            # Get tax details
            tax_rate = float(item.tax_rate) if hasattr(item, 'tax_rate') else 0
            cgst_rate = tax_rate / 2 if invoice.tax_type == TaxType.CGST_SGST else 0
            sgst_rate = tax_rate / 2 if invoice.tax_type == TaxType.CGST_SGST else 0
            igst_rate = tax_rate if invoice.tax_type == TaxType.IGST else 0
            
            cgst_amount = float(item.cgst) if hasattr(item, 'cgst') else 0
            sgst_amount = float(item.sgst) if hasattr(item, 'sgst') else 0
            igst_amount = float(item.igst) if hasattr(item, 'igst') else 0
            
            # Create item entry
            item_entry = {
                "SlNo": str(idx),
                "PrdDesc": product_name,
                "IsServc": "Y" if (hasattr(product, 'is_service') and product.is_service) else "N",
                "HsnCd": hsn_sac,
                "Qty": quantity,
                "Unit": unit,
                "UnitPrice": rate,
                "TotAmt": taxable_value,
                "Discount": 0,  # Default to 0
                "AssAmt": taxable_value,
                "GstRt": tax_rate,
                "IgstAmt": igst_amount,
                "CgstAmt": cgst_amount,
                "SgstAmt": sgst_amount,
                "CesRt": 0,  # Cess rate - default to 0
                "CesAmt": 0,  # Cess amount - default to 0
                "CesNonAdvlAmt": 0,  # Non-advaloram cess - default to 0
                "StateCesRt": 0,  # State cess rate - default to 0
                "StateCesAmt": 0,  # State cess amount - default to 0
                "StateCesNonAdvlAmt": 0,  # State non-advaloram cess - default to 0
                "OthChrg": 0,  # Other charges - default to 0
                "TotItemVal": float(item.total) if hasattr(item, 'total') else 0
            }
            
            item_list.append(item_entry)
        
        # Calculate value details
        subtotal = float(invoice.subtotal) if hasattr(invoice, 'subtotal') and invoice.subtotal is not None else 0
        cgst_total = float(invoice.cgst_total) if hasattr(invoice, 'cgst_total') and invoice.cgst_total is not None else 0
        sgst_total = float(invoice.sgst_total) if hasattr(invoice, 'sgst_total') and invoice.sgst_total is not None else 0
        igst_total = float(invoice.igst_total) if hasattr(invoice, 'igst_total') and invoice.igst_total is not None else 0
        
        discount_amount = float(invoice.discount_amount) if hasattr(invoice, 'discount_amount') and invoice.discount_amount is not None else 0
        round_off = float(invoice.round_off) if hasattr(invoice, 'round_off') and invoice.round_off is not None else 0
        
        total_value = float(invoice.total) if hasattr(invoice, 'total') and invoice.total is not None else 0
        
        # Value details
        value_details = {
            "AssVal": subtotal,
            "CgstVal": cgst_total,
            "SgstVal": sgst_total,
            "IgstVal": igst_total,
            "CesVal": 0,  # Cess value - default to 0
            "StCesVal": 0,  # State cess value - default to 0
            "Discount": discount_amount,
            "OthChrg": 0,  # Other charges - default to 0
            "RndOffAmt": round_off,
            "TotInvVal": total_value
        }
        
        # Create the final IRP schema JSON
        irp_json = {
            "Version": "1.1",
            "TranDtls": transaction_details,
            "DocDtls": document_details,
            "SellerDtls": seller_details,
            "BuyerDtls": buyer_details,
            "ItemList": item_list,
            "ValDtls": value_details
        }
        
        return irp_json
        
    except Exception as e:
        print(f"Error generating GST IRP JSON: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}


def get_state_code(state_name: str) -> str:
    """
    Get the state code for GST based on state name.
    Returns the 2-digit state code required by the GST portal.
    """
    state_codes = {
        "JAMMU AND KASHMIR": "01",
        "HIMACHAL PRADESH": "02",
        "PUNJAB": "03",
        "CHANDIGARH": "04",
        "UTTARAKHAND": "05",
        "HARYANA": "06",
        "DELHI": "07",
        "RAJASTHAN": "08",
        "UTTAR PRADESH": "09",
        "BIHAR": "10",
        "SIKKIM": "11",
        "ARUNACHAL PRADESH": "12",
        "NAGALAND": "13",
        "MANIPUR": "14",
        "MIZORAM": "15",
        "TRIPURA": "16",
        "MEGHALAYA": "17",
        "ASSAM": "18",
        "WEST BENGAL": "19",
        "JHARKHAND": "20",
        "ODISHA": "21",
        "CHHATTISGARH": "22",
        "MADHYA PRADESH": "23",
        "GUJARAT": "24",
        "DADRA AND NAGAR HAVELI AND DAMAN AND DIU": "26",
        "MAHARASHTRA": "27",
        "ANDHRA PRADESH": "28",
        "KARNATAKA": "29",
        "GOA": "30",
        "LAKSHADWEEP": "31",
        "KERALA": "32",
        "TAMIL NADU": "33",
        "PUDUCHERRY": "34",
        "ANDAMAN AND NICOBAR ISLANDS": "35",
        "TELANGANA": "36",
        "LADAKH": "38",
        "OTHER TERRITORY": "97",
        "FOREIGN COUNTRY": "96",
        "CENTRE JURISDICTION": "99"
    }
    
    # Normalize state name for comparison
    normalized_state = state_name.strip().upper()
    
    # Try direct match
    if normalized_state in state_codes:
        return state_codes[normalized_state]
    
    # Try partial match
    for state, code in state_codes.items():
        if state in normalized_state or normalized_state in state:
            return code
    
    # Default to Other Territory if no match found
    return "97"