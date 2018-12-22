import { Container } from './container';
import { Service, ServiceID, Token } from './service';

/**
 * Object responsible for creating an instantiation of a service.
 */
export interface Provider<T> {
  // ID of the service this provider creates.
  serviceID: ServiceID<T>;
  /**
   * Creates an instantiation of the service associated with this provider.
   * @param container Container to use to resolve service dependencies.
   */
  get(container: Container): T;
}

/**
 * Provider implementation that returns a constant value.
 */
export class ConstantProvider<T> implements Provider<T> {
  constructor(public serviceID: Token<T>, private value: T) {}

  /**
   * Returns an instance of the constant used to create this provider.
   *
   * @param container Parent container to use when
   */
  public get(container: Container): T {
    return this.value;
  }
}

/**
 * Provider implementation that returns an instantiated service.
 */
export class ServiceProvider<T> implements Provider<T> {
  /**
   * Constructor for the ServiceProvider.
   *
   * @param serviceID Service function to use as the ID and instantiation.
   * @param providers Provider dependencies required to instantiate the service.
   * @param container Service level container to retrieve services from.
   */
  constructor(
    public serviceID: Service<T>,
    private providers: ServiceID<any>[] = [],
    private container?: Container,
  ) {
    if (this.serviceID.length !== this.providers.length) {
      throw new Error(
        `Expected '${this.serviceID.length}' arguments for service '${this.serviceID.name}' but ` +
        `received '${this.providers.length}'`,
      );
    }
  }

  /**
   * Returns an instance of the service used to create this provider.
   *
   * @param container Parent container to use when
   */
  public get(container: Container): T {
    if (this.container) this.container.inherit(container);

    const services: any[] = [];
    const resolver = this.container ? this.container : container;

    for (const provider of this.providers) services.push(resolver.get(provider));

    return new this.serviceID(...services);
  }
}

/**
 * Provider implementation that returns an instantiated service to associate with
 * a given Token.
 */
export class InterfaceProvider<T> implements Provider<T> {
  /**
   * Constructor of an InterfaceProvider.
   *
   * @param serviceID Token to use as the interfaces service ID.
   * @param service Service function to use to instantiate the service.
   * @param providers Provider dependencies needed to instantiate the service.
   * @param container Service level container to use to resolve dependencies.
   */
  constructor(
    public serviceID: Token<T>,
    private service: Service<T>,
    private providers: ServiceID<any>[],
    private container?: Container,
  ) {
    if (this.service.length !== this.providers.length) {
      throw new Error(
        `Expected '${this.service.length}' arguments for interface '${this.serviceID.name}' but ` +
        `received '${this.providers.length}'.`,
      );
    }
  }

  /**
   * Returns an instance of the service used to create this provider.
   *
   * @param container Parent container to use when
   */
  public get(container: Container): T {
    if (this.container) this.container.inherit(container);

    const services: any[] = [];
    const resolver = this.container ? this.container : container;

    for (const provider of this.providers) services.push(resolver.get(provider));

    return new this.service(...services);
  }
}
