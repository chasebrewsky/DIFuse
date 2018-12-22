/**
 * Unique identifier for a service.
 */
export class Token<T> {
  constructor(public name: string = '') {}
}

/**
 * Types that can be used to identify a service.
 */
export type ServiceID<T> = Token<T> | Service<T>;

/**
 * Class definition that defines a service function.
 */
export interface Service<T> extends Function {
  new(...args: any[]): T;
}
