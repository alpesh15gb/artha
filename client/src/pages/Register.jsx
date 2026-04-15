import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { Button, Input } from '../components/ui';
import api from '../services/api';
import toast from 'react-hot-toast';

function Register() {
  const navigate = useNavigate();
  const register = useAuthStore(state => state.register);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    try {
      await register(formData.get('email'), formData.get('password'), formData.get('name'));
      toast.success('Registered successfully!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Create an account</h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input label="Full Name" name="name" type="text" required />
            <Input label="Email address" name="email" type="email" required />
            <Input label="Password" name="password" type="password" required />
          </div>
          <Button type="submit" loading={loading} className="w-full">Sign Up</Button>
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account? <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">Sign in</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Register;
