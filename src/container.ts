import { Service, ServiceID, Token } from './service';
import { Provider, ConstantProvider, InterfaceProvider, ServiceProvider } from './provider';

/**
 * Stores and lazily loads service instances.
 */
export class Container {
  private parents: Set<Container> = new Set();
  private providers: Map<ServiceID<any>, Provider<any>> = new Map();
  private cache: Map<ServiceID<any>, any> = new Map();

  /**
   * Creates a Container instance.
   * @param {string} name Descriptive name to give the container for errors.
   */
  constructor(public name: string = '') {}

  /**
   * Defines a constant value on the container.
   * @param token Token ID to user as the service ID.
   * @param value Value to use for the constant.
   * @throws TypeError If the token argument is not a Token.
   */
  public constant<T>(token: Token<T>, value: T): Container {
    if (!(token instanceof Token)) {
      throw new TypeError("Argument 'token' must be an instance of Token.");
    }

    this.providers.set(token, new ConstantProvider(token, value));

    return this;
  }

  /**
   * Defines parent containers to inherit services from.
   *
   * @param containers Parent container to retrieve services from.
   */
  public inherit(...containers: Container[]): Container {
    for (const container of containers) this.parents.add(container);

    return this;
  }

  /**
   * Defines a service and it's required providers to instantiate with.
   *
   * @param service Service function to instantiate.
   * @param dependencies Dependencies to instantiate the service with.
   * @param locals Function that instantiates a local container to use.
   * @throws TypeError If the service argument is not a function.
   */
  public service<T>(
    service: Service<T>,
    dependencies: ServiceID<any>[] = [],
    locals?: (locals: Container) => void,
  ): Container {
    if (typeof service !== 'function') {
      throw new TypeError("Argument 'service' must be a function.");
    }

    const provider = new ServiceProvider(service, dependencies, Container.locals(locals));

    this.providers.set(service, provider);

    return this;
  }

  /**
   * Defines a service that matches the interface associated with the given token.
   *
   * Validates that that given service matches the interface defined on the token
   * if a validator is present on the token.
   *
   * Throws an error if the token or service parameter are not of the right type.
   *
   * @param token Token ID with optional interface validator.
   * @param service Service to associated with the given interface within the container.
   * @param dependencies Dependencies to instantiate the service with.
   * @param locals Function that instantiates a local container to use.
   */
  public interface<T>(
    token: Token<T>,
    service: Service<T>,
    dependencies: ServiceID<any>[] = [],
    locals?: (locals: Container) => void,
  ): Container {
    if (!(token instanceof Token)) {
      throw new TypeError("Argument 'token' must be an instance of Token.");
    }

    if (typeof service !== 'function') {
      throw new TypeError("Argument 'service' must be a function.");
    }

    const provider = new InterfaceProvider(token, service, dependencies, Container.locals(locals));

    this.providers.set(token, provider);

    return this;
  }

  public provider<T>(serviceID: ServiceID<T>, get: (container: Container) => T): Container {
    this.providers.set(serviceID, { serviceID, get });

    return this;
  }

  /**
   * Retrieves service instance from this container or it's parents.
   * @param serviceID Service ID of the service to retrieve.
   */
  public get<T>(serviceID: ServiceID<T>): T | undefined {
    if (this.cache.has(serviceID)) return this.cache.get(serviceID) as T;

    if (this.providers.has(serviceID)) {
      const provider = this.providers.get(serviceID)!;
      const service = provider.get(this);

      this.cache.set(serviceID, service);

      return service as T;
    }

    for (const parent of this.parents) {
      if (parent.has(serviceID)) return parent.get(serviceID);
    }

    return undefined;
  }

  /**
   * Checks if a particular service is present on the container or parent containers.
   * @param serviceID Service identifier.
   */
  public has<T>(serviceID: ServiceID<T>): boolean {
    if (this.cache.has(serviceID)) return true;
    if (this.providers.has(serviceID)) return true;

    for (const parent of this.parents) {
      if (parent.has(serviceID)) return true;
    }

    return false;
  }

  private static locals(locals?: (container: Container) => void): Container | undefined {
    if (!locals) return undefined;

    const container = new Container();

    locals(container);

    return container;
  }
}
