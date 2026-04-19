import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessStore } from '../store/auth';
import { Card, Button, Input, Select } from '../components/ui';
import { Building2, Save, ArrowRight } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

function BusinessOnboarding() {
  const navigate = useNavigate();
  const { fetchBusinesses, setCurrentBusiness } = useBusinessStore();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      legalName: formData.get('legalName'),
      gstin: formData.get('gstin'),
      address: {
        city: formData.get('city'),
        state: formData.get('state'),
      }
    };

    try {
      const res = await api.post('/businesses', data);
      if (res.data.success) {
        toast.success('Business created successfully!');
        await fetchBusinesses();
        setCurrentBusiness(res.data.data);
        navigate('/');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create business');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-xl w-full !p-8 border-none shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-gray-900">Setup Your Business</h1>
          <p className="text-gray-500 mt-2">Let's get started by creating your first business workspace.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Input label="Business Name *" name="name" placeholder="e.g. Acme Corporation" required />
            <Input label="Legal Name (Optional)" name="legalName" placeholder="e.g. Acme Corp Pvt Ltd" />
            <Input label="GSTIN (Optional)" name="gstin" placeholder="22AAAAA0000A1Z5" />
            
            <div className="grid grid-cols-2 gap-4">
              <Input label="City" name="city" placeholder="Mumbai" />
              <Input label="State" name="state" placeholder="Maharashtra" />
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full h-12 text-lg" icon={ArrowRight}>
            Create Business & Continue
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default BusinessOnboarding;
