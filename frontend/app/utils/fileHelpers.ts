'use client';

/**
 * Utility functions for handling file operations in the browser
 */

/**
 * Download a blob as a file with the specified filename
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create a temporary anchor element
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Append to the document, click it, and remove it
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
};

/**
 * Convert a JSON object to a downloadable file
 */
export const downloadJSON = (data: Record<string, unknown>, filename: string): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, filename);
};

/**
 * Convert a CSV string to a downloadable file
 */
export const downloadCSV = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
};

/**
 * Convert an Excel blob to a downloadable file
 */
export const downloadExcel = (blob: Blob, filename: string): void => {
  downloadBlob(blob, `${filename}.xlsx`);
};

/**
 * Open a PDF blob in a new window or download it based on the browser's capability
 */
export const openPdfInNewWindow = (blob: Blob, filename: string): void => {
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Try to open in new window
  const newWindow = window.open(url, '_blank');
  
  // If browser blocked the popup, fallback to download
  if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
    downloadBlob(blob, `${filename}.pdf`);
  } else {
    // Clean up the blob URL after a delay
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }
};

/**
 * Read a file as text (for importing JSON or CSV)
 */
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
};

/**
 * Read a file as JSON (for importing data)
 */
export const readFileAsJson = async (file: File): Promise<Record<string, unknown>> => {
  try {
    const text = await readFileAsText(file);
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON file');
  }
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2);
};

/**
 * Format file size in human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Create a File object from a blob with a specific filename
 */
export const createFileFromBlob = (blob: Blob, filename: string): File => {
  return new File([blob], filename, { type: blob.type });
}; 