import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, CircleDollarSign, Building2, LogIn, AlertCircle, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { OtpInput } from '../../components/ui/OtpInput';
import { users } from '../../data/users';
import { UserRole } from '../../types';

type LoginStep = 'credentials' | 'otp';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

const generateOtp = (): string =>
  Array.from({ length: OTP_LENGTH }, () => Math.floor(Math.random() * 10)).join('');

export const LoginPage: React.FC = () => {
  const [step, setStep] = useState<LoginStep>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('entrepreneur');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [expectedOtp, setExpectedOtp] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (step !== 'otp' || resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [step, resendIn]);

  const startOtpStep = () => {
    setExpectedOtp(generateOtp());
    setOtp('');
    setOtpError(false);
    setResendIn(RESEND_SECONDS);
    setStep('otp');
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Same mock credential check the AuthContext performs; the real
    // login is only committed after the OTP step succeeds.
    await new Promise(resolve => setTimeout(resolve, 600));
    const foundUser = users.find(u => u.email === email && u.role === role);
    setIsLoading(false);

    if (!foundUser) {
      setError('Invalid credentials or user not found');
      return;
    }
    startOtpStep();
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== OTP_LENGTH || otp !== expectedOtp) {
      setOtpError(true);
      return;
    }
    setOtpError(false);
    setIsLoading(true);
    try {
      await login(email, password, role);
      navigate(role === 'entrepreneur' ? '/dashboard/entrepreneur' : '/dashboard/investor');
    } catch (err) {
      setError((err as Error).message);
      setStep('credentials');
      setIsLoading(false);
    }
  };

  const resendCode = () => {
    setExpectedOtp(generateOtp());
    setOtp('');
    setOtpError(false);
    setResendIn(RESEND_SECONDS);
  };

  // For demo purposes, pre-filled credentials
  const fillDemoCredentials = (userRole: UserRole) => {
    if (userRole === 'entrepreneur') {
      setEmail('sarah@techwave.io');
      setPassword('password123');
    } else {
      setEmail('michael@vcinnovate.com');
      setPassword('password123');
    }
    setRole(userRole);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-primary-600 rounded-md flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
              <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 21V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {step === 'credentials' ? 'Sign in to Business Nexus' : 'Two-factor authentication'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {step === 'credentials'
            ? 'Connect with investors and entrepreneurs'
            : `Enter the 6-digit code sent to ${email}`}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-error-50 border border-error-500 text-error-700 px-4 py-3 rounded-md flex items-start">
              <AlertCircle size={18} className="mr-2 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === 'credentials' ? (
            <>
              <form className="space-y-6" onSubmit={handleCredentialsSubmit}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    I am a
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      className={`py-3 px-4 border rounded-md flex items-center justify-center transition-colors ${
                        role === 'entrepreneur'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => setRole('entrepreneur')}
                    >
                      <Building2 size={18} className="mr-2" />
                      Entrepreneur
                    </button>

                    <button
                      type="button"
                      className={`py-3 px-4 border rounded-md flex items-center justify-center transition-colors ${
                        role === 'investor'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => setRole('investor')}
                    >
                      <CircleDollarSign size={18} className="mr-2" />
                      Investor
                    </button>
                  </div>
                </div>

                <Input
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                  startAdornment={<User size={18} />}
                />

                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  fullWidth
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                      Remember me
                    </label>
                  </div>

                  <div className="text-sm">
                    <Link to="/forgot-password" className="font-medium text-primary-600 hover:text-primary-500">
                      Forgot your password?
                    </Link>
                  </div>
                </div>

                <Button
                  type="submit"
                  fullWidth
                  isLoading={isLoading}
                  leftIcon={<LogIn size={18} />}
                >
                  Continue
                </Button>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Demo Accounts</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => fillDemoCredentials('entrepreneur')}
                    leftIcon={<Building2 size={16} />}
                  >
                    Entrepreneur Demo
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => fillDemoCredentials('investor')}
                    leftIcon={<CircleDollarSign size={16} />}
                  >
                    Investor Demo
                  </Button>
                </div>
              </div>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or</span>
                  </div>
                </div>

                <div className="mt-2 text-center">
                  <p className="text-sm text-gray-600">
                    Don't have an account?{' '}
                    <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
                      Sign up
                    </Link>
                  </p>
                </div>
              </div>
            </>
          ) : (
            <form className="space-y-6 animate-slide-in" onSubmit={handleOtpSubmit}>
              <div className="flex justify-center">
                <div className="p-3 rounded-full bg-primary-50 text-primary-600">
                  <ShieldCheck size={28} />
                </div>
              </div>

              <OtpInput value={otp} onChange={setOtp} error={otpError} />

              {otpError && (
                <p className="text-center text-sm text-error-700">
                  That code doesn't match. Please try again.
                </p>
              )}

              {/* Mock delivery: there is no real SMS/email in this demo */}
              <div className="rounded-md bg-primary-50 border border-primary-100 px-4 py-3 text-center">
                <p className="text-xs text-primary-700">
                  Demo mode — your verification code is{' '}
                  <span className="font-mono font-bold tracking-widest">{expectedOtp}</span>
                </p>
              </div>

              <Button
                type="submit"
                fullWidth
                isLoading={isLoading}
                disabled={otp.length !== OTP_LENGTH}
                leftIcon={<ShieldCheck size={18} />}
              >
                Verify & Sign in
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => setStep('credentials')}
                  className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                {resendIn > 0 ? (
                  <span className="text-gray-500">Resend code in {resendIn}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={resendCode}
                    className="font-medium text-primary-600 hover:text-primary-500"
                  >
                    Resend code
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
