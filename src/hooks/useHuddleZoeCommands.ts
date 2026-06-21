import { useEffect } from 'react';

/**
 * Hook to provide comprehensive Zoe voice command integration for Huddle
 * 
 * Available Zoe commands for Huddle:
 * 
 * View Controls:
 * - "show map view" / "switch to map" / "map mode"
 * - "show grid view" / "switch to grid" / "grid mode"
 * - "toggle view" / "switch view"
 * 
 * Filtering:
 * - "show online users" / "filter online" / "online only"
 * - "show friends only" / "filter friends" / "friends mode"
 * - "filter by [status]" (e.g., "filter by cooking", "filter by yoga", "filter by gaming")
 * - "show users in [location]" (e.g., "show users in Tokyo", "show users in Europe", "show users in Paris")
 * - "clear all filters" / "reset filters" / "remove filters"
 * - "set radius [number]" (e.g., "set radius 200", "radius 500 kilometers")
 * 
 * Navigation:
 * - "zoom in" / "zoom closer"
 * - "zoom out" / "zoom further"
 * - "go to [location]" (e.g., "go to Paris", "go to India", "go to Great Wall", "go to Eiffel Tower")
 * - "search for [user/interest]" (e.g., "search for photographers", "find gamers")
 * - "find [monument]" (e.g., "find Taj Mahal", "show me Colosseum")
 * 
 * Display Modes:
 * - "show all users" / "display everyone"
 * - "show recommendations" / "show matches"
 * - "show [interest category]" (e.g., "show creative users", "show sports enthusiasts", "show tech people")
 * 
 * Location-specific:
 * - "show users near [city]" (e.g., "show users near London", "people near Tokyo")
 * - "find landmarks in [region]" (e.g., "find landmarks in Europe", "monuments in Asia")
 * - "show capital cities" / "display capitals"
 * - "find villages" / "show small towns"
 */
export const useHuddleZoeCommands = () => {
  useEffect(() => {
    const handleZoeCommand = (event: CustomEvent) => {
      const { command, parameters } = event.detail;
      
      switch (command) {
        // View controls
        case 'show_map_view':
        case 'switch_to_map':
          window.dispatchEvent(new CustomEvent('huddle-toggle-view', { detail: { mode: 'map' } }));
          break;
          
        case 'show_grid_view':
        case 'switch_to_grid':
          window.dispatchEvent(new CustomEvent('huddle-toggle-view', { detail: { mode: 'grid' } }));
          break;
          
        case 'toggle_view':
          window.dispatchEvent(new CustomEvent('huddle-toggle-view'));
          break;
        
        // Filtering
        case 'show_online':
        case 'filter_online':
          window.dispatchEvent(new CustomEvent('huddle-show-online'));
          break;
          
        case 'show_friends':
        case 'filter_friends':
          window.dispatchEvent(new CustomEvent('huddle-show-friends'));
          break;
          
        case 'filter_by_status':
          if (parameters?.status) {
            window.dispatchEvent(new CustomEvent('huddle-filter-status', { 
              detail: { status: parameters.status } 
            }));
          }
          break;
          
        case 'filter_by_location':
        case 'show_users_in':
          if (parameters?.location) {
            window.dispatchEvent(new CustomEvent('huddle-filter-location', { 
              detail: { location: parameters.location } 
            }));
          }
          break;
          
        case 'clear_filters':
        case 'reset_filters':
          window.dispatchEvent(new CustomEvent('huddle-clear-filters'));
          break;
          
        case 'set_radius':
          if (parameters?.radius) {
            window.dispatchEvent(new CustomEvent('huddle-set-radius', { 
              detail: { radius: parameters.radius } 
            }));
          }
          break;
        
        // Navigation
        case 'zoom_in':
          window.dispatchEvent(new CustomEvent('huddle-zoom', { detail: { direction: 'in' } }));
          break;
          
        case 'zoom_out':
          window.dispatchEvent(new CustomEvent('huddle-zoom', { detail: { direction: 'out' } }));
          break;
          
        case 'go_to_location':
          if (parameters?.location) {
            window.dispatchEvent(new CustomEvent('huddle-zoom-location', { 
              detail: { location: parameters.location } 
            }));
          }
          break;
          
        case 'search_user':
          if (parameters?.query) {
            window.dispatchEvent(new CustomEvent('huddle-search-user', { 
              detail: { query: parameters.query } 
            }));
          }
          break;
        
        // Display modes
        case 'show_all_users':
          window.dispatchEvent(new CustomEvent('huddle-show-all-users'));
          break;
          
        case 'show_recommendations':
          window.dispatchEvent(new CustomEvent('huddle-show-recommendations'));
          break;
          
        case 'show_category':
          if (parameters?.category) {
            window.dispatchEvent(new CustomEvent('zoe-huddle-category', { 
              detail: { category: parameters.category } 
            }));
          }
          break;
      }
    };
    
    window.addEventListener('zoe-huddle-command', handleZoeCommand as EventListener);
    
    return () => {
      window.removeEventListener('zoe-huddle-command', handleZoeCommand as EventListener);
    };
  }, []);
};
