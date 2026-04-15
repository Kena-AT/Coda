import { useStore } from '../store/useStore';
import { soundService } from '../utils/sounds';
import { useCallback } from 'react';

/**
 * useSoundEffect Hook
 * Provides a standardized way to play auditory feedback while respecting user settings.
 */
export const useSoundEffect = () => {
  const { settings } = useStore();

  const play = useCallback((type: 'click' | 'hover' | 'success' | 'error' | 'notification' | 'transition') => {
    // Kill switch for all sounds
    if (!settings.soundEffects) return;

    switch (type) {
      case 'click':
        soundService.playClick();
        break;
      case 'hover':
        soundService.playHover();
        break;
      case 'success':
        soundService.playSuccess();
        break;
      case 'error':
        soundService.playError();
        break;
      case 'notification':
        soundService.playNotification();
        break;
      case 'transition':
        soundService.playTransition();
        break;
    }
  }, [settings.soundEffects]);

  return play;
};
