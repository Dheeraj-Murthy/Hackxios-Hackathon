import os
import uuid
from typing import Optional, Tuple, Dict, Any
from fastapi import UploadFile, HTTPException


class FileHandler:
    def __init__(self, upload_dir: str = "src/uploads"):
        self.upload_dir = upload_dir
        self.allowed_extensions = ['.pdf']
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
                detail=f"File type {file_ext} not allowed. Only PDF files are accepted."
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

    def extract_csv(self, input_file_path: str, output_file_path: str) -> Optional[dict]:
        """
        Extract the data from the pdf file and then put it into a temporary csv file
        """
        try:
            import camelot as camelot
            tables = camelot.read_pdf(
                input_file_path,
                flavor="stream",
                pages="all",
                table_areas=["0,630,612,190"],
                columns=["255, 330, 480"],
                row_tol=10,
                edge_tol=500,
                split_text=True,
            )
            
            # Rewrite (truncate) the CSV file at the start
            open(output_file_path, "w").close()
            
            for t in tables:
                df = t.df.replace("\n", " ", regex=True)
                df.to_csv(output_file_path, mode="a", header=False, index=False)
            
            return {"success": True, "input": input_file_path, "output": output_file_path}
        except Exception as e:
            print(f"Error extracting CSV: {e}")
            return None
        
    def parse_csv(self, input_file_name: str) -> Optional[dict]:
        """
        Read the csv file and then extract only the useful data from it
        """
        try:
            import pandas as pd
            import re
            
            df = pd.read_csv(
                input_file_name,
                header=None,
                engine="python",
                names=["name", "value_and_remark", "range", "unit"],
            )
            
            
            
            # Keep only rows that look like actual test results
            df = df[
                df["value_and_remark"].astype(str).str.contains(r"\d", regex=True)
                & ~df["name"].astype(str).str.contains(r"[a-z]", regex=True, na=False)
            ]
            
            # Function to split value_and_remark into separate value and remark
            def split_value_and_remark(value_remark_str):
                if pd.isna(value_remark_str) or str(value_remark_str) == "":
                    return "", None
                
                value_remark_str = str(value_remark_str)
                
                # Pattern to match: number + optional decimal + optional unit + optional remark
                # Examples: "110 mg/dL", "12.5 g/dL", "82", "126", "41 High"
                pattern = r'^(\d+\.?\d*\s*[a-zA-Z/]*)(?:\s+(.+?)$)'
                match = re.match(pattern, value_remark_str)
                
                if match:
                    value_part = match.group(1)
                    remark_part = match.group(2) if match.group(2) else None
                    
                    # If remark is in parentheses, extract content
                    if remark_part and remark_part.startswith('(') and remark_part.endswith(')'):
                        remark_part = remark_part[1:-1]
                    
                    return value_part, remark_part if remark_part else None
                else:
                    # Handle pure numbers without units - treat as value
                    if re.match(r'^\d+\.?\d*$', value_remark_str):
                        return value_remark_str, None
                    # If pattern doesn't match, treat whole string as value
                    return value_remark_str, None
            
            # Create structured data with all 4 columns
            structured_data = []
            for row in df.itertuples(index=False):
                # Handle NaN values by converting None to string
                name = str(row.name) if pd.notna(row.name) else ""
                value_and_remark = str(row.value_and_remark) if pd.notna(row.value_and_remark) else ""
                range_str = str(row.range) if pd.notna(row.range) else ""
                unit = str(row.unit) if pd.notna(row.unit) else ""
                
                # Split value_and_remark into separate value and remark
                value, remark = split_value_and_remark(row.value_and_remark)
                
                structured_data.append({
                    "name": name,
                    "value": value,
                    "remark": remark,
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
    
