import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface LockdownOptions {
  onViolationReport?: (type: string) => void;
  enabled?: boolean;
}

export const useAssessmentLockdown = ({ onViolationReport, enabled = true }: LockdownOptions = {}) => {
  const [isFullscreen, setIsFullscreen] = useState(document.fullscreenElement !== null);

  useEffect(() => {
    if (!enabled) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      onViolationReport?.('RIGHT_CLICK_ATTEMPT');
      toast.error('Right-click is disabled.');
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      let violated = false;
      let violationMsg = '';

      // Block F1-F12
      if (e.key.startsWith('F') && e.key.length > 1) {
        violated = true;
        violationMsg = 'Function keys are disabled.';
      }

      // Block Ctrl/Cmd combinations
      const isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl) {
         // Shift + I/J/C/K (DevTools)
         if (e.shiftKey && ['I', 'J', 'C', 'K'].includes(e.key.toUpperCase())) {
            violated = true;
            violationMsg = 'Developer tools blocked.';
         }
         // View Source, Save, Print
         if (['U', 'S', 'P'].includes(e.key.toUpperCase())) {
            violated = true;
            violationMsg = 'This action is disabled.';
         }
      }

      if (violated) {
        e.preventDefault();
        onViolationReport?.('RESTRICTED_KEY_PRESSED');
        toast.error(violationMsg);
      }
    };

    const handleFullscreenChange = () => {
      const isFull = document.fullscreenElement !== null;
      setIsFullscreen(isFull);
      if (!isFull) {
        onViolationReport?.('FULLSCREEN_EXIT');
        toast.error('Fullscreen mode exited! Please re-enter.');
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [enabled, onViolationReport]);

  const enterFullscreen = () => {
    document.documentElement.requestFullscreen().catch(() => {
      toast.error('Fullscreen request failed. Check browser permissions.');
    });
  };

  return { isFullscreen, enterFullscreen };
};
