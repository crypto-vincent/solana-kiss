/**
 * Observable that emits values of type `T`.
 * @typeParam T - Emitted value type.
 */
export type RxObservable<T> = {
  /**
   * Subscribes a listener to emitted values.
   * @param listener - Called on each emitted value.
   * @returns Unsubscriber function.
   */
  subscribe: (listener: RxListener<T>) => RxUnsubscriber;
};

/**
 * Observer that pushes values of type `T` to subscribers.
 * @typeParam T - Emitted value type.
 */
export type RxObserver<T> = {
  /**
   * Pushes a value to all subscribers.
   * @param value - Value to emit.
   */
  notify(value: T): void;
};

/**
 * Synchronously exposes the current value of type `T`.
 * @typeParam T - Held value type.
 */
export type RxBehaviour<T> = {
  /**
   * @returns Current held value.
   */
  get(): T;
};

/** Callback invoked when an {@link RxObservable} emits. */
export type RxListener<T> = (value: T) => void;

/** Cancels a previously registered subscription. */
export type RxUnsubscriber = () => void;

/**
 * Behaviour subject combining {@link RxBehaviour}, {@link RxObservable}, and {@link RxObserver}.
 * New subscribers immediately receive the current value.
 * @param firstValue - Initial value.
 * @returns Combined subject object.
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
