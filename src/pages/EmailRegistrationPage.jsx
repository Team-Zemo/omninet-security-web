import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const EmailRegistrationPage = () => {
  const navigate = useNavigate();
  const {
    initiateEmailRegistration,
    verifyEmailOtp,
    completeEmailRegistration,
    resendOtp,
    checkEmail,
    error,
    clearError
  } = useAuthStore();

  const [step, setStep] = useState('initial');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState({
    email: '',
    name: '',
    otpCode: '',
    password: '',
    confirmPassword: '',
    verificationToken: ''
  });

  const handleInitialSubmit = async (e) => {
    e.preventDefault();
    if (!data.email || !data.name) return;

    setIsSubmitting(true);
    clearError();

    try {
      // Check if email exists
      const emailCheck = await checkEmail(data.email);

      // If email is not available (already exists with password), they should login instead
      if (!emailCheck.available) {
        toast.error('An account with this email already exists. Please try logging in instead.');
        setIsSubmitting(false);
        return;
      }

      // Initiate registration (this will work for both new users and OAuth users)
      const response = await initiateEmailRegistration({
        email: data.email,
        name: data.name
      });

      if (response.success) {
        toast.success('OTP sent to your email. Please check your inbox.');
        setStep('otp');
      }
    } catch (error) {
      console.error('Registration initiation failed:', error);
      toast.error(error.response?.data?.message || 'Failed to start registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!data.otpCode) return;

    setIsSubmitting(true);
    clearError();

    try {
      const response = await verifyEmailOtp({
        email: data.email,
        otpCode: data.otpCode
      });

      if (response.success) {
        setData(prev => ({
          ...prev,
          verificationToken: response.verificationToken
        }));

        setStep('password');
        toast.success('OTP verified successfully!');
      }
    } catch (error) {
      console.error('OTP verification failed:', error);

      let errorMessage = 'Invalid OTP code';

      if (error.response?.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      }

      // Show specific error messages for common issues
      if (error.response?.status === 400) {
        if (errorMessage.toLowerCase().includes('expired')) {
          errorMessage = 'Your verification code has expired. Please request a new one.';
        } else if (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('incorrect')) {
          errorMessage = 'Invalid verification code. Please check and try again.';
        } else if (errorMessage.toLowerCase().includes('attempts')) {
          errorMessage = 'Too many failed attempts. Please request a new verification code.';
        }
      }

      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!data.password || !data.confirmPassword) return;

    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (data.password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    setIsSubmitting(true);
    clearError();

    try {
      const response = await completeEmailRegistration({
        email: data.email,
        name: data.name,
        password: data.password,
        verificationToken: data.verificationToken
      });

      if (response.success) {
        if (response.merged) {
          toast.success(`Account merged successfully! You can now sign in with email or ${response.mergedProviders}.`);
        } else {
          toast.success('Registration completed successfully!');
        }
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Registration completion failed:', error);
      toast.error(error.response?.data?.message || 'Failed to complete registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      await resendOtp(data.email);
      toast.success('OTP resent to your email');
    } catch (error) {
      toast.error('Failed to resend OTP');
    }
  };

  const renderInitialForm = () => (
    <form onSubmit={handleInitialSubmit} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={data.email}
          onChange={(e) => setData(prev => ({ ...prev, email: e.target.value }))}
          className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Enter your email"
        />
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Full name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          value={data.name}
          onChange={(e) => setData(prev => ({ ...prev, name: e.target.value }))}
          className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Enter your full name"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !data.email || !data.name}
        className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Sending OTP...' : 'Send Verification Code'}
      </button>
    </form>
  );

  const renderOtpForm = () => (
    <form onSubmit={handleOtpSubmit} className="space-y-6">
      <div className="text-center">
        <p className="text-sm text-gray-600">
          We've sent a 6-digit verification code to <strong>{data.email}</strong>
        </p>
      </div>

      <div>
        <label htmlFor="otpCode" className="block text-sm font-medium text-gray-700">
          Verification Code
        </label>
        <input
          id="otpCode"
          name="otpCode"
          type="text"
          maxLength={6}
          required
          value={data.otpCode}
          onChange={(e) => setData(prev => ({ ...prev, otpCode: e.target.value.replace(/\D/g, '') }))}
          className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-center text-lg tracking-widest"
          placeholder="000000"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || data.otpCode.length !== 6}
        className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Verifying...' : 'Verify Code'}
      </button>

      <div className="text-center">
        <button
          type="button"
          onClick={handleResendOtp}
          className="text-sm text-indigo-600 hover:text-indigo-500"
        >
          Didn't receive the code? Resend
        </button>
      </div>
    </form>
  );

  const renderPasswordForm = () => (
    <form onSubmit={handlePasswordSubmit} className="space-y-6">
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={data.password}
          onChange={(e) => setData(prev => ({ ...prev, password: e.target.value }))}
          className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Enter password (min 8 characters)"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={data.confirmPassword}
          onChange={(e) => setData(prev => ({ ...prev, confirmPassword: e.target.value }))}
          className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Confirm your password"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !data.password || !data.confirmPassword}
        className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Creating Account...' : 'Complete Registration'}
      </button>
    </form>
  );

  const getStepTitle = () => {
    switch (step) {
      case 'initial':
        return 'Create your account';
      case 'otp':
        return 'Verify your email';
      case 'password':
        return 'Set your password';
      default:
        return 'Register';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 'initial':
        return 'Enter your details to get started';
      case 'otp':
        return 'Enter the verification code sent to your email';
      case 'password':
        return 'Create a secure password for your account';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {getStepTitle()}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {getStepDescription()}
          </p>
        </div>

        <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {step === 'initial' && renderInitialForm()}
          {step === 'otp' && renderOtpForm()}
          {step === 'password' && renderPasswordForm()}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailRegistrationPage;