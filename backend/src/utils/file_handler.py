import os
import uuid
import subprocess
from typing import Optional, Tuple, Dict, Any
from fastapi import UploadFile, HTTPException


class FileHandler:
    def __init__(self, upload_dir: str = "src/uploads"):
        self.upload_dir = upload_dir
        self.allowed_extensions = ['.pdf', '.png', '.jpg', '.jpeg']
        self.max_file_size = 10 * 1024 * 1024  # 10MB
        
        # Create upload directory if it doesn't exist
        os.makedirs(self.upload_dir, exist_ok=True)

    def validate_file(self, file: UploadFile) -> bool:
        """
        Validate uploaded file
        
        Args:
            file: Uploaded file object
            
        Returns:
            True if valid, raises HTTPException if invalid
        """
        # Check file extension
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in self.allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"File type {file_ext} not allowed. Only PDF, PNG, JPG, and JPEG files are accepted."
            )
        
        return True

    async def save_upload_file(self, file: UploadFile) -> Tuple[str, str]:
        """
        Save uploaded file to temporary storage
        
        Args:
            file: Uploaded file object
            
        Returns:
            Tuple of (file_id, file_path)
        """
        try:
            # Validate file
            self.validate_file(file)
            
            # Generate unique file ID and path
            file_id = str(uuid.uuid4())
            file_ext = os.path.splitext(file.filename or "")[1].lower()
            filename = f"{file_id}{file_ext}"
            file_path = os.path.join(self.upload_dir, filename)
            
            # Save file
            with open(file_path, "wb") as buffer:
                content = await file.read()
                
                # Check file size
                if len(content) > self.max_file_size:
                    raise HTTPException(
                        status_code=413, 
                        detail=f"File size exceeds maximum allowed size of {self.max_file_size // (1024*1024)}MB"
                    )
                
                buffer.write(content)
            
            return file_id, file_path
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")

    def delete_file(self, file_path: str) -> bool:
        """
        Delete file from storage
        
        Args:
            file_path: Path to file to delete
            
        Returns:
            True if deleted successfully, False otherwise
        """
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
            return False
        except Exception:
            return False

    def cleanup_old_files(self, max_age_hours: int = 24) -> int:
        """
        Clean up files older than specified age
        
        Args:
            max_age_hours: Maximum age in hours before deletion
            
        Returns:
            Number of files deleted
        """
        try:
            import time
            current_time = time.time()
            max_age_seconds = max_age_hours * 3600
            deleted_count = 0
            
            for filename in os.listdir(self.upload_dir):
                file_path = os.path.join(self.upload_dir, filename)
                if os.path.isfile(file_path):
                    file_age = current_time - os.path.getctime(file_path)
                    if file_age > max_age_seconds:
                        os.remove(file_path)
                        deleted_count += 1
            
            return deleted_count
            
        except Exception:
            return 0

    def get_file_info(self, file_path: str) -> Optional[dict]:
        """
        Get file information
        
        Args:
            file_path: Path to file
            
        Returns:
            Dictionary with file info or None if file doesn't exist
        """
        try:
            if not os.path.exists(file_path):
                return None
            
            stat = os.stat(file_path)
            return {
                'path': file_path,
                'size': stat.st_size,
                'created': stat.st_ctime,
                'modified': stat.st_mtime,
                'extension': os.path.splitext(file_path)[1].lower()
            }
        except Exception:
            return None

    def extract_csv_with_ocr(self, input_file_path: str, output_file_path: str) -> Optional[dict]:
        """
        Extract data from PDF or Image using OCR and LLM-based CSV extraction
        """
        try:
            import subprocess
            import os
            from PIL import Image
            
            # Generate paths for OCR processing
            base_name = os.path.splitext(input_file_path)[0]
            file_ext = os.path.splitext(input_file_path)[1].lower()
            
            working_pdf_path = input_file_path
            
            # If it's an image, convert to PDF first for ocrmypdf/pdftotext pipeline
            if file_ext in ['.png', '.jpg', '.jpeg']:
                print(f"Converting image {input_file_path} to PDF")
                working_pdf_path = f"{base_name}_temp.pdf"
                image = Image.open(input_file_path)
                if image.mode == 'RGBA':
                    image = image.convert('RGB')
                image.save(working_pdf_path, "PDF", resolution=100.0)
            
            ocr_pdf_path = f"{base_name}_ocr.pdf"
            text_file_path = f"{base_name}_text.txt"
            
            try:
                # Step 1: Apply OCR to the PDF
                print(f"Applying OCR to {working_pdf_path}")
                # Use --force-ocr for images or PDFs that might not have text layers
                ocr_command = [
                    "ocrmypdf", 
                    "--deskew",
                    "--clean",
                    "--rotate-pages",
                    working_pdf_path, 
                    ocr_pdf_path
                ]
                
                # If it was originally a PDF, we can use --skip-text to be faster
                if file_ext == '.pdf':
                    ocr_command.insert(2, "--skip-text")
                
                ocr_result = subprocess.run(ocr_command, capture_output=True, text=True, timeout=120)
                
                if ocr_result.returncode != 0:
                    print(f"OCR failed: {ocr_result.stderr}")
                    # Try fallback: use working PDF without OCR
                    print("Attempting to use original file without OCR...")
                    ocr_pdf_path = working_pdf_path
                
                # Step 2: Extract text from OCR'd PDF
                print(f"Extracting text from {ocr_pdf_path}")
                text_result = subprocess.run([
                    "pdftotext",
                    "-layout",
                    ocr_pdf_path,
                    text_file_path
                ], capture_output=True, text=True, timeout=60)
                
                if text_result.returncode != 0:
                    print(f"Text extraction failed: {text_result.stderr}")
                    # Fallback to simple text extraction if layout fails
                    subprocess.run(["pdftotext", ocr_pdf_path, text_file_path])
                
                # Step 3: Read extracted text
                if not os.path.exists(text_file_path):
                    print("Text file was not created")
                    return None
                
                with open(text_file_path, 'r', encoding='utf-8') as f:
                    extracted_text = f.read()
                
                if not extracted_text.strip():
                    print("No text extracted from file")
                    return None
                
                # Step 4: Use LLM to extract structured CSV data
                from src.llm_agent import LLMReportAgent
                agent = LLMReportAgent()
                csv_data = agent.extract_csv_from_text(extracted_text)
                
                if not csv_data:
                    print("LLM failed to extract CSV data")
                    return None
                
                # Step 5: Save CSV data to output file
                import csv
                with open(output_file_path, 'w', newline='', encoding='utf-8') as csvfile:
                    writer = csv.writer(csvfile)
                    writer.writerow(['test_name', 'value', 'unit', 'range'])  # Header
                    writer.writerows(csv_data)
                
                return {
                    "success": True, 
                    "input": input_file_path, 
                    "output": output_file_path,
                    "extracted_text": extracted_text,
                    "csv_data": csv_data
                }
                
            finally:
                # Cleanup temporary files
                temp_files = [text_file_path]
                if ocr_pdf_path != input_file_path:
                    temp_files.append(ocr_pdf_path)
                if working_pdf_path != input_file_path:
                    temp_files.append(working_pdf_path)
                    
                for temp_file in temp_files:
                    if os.path.exists(temp_file):
                        try:
                            os.remove(temp_file)
                        except Exception as e:
                            print(f"Failed to cleanup {temp_file}: {e}")
                            
        except subprocess.TimeoutExpired:
            print("OCR processing timed out")
            return None
        except Exception as e:
            print(f"Error in OCR extraction: {e}")
            return None

    def extract_csv(self, input_file_path: str, output_file_path: str) -> Optional[dict]:
        """
        Extract the data from the pdf file using OCR-based approach
        """
        return self.extract_csv_with_ocr(input_file_path, output_file_path)
        
    def parse_csv(self, input_file_name: str) -> Optional[dict]:
        """
        Read the csv file and then extract only the useful data from it
        """
        try:
            import pandas as pd
            import re
            
            # Read CSV with header
            df = pd.read_csv(
                input_file_name,
                engine="python",
            )
            
            # Ensure columns are what we expect
            # extract_csv_with_ocr writes: ['test_name', 'value', 'unit', 'range']
            expected_cols = ['test_name', 'value', 'unit', 'range']
            if not all(col in df.columns for col in expected_cols):
                # Fallback if header is missing or different
                df = pd.read_csv(
                    input_file_name,
                    header=None,
                    engine="python",
                    names=expected_cols,
                )
            
            # Create structured data
            structured_data = []
            for row in df.itertuples(index=False):
                # Handle NaN values
                name = str(row.test_name) if pd.notna(row.test_name) else ""
                value = str(row.value) if pd.notna(row.value) else ""
                unit = str(row.unit) if pd.notna(row.unit) else ""
                range_str = str(row.range) if pd.notna(row.range) else ""
                
                # Skip header row if it was read as data
                if name.lower() in ['test_name', 'test', 'name']:
                    continue
                
                # Basic validation: must have a name and some value
                if not name or not value:
                    continue
                
                structured_data.append({
                    "name": name,
                    "value": value,
                    "remark": None, # Remark is not explicitly in the 4-column CSV
                    "range": range_str,
                    "unit": unit
                })
            
            # Save processed file (for debugging)
            processed_file = input_file_name.replace('.csv', '_processed.csv')
            df.to_csv(processed_file, header=True, index=False)
            
            return {
                "success": True, 
                "input": input_file_name,
                "processed_file": processed_file,
                "data": structured_data
            }
        except Exception as e:
            print(f"Error parsing CSV: {e}")
            return None
    
