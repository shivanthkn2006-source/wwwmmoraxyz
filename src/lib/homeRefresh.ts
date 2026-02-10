// Event emitter for home page refresh
type RefreshListener = () => void;

const listeners: RefreshListener[] = [];

export const onHomeRefresh = (listener: RefreshListener) => {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
};

export const triggerHomeRefresh = () => {
  listeners.forEach(listener => listener());
};
