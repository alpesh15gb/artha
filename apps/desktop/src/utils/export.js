import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const exportToPDF = async (elementId, filename = 'document.pdf') => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 1.5,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 800
    });

    const imgData = canvas.toDataURL('image/png');
    
    // Create PDF with A4 format
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Add 10mm margin
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);
    
    const imgProps = pdf.getImageProperties(imgData);
    const contentHeight = (imgProps.height * contentWidth) / imgProps.width;

    // If content is taller than page, we might need multiple pages, but for now just fit it
    pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, contentHeight);
    pdf.save(filename);
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
};

export const printElement = async (elementId) => {
  // Use native window.print() for maximum quality
  window.print();
};
