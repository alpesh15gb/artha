import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../services/api';
import { useBusinessStore } from '../store/auth';
import toast from 'react-hot-toast';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Download } from 'lucide-react';

function Import() {
  const { currentBusiness } = useBusinessStore();
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [clearExisting, setClearExisting] = useState(true);

  const importMutation = useMutation({
    mutationFn: async (formData) => {
      const response = await api.post('/import/vyapar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Import started! Processing your data...');
      checkImportStatus(data.data?.importId || data.importId);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Import failed');
    },
  });

  const checkImportStatus = async (importId) => {
    if(!importId) return;
    const checkStatus = async () => {
      try {
        const response = await api.get(`/import/status/${importId}`);
        const status = response.data.data;

        if (status.status === 'COMPLETED') {
          toast.success(`Import completed! ${status.recordsImported} records imported.`);
          return;
        } else if (status.status === 'FAILED') {
          toast.error('Import failed. Please check the file format.');
          return;
        }

        setTimeout(checkStatus, 2000);
      } catch (error) {
        console.error('Error checking import status:', error);
      }
    };
    checkStatus();
  };

  const handleFile = (file) => {
    if (!file) return;

    const validExtensions = ['.json', '.vyb'];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!validExtensions.includes(ext)) {
      toast.error('Please upload a JSON or .vyb (Vyapar backup) file');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('businessId', currentBusiness?.id);
    formData.append('clearExisting', clearExisting ? 'true' : 'false');

    importMutation.mutate(formData);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Import Data</h1>
        <p className="text-gray-500">Import data from Vyapar or other accounting software</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Vyapar Export</h2>
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Drag and drop your file here</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-primary mt-2"
                disabled={importMutation.isPending}
              >
                {importMutation.isPending ? 'Importing...' : 'Select File'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.vyb"
                onChange={(e) => handleFile(e.target.files[0])}
                className="hidden"
              />
            </div>
            
            <div className="mt-4 flex items-center gap-2">
              <input type="checkbox" id="clearExisting" checked={clearExisting} onChange={(e) => setClearExisting(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
              <label htmlFor="clearExisting" className="text-sm text-gray-600">Clear existing data before import</label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Import;
