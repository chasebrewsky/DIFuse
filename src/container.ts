import { Service, ServiceID, Token } from './service';
import { Provider, ConstantProvider, InterfaceProvider, ServiceProvider } from './provider';

/**
 * Stores and lazily loads service instances.
 */
export class Container {
  private parents: Set<Container> = new Set();
  private providers: Map<ServiceID<any>, Provider<any>> = new Map();
  private cache: Map<ServiceID<any>, any> = new Map();

  constructor(public name: string = '') {}

  /**
   * Defines a constant value on the container.
   *
   * @param token Token ID to user as the service ID.
   * @param value Value to use for the constant.
   */
  public constant<T>(token: Token<T>, value: T): Container {
    if (!(token instanceof Token)) {
      throw new TypeError("Argument 'token' must be an instance of Token.");
    }
    if (this.providers.has(token)) {
      throw new Error(`Token '${token.name}' is already registered in the container.`);
    }
    this.providers.set(token, new ConstantProvider(token, value));
    return this;
  }

  /**
   * Defines parent containers to inherit services from.
   *
   * @param containers Parent container to retrieve services from.
   */
  public inherit(...containers: Container[]) {
    for (const container of containers) this.parents.add(container);
  }

  /**
   * Defines a service and it's required providers to instantiate with.
   *
   * @param service Service function to instantiate.
   * @param providers Provider dependencies to instantiate the service with.
   * @param container Service level container to use for resolving providers.
   */
  public service<T>(
    service: Service<T>,
    providers: ServiceID<any>[] = [],
    container?: (container: Container) => void,
  ): Container {
    if (typeof service !== 'function') {
      throw new TypeError("Argument 'service' must be a function.");
    }
    this.exists(service);
    const locals = new Container();
    if (container) container(locals);
    this.providers.set(service, new ServiceProvider(service, providers, locals));
    return this;
  }

  /**
   * Defines a service that matches the interface associated with the given token.
   *
   * Validates that that given service matches the interface defined on the token
   * if a validator is present on the token.
   *
   * @param token Token ID with optional interface validator.
   * @param service Service to associated with the given interface within the container.
   * @param providers Providers that the given service requires during instantiation.
   */
  public interface<T>(
    token: Token<T>,
    service: Service<T>,
    providers: ServiceID<any>[] = [],
    container?: (container: Container) => void,
  ): Container {
    if (!(token instanceof Token)) {
      throw new TypeError("Argument 'token' must be an instance of Token.");
    }
    if (typeof service !== 'function') {
      throw new TypeError("Argument 'service' must be a function.");
    }
    this.exists(token);
    const locals = new Container();
    if (container) container(locals);
    this.providers.set(token, new InterfaceProvider(token, service, providers, locals));
    return this;
  }

  public provider<T>(serviceID: ServiceID<T>, get: (container: Container) => T): Container {
    this.exists(serviceID);
    this.providers.set(serviceID, { serviceID, get });
    return this;
  }

  /**
   * Retrieves or instantiates and caches a service matching the given service ID.
   * @param serviceID ID of the service to retrieve from the container.
   */
  public get<T>(serviceID: ServiceID<T>): T {
    // Check for service in local service cache.
    const cached = this.cache.get(serviceID);
    if (cached) return cached as T;
    // Check for service provider in the current list of providers.
    const provider = this.providers.get(serviceID);
    if (provider) {
      // Create service and place in cache if provider is present.
      const service = provider.get(this);
      this.cache.set(serviceID, service);
      return service as T;
    }
    // Check all parent containers for service.
    for (const parent of this.parents) {
      const service = parent.get(serviceID);
      if (service !== undefined) return service as T;
    }
    // Error if service cannot be found.
    throw new Error(`Service '${serviceID.name}' cannot be resolved.`);
  }

  /**
   * Checks if a service already exists in the container and errors if it
   * already exists.
   * @param serviceID Service to check for the existance of.
   */
  private exists(serviceID: ServiceID<any>) {
    if (this.providers.has(serviceID)) {
      throw new Error(
        `Service '${serviceID.name}' is already registered in container '${this.name}'.`,
      );
    }
  }
}
