export type RxObservable<T> = {
  subscribe: (listener: RxListener<T>) => RxUnsubscriber;
};
export type RxObserver<T> = {
  notify(value: T): void;
};
export type RxBehaviour<T> = {
  get(): T;
};

export type RxListener<T> = (value: T) => void;
export type RxUnsubscriber = () => void;

export function rxBehaviourSubject<T>(
  firstValue: T,
): RxBehaviour<T> & RxObservable<T> & RxObserver<T> {
  let lastValue = firstValue;
  const listeners = new Array<RxListener<T>>();
  return {
    get() {
      return lastValue;
    },
    notify(newValue: T) {
      lastValue = newValue;
      for (const listener of listeners) {
        listener(newValue);
      }
    },
    subscribe(listener: RxListener<T>): RxUnsubscriber {
      listener(lastValue);
      listeners.push(listener);
      return () => {
        const indexListener = listeners.indexOf(listener);
        if (indexListener >= 0) {
          listeners.splice(indexListener, 1);
        }
      };
    },
  };
}
