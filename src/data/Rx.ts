/**
 * A reactive observable that allows listeners to subscribe to a stream of values of type `T`.
 * @typeParam T - The type of values emitted by this observable.
 */
export type RxObservable<T> = {
  subscribe: (listener: RxListener<T>) => RxUnsubscriber;
};

/**
 * A reactive observer that can push new values of type `T` to its subscribers.
 * @typeParam T - The type of values this observer emits.
 */
export type RxObserver<T> = {
  notify(value: T): void;
};

/**
 * A behaviour subject interface that synchronously exposes the current value of type `T`.
 * @typeParam T - The type of the held value.
 */
export type RxBehaviour<T> = {
  get(): T;
};

/**
 * A callback function invoked with a new value whenever an {@link RxObservable} emits.
 * @typeParam T - The type of the value received.
 */
export type RxListener<T> = (value: T) => void;

/**
 * A function that, when called, cancels a previously registered subscription.
 */
export type RxUnsubscriber = () => void;

/**
 * Creates a behaviour subject that combines {@link RxBehaviour}, {@link RxObservable},
 * and {@link RxObserver} into a single object.
 * New subscribers immediately receive the current value upon subscription.
 * @typeParam T - The type of the value managed by this subject.
 * @param firstValue - The initial value held by the subject.
 * @returns An object implementing {@link RxBehaviour}, {@link RxObservable}, and {@link RxObserver}.
 */
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
