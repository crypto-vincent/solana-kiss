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

/** Creates a behaviour subject that holds and broadcasts values. */

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
      listeners.push(listener);
      listener(lastValue);
      return () => {
        const index = listeners.indexOf(listener);
        if (index >= 0) {
          listeners.splice(index, 1);
        }
      };
    },
  };
}
