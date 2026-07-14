import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

const TOUR_SEEN_KEY = 'business_nexus_tour_seen';

interface TourStep {
  /** data-tour attribute of the target; null renders a centered welcome card. */
  target: string | null;
  title: string;
  content: string;
}

const steps: TourStep[] = [
  {
    target: null,
    title: 'Welcome to Business Nexus 👋',
    content: 'Let\'s take a quick tour of everything you can do here — it only takes a minute.',
  },
  {
    target: 'sidebar',
    title: 'Your navigation hub',
    content: 'All modules live here: dashboard, meetings, video calls, documents, wallet, and more.',
  },
  {
    target: 'nav-meetings',
    title: 'Schedule meetings',
    content: 'Book time with your connections on a full calendar, share availability, and accept requests.',
  },
  {
    target: 'nav-video-call',
    title: 'Jump on a video call',
    content: 'Start a WebRTC video call with camera, mic controls, and screen sharing.',
  },
  {
    target: 'nav-document-chamber',
    title: 'Close deals in the Document Chamber',
    content: 'Upload contracts, track Draft → In Review → Signed status, and e-sign with your own signature.',
  },
  {
    target: 'nav-wallet',
    title: 'Wallet & payments',
    content: 'Deposit, withdraw, transfer, and fund deals — with a full transaction history.',
  },
  {
    target: 'wallet-banner',
    title: 'Your balance at a glance',
    content: 'Your wallet balance is always visible right on the dashboard. Click it to manage payments.',
  },
  {
    target: 'tour-button',
    title: 'Replay anytime',
    content: 'That\'s the tour! Click this button whenever you want to see it again.',
  },
];

interface TourContextValue {
  startTour: () => void;
}

const TourContext = createContext<TourContextValue>({ startTour: () => undefined });

export const useTour = () => useContext(TourContext);

const findTarget = (step: TourStep): HTMLElement | null =>
  step.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null;

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const autoStarted = useRef(false);

  const active = stepIndex !== null;
  const step = active ? steps[stepIndex] : null;

  const dashboardRoute = user?.role === 'entrepreneur'
    ? '/dashboard/entrepreneur'
    : '/dashboard/investor';

  const startTour = useCallback(() => {
    // The tour highlights dashboard elements, so make sure we're there.
    if (!location.pathname.startsWith('/dashboard')) {
      navigate(dashboardRoute);
    }
    setStepIndex(0);
  }, [location.pathname, navigate, dashboardRoute]);

  const endTour = useCallback(() => {
    setStepIndex(null);
    localStorage.setItem(TOUR_SEEN_KEY, 'true');
  }, []);

  // Auto-start on the first dashboard visit.
  useEffect(() => {
    if (
      user &&
      !autoStarted.current &&
      !localStorage.getItem(TOUR_SEEN_KEY) &&
      location.pathname.startsWith('/dashboard')
    ) {
      // Mark as started inside the timer so StrictMode's double effect
      // run (which cancels the first timer) doesn't swallow the tour.
      const timer = setTimeout(() => {
        autoStarted.current = true;
        setStepIndex(0);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [user, location.pathname]);

  // Skip steps whose target isn't on screen (e.g. sidebar links on mobile).
  const resolveStep = useCallback((index: number, direction: 1 | -1): number | null => {
    let i = index;
    while (i >= 0 && i < steps.length) {
      if (steps[i].target === null || findTarget(steps[i])) return i;
      i += direction;
    }
    return null;
  }, []);

  const goTo = (index: number, direction: 1 | -1) => {
    const resolved = resolveStep(index, direction);
    if (resolved === null) {
      endTour();
    } else {
      setStepIndex(resolved);
    }
  };

  // Measure the current target, keeping it in view.
  useEffect(() => {
    if (!step) {
      setRect(null);
      return;
    }
    const measure = () => {
      const el = findTarget(step);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    const el = findTarget(step);
    el?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step]);

  const tooltipStyle = useMemo((): React.CSSProperties => {
    if (!rect) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
    const margin = 12;
    const tooltipWidth = 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow > 220
      ? rect.bottom + margin
      : Math.max(margin, rect.top - 200 - margin);
    const left = Math.min(
      Math.max(margin, rect.left + rect.width / 2 - tooltipWidth / 2),
      window.innerWidth - tooltipWidth - margin
    );
    return { top, left, width: tooltipWidth };
  }, [rect]);

  const isLast = active && resolveStep(stepIndex! + 1, 1) === null;

  return (
    <TourContext.Provider value={{ startTour }}>
      {children}

      {active && step && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-label="Guided tour">
          {/* Backdrop / spotlight */}
          {rect ? (
            <div
              className="absolute rounded-lg transition-all duration-300 pointer-events-none"
              style={{
                top: rect.top - 6,
                left: rect.left - 6,
                width: rect.width + 12,
                height: rect.height + 12,
                boxShadow: '0 0 0 9999px rgba(17, 24, 39, 0.65)',
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-gray-900/65" />
          )}

          {/* Tooltip */}
          <div
            className="absolute bg-white rounded-xl shadow-2xl p-5 animate-slide-in max-w-[calc(100vw-24px)]"
            style={tooltipStyle}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-gray-900">{step.title}</h3>
              <button
                onClick={endTour}
                aria-label="Skip tour"
                className="p-1 -m-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-600">{step.content}</p>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {stepIndex! + 1} / {steps.length}
              </span>
              <div className="flex gap-2">
                {stepIndex! > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<ArrowLeft size={14} />}
                    onClick={() => goTo(stepIndex! - 1, -1)}
                  >
                    Back
                  </Button>
                )}
                <Button
                  size="sm"
                  rightIcon={isLast ? undefined : <ArrowRight size={14} />}
                  onClick={() => (isLast ? endTour() : goTo(stepIndex! + 1, 1))}
                >
                  {isLast ? 'Finish' : 'Next'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </TourContext.Provider>
  );
};

export const TourButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { startTour } = useTour();
  return (
    <button
      data-tour="tour-button"
      onClick={startTour}
      className={`inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md transition-colors duration-200 ${className}`}
      title="Take a guided tour"
    >
      <Sparkles size={18} className="mr-2" />
      Tour
    </button>
  );
};
