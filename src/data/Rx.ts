export type RxObservable<T> = {
  subscribe: (listener: RxListener<T>) => RxUnsubscriber;
};
export type RxObserver<T> = {
  notify: RxListener<T>;
};
export type RxBehaviour<T> = {
  get: () => T;
};

export type RxListener<T> = (value: T) => void;
export type RxUnsubscriber = () => void;

export function rxBehaviourSubject<T>(
  firstValue: T,
): RxBehaviour<T> & RxObservable<T> & RxObserver<T> {
  let lastValue = firstValue;
  const observers = new Set<RxListener<T>>();
  return {
    get: () => {
      return lastValue;
    },
    notify: (newValue: T) => {
      lastValue = newValue;
      for (const observer of observers) {
        observer(newValue);
      }
    },
    subscribe: (observer: RxListener<T>): RxUnsubscriber => {
      observer(lastValue);
      observers.add(observer);
      return () => {
        observers.delete(observer);
      };
    },
  };
}
