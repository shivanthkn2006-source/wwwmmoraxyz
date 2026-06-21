import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { thresholdVoiceCommands } from '@/data/universalTimelineData';
import { speakAsZoe } from '@/utils/zoeVoice';

/**
 * ENHANCED UNIVERSAL TIMELINE VOICE COMMANDS V2.00
 * 
 * Comprehensive voice control for Universal Timeline including:
 * - Navigation commands
 * - Search commands
 * - Predictive analysis commands
 * - Threshold exploration
 * - Timeline control (play, pause, speed)
 */
export const useUniversalTimelineVoice = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleZoeCommand = (event: CustomEvent) => {
      const command = event.detail.command?.toLowerCase() || '';
      
      // Navigation commands to open timeline
      if (
        command.includes('universal timeline') ||
        command.includes('cosmic timeline') ||
        command.includes('show universe') ||
        command.includes('explore cosmos') ||
        command.includes('open timeline') ||
        command.includes('show timeline')
      ) {
        if (location.pathname !== '/universal-timeline') {
          navigate('/universal-timeline');
          speakAsZoe('Opening Universal Timeline. Spanning 13.8 billion years from Big Bang to Post-Human Future.');
        }
        return;
      }

        // Only process timeline-specific commands when on the timeline page
      if (location.pathname === '/universal-timeline') {
        
        // PLAY/PAUSE/STOP COMMANDS - New for timeline control
        if (command.includes('play') && !command.includes('timeline play')) {
          window.dispatchEvent(new CustomEvent('timeline-play'));
          return;
        }
        
        if (command.includes('pause') || command.includes('stop')) {
          window.dispatchEvent(new CustomEvent('timeline-pause'));
          return;
        }
        
        // PERSONAL TIMELINE COMMANDS
        if (
          command.includes('my timeline') ||
          command.includes('personal timeline') ||
          command.includes('show my predictions') ||
          command.includes('my future') ||
          command.includes('my cosmic journey')
        ) {
          window.dispatchEvent(new CustomEvent('timeline-show-personal'));
          speakAsZoe('Opening your personal cosmic timeline with Zoe AI future predictions');
          return;
        }
        
        // SEARCH COMMANDS - Enhanced with multiple search patterns
        if (
          command.includes('search') ||
          command.includes('find') ||
          command.includes('look for') ||
          command.includes('show me')
        ) {
          // Extract search query after the command verb
          let searchQuery = '';
          if (command.includes('search for')) {
            searchQuery = command.split('search for')[1]?.trim();
          } else if (command.includes('search')) {
            searchQuery = command.split('search')[1]?.trim();
          } else if (command.includes('find')) {
            searchQuery = command.split('find')[1]?.trim();
          } else if (command.includes('look for')) {
            searchQuery = command.split('look for')[1]?.trim();
          } else if (command.includes('show me')) {
            searchQuery = command.split('show me')[1]?.trim();
          }

          if (searchQuery) {
            window.dispatchEvent(
              new CustomEvent('timeline-search', {
                detail: { query: searchQuery }
              })
            );
            speakAsZoe(`Searching timeline for ${searchQuery}`);
            return;
          }
        }

        // PREDICTIVE ANALYSIS COMMANDS - Enhanced with comprehensive future scenarios
        if (
          command.includes('predict') ||
          command.includes('forecast') ||
          command.includes('what will happen') ||
          command.includes('future of') ||
          command.includes('analyze future') ||
          command.includes('show future') ||
          command.includes('mars colony') ||
          command.includes('space colonization') ||
          command.includes('dyson sphere') ||
          command.includes('kardashev') ||
          command.includes('type two civilization') ||
          command.includes('interstellar travel') ||
          command.includes('consciousness upload') ||
          command.includes('digital immortality') ||
          command.includes('fusion power') ||
          command.includes('space elevator') ||
          command.includes('terraforming') ||
          command.includes('galactic expansion')
        ) {
          window.dispatchEvent(
            new CustomEvent('timeline-navigate', {
              detail: { thresholdId: 10, keyword: 'predictions' }
            })
          );
          speakAsZoe('Analyzing post-human future and beyond. This threshold spans 2025 to 3000 CE, covering AGI emergence, Mars colonization, consciousness upload, Dyson sphere construction, Type II civilization transition, and galactic expansion. Humanity transforms from planet-bound biological species to multi-substrate, space-faring, potentially immortal intelligence network.');
          return;
        }
        
        // SPECIFIC FUTURE SCENARIO COMMANDS
        if (command.includes('near term future') || command.includes('next 25 years')) {
          window.dispatchEvent(
            new CustomEvent('timeline-navigate', {
              detail: { thresholdId: 10, keyword: 'predictions' }
            })
          );
          speakAsZoe('Near-term future: 2025 to 2050. AGI emergence probability exceeds 85% by 2040. Neural interfaces achieve 10,000 channel bidirectionality by 2035. First Mars colony established between 2045 and 2055. Asteroid mining industrialization by 2050. Human longevity extension to 150 plus years by 2050.');
          return;
        }
        
        if (command.includes('mid term future') || command.includes('next century')) {
          window.dispatchEvent(
            new CustomEvent('timeline-navigate', {
              detail: { thresholdId: 10, keyword: 'predictions' }
            })
          );
          speakAsZoe('Mid-term future: 2050 to 2150. Full brain emulation by 2075. Consciousness upload substrates operational by 2090. Human-AI hybrid intelligence widespread by 2080. Interstellar probe missions at 0.1 light speed between 2100 and 2120. Proxima Centauri b exploration mission launches 2125. Mars terraforming complete between 2150 and 2200.');
          return;
        }
        
        if (command.includes('long term future') || command.includes('next millennium')) {
          window.dispatchEvent(
            new CustomEvent('timeline-navigate', {
              detail: { thresholdId: 10, keyword: 'predictions' }
            })
          );
          speakAsZoe('Long-term future: 2150 to 3000 CE and beyond. Dyson sphere construction begins 2200. Type II civilization transition between 2300 and 2500. Kardashev Scale 1.5 to 2.0 achievement by 2500. Post-biological civilization majority by 2200. Galactic colonization wave begins 2300 to 3000. Intergalactic communication networks operational.');
          return;
        }

        // TIMELINE CONTROL COMMANDS
        if (command.includes('play timeline') || command.includes('start timeline')) {
          window.dispatchEvent(new CustomEvent('timeline-play'));
          speakAsZoe('Playing timeline');
          return;
        }

        if (command.includes('pause timeline') || command.includes('stop timeline')) {
          window.dispatchEvent(new CustomEvent('timeline-pause'));
          speakAsZoe('Pausing timeline');
          return;
        }

        if (command.includes('speed up') || command.includes('faster')) {
          window.dispatchEvent(new CustomEvent('timeline-speed-up'));
          speakAsZoe('Increasing timeline speed');
          return;
        }

        if (command.includes('slow down') || command.includes('slower')) {
          window.dispatchEvent(new CustomEvent('timeline-speed-down'));
          speakAsZoe('Decreasing timeline speed');
          return;
        }

        // ARCHITECT MODE COMMANDS
        if (command.includes('architect mode') || command.includes('enable architect')) {
          window.dispatchEvent(new CustomEvent('timeline-architect-mode', { detail: { enabled: true }}));
          speakAsZoe('Enabling Architect Mode. You can now create, edit, and analyze timeline content.');
          return;
        }

        if (command.includes('view mode') || command.includes('disable architect')) {
          window.dispatchEvent(new CustomEvent('timeline-architect-mode', { detail: { enabled: false }}));
          speakAsZoe('Switching to View Mode');
          return;
        }

        // OVERVIEW COMMANDS
        if (command.includes('overview') || command.includes('summary') || command.includes('explain timeline')) {
          speakAsZoe('The Universal Agentic Timeline spans 13.8 billion years across 10 major thresholds. From the Big Bang through stellar formation, chemical complexity, planetary systems, life emergence, human evolution, agricultural revolution, industrial transformation, digital age, to our post-human future. Each threshold represents a fundamental shift in cosmic complexity.');
          return;
        }

        // Threshold navigation by keyword
        for (const [keyword, thresholdId] of Object.entries(thresholdVoiceCommands)) {
          // Skip personal timeline markers
          if (thresholdId === -1) continue;
          
          if (command.includes(keyword)) {
            window.dispatchEvent(
              new CustomEvent('timeline-navigate', {
                detail: { thresholdId, keyword }
              })
            );
            return;
          }
        }

        // "Tell me about" commands - Detailed narration
        if (command.includes('tell me about') || command.includes('explain') || command.includes('describe')) {
          for (const [keyword, thresholdId] of Object.entries(thresholdVoiceCommands)) {
            if (command.includes(keyword)) {
              window.dispatchEvent(
                new CustomEvent('timeline-narrate', {
                  detail: { thresholdId, keyword }
                })
              );
              return;
            }
          }
        }

        // COMPARATIVE ANALYSIS COMMANDS
        if (command.includes('compare') && (command.includes('to') || command.includes('with'))) {
          speakAsZoe('Comparative analysis requires specifying two thresholds. For example: compare big bang to digital age.');
          return;
        }

        // ZOOM COMMANDS
        if (command.includes('zoom in')) {
          window.dispatchEvent(new CustomEvent('timeline-zoom-in'));
          speakAsZoe('Zooming in');
          return;
        }

        if (command.includes('zoom out')) {
          window.dispatchEvent(new CustomEvent('timeline-zoom-out'));
          speakAsZoe('Zooming out');
          return;
        }

        // NAVIGATION BY ERA
        if (command.includes('early universe')) {
          window.dispatchEvent(
            new CustomEvent('timeline-navigate', {
              detail: { thresholdId: 1, keyword: 'early universe' }
            })
          );
          speakAsZoe('Navigating to early universe era');
          return;
        }

        if (command.includes('life era')) {
          window.dispatchEvent(
            new CustomEvent('timeline-navigate', {
              detail: { thresholdId: 5, keyword: 'life era' }
            })
          );
          speakAsZoe('Navigating to life era');
          return;
        }

        if (command.includes('digital era') || command.includes('modern era')) {
          window.dispatchEvent(
            new CustomEvent('timeline-navigate', {
              detail: { thresholdId: 9, keyword: 'digital era' }
            })
          );
          speakAsZoe('Navigating to digital era');
          return;
        }

        // HELIOSPHERE AND DREAMS COMMANDS
        if (
          command.includes('solar system') ||
          command.includes('heliosphere') ||
          command.includes('open planets') ||
          command.includes('explore solar system') ||
          command.includes('show planets')
        ) {
          window.dispatchEvent(new CustomEvent('timeline-open-heliosphere'));
          speakAsZoe('Opening 4K Heliosphere Explorer. Explore our solar system with interactive 3D visualization.');
          return;
        }

        if (
          command.includes('zoe dreams') ||
          command.includes('dream analysis') ||
          command.includes('analyze dreams') ||
          command.includes('dream journal') ||
          command.includes('open dreams')
        ) {
          window.dispatchEvent(new CustomEvent('timeline-open-dreams'));
          speakAsZoe('Opening Zoe Dreams AI. Share your dreams and receive deep psychological insights.');
          return;
        }

        // HELIOSPHERE ADVANCED COMMANDS
        if (command.includes('simulate orbital mechanics')) {
          window.dispatchEvent(new CustomEvent('timeline-open-heliosphere'));
          speakAsZoe('Simulating real-time orbital mechanics. Watch planets move in their elliptical paths around the sun.');
          return;
        }

        if (command.includes('calculate planetary distances')) {
          window.dispatchEvent(new CustomEvent('timeline-open-heliosphere'));
          speakAsZoe('Displaying precise planetary distances in astronomical units. Earth is 1 AU from the sun.');
          return;
        }

        if (command.includes('show gravitational fields')) {
          window.dispatchEvent(new CustomEvent('timeline-open-heliosphere'));
          speakAsZoe('Visualizing gravitational field interactions between celestial bodies.');
          return;
        }

        // DREAMS AI ADVANCED COMMANDS
        if (command.includes('identify recurring dream themes')) {
          window.dispatchEvent(new CustomEvent('timeline-open-dreams'));
          speakAsZoe('Analyzing your dream history to identify recurring themes and symbolic patterns.');
          return;
        }

        if (command.includes('analyze emotional patterns')) {
          window.dispatchEvent(new CustomEvent('timeline-open-dreams'));
          speakAsZoe('Examining emotional patterns across your dreams to reveal subconscious insights.');
          return;
        }

        if (command.includes('predict future dream scenarios')) {
          window.dispatchEvent(new CustomEvent('timeline-open-dreams'));
          speakAsZoe('Using AI to predict potential future dream scenarios based on your patterns.');
          return;
        }
      }
    };

    window.addEventListener('zoe-command' as any, handleZoeCommand as EventListener);
    
    return () => {
      window.removeEventListener('zoe-command' as any, handleZoeCommand as EventListener);
    };
  }, [navigate, location]);
};
