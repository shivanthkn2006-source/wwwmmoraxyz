// Event emitter for home page refresh
type RefreshListener = () => void | Promise<unknown>;

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

export const triggerHomeRefresh = async () => {
  await Promise.allSettled(listeners.map((listener) => Promise.resolve(listener())));
};
