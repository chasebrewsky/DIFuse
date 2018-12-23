import { Container } from './container';
import { Service, ServiceID, Token } from './service';

/**
 * Object responsible for creating a service instance.
 */
export interface Provider<T> {
  serviceID: ServiceID<T>;
  /**
   * Creates an the service instance associated with this provider.
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
   * @param serviceID Service function to use as the ID and instantiation.
   * @param dependencies Provider dependencies required to instantiate the service.
   * @param locals Service level container to retrieve services from.
   */
  constructor(
    public serviceID: Service<T>,
    private dependencies: ServiceID<any>[] = [],
    private locals?: Container,
  ) {
    if (this.serviceID.length !== this.dependencies.length) {
      throw new Error(
        `Expected '${this.serviceID.length}' arguments for service '${this.serviceID.name}' but ` +
        `received '${this.dependencies.length}'`,
      );
    }
  }

  /**
   * Returns an instance of the service used to create this provider.
   * @param container Container to retrieve service dependencies from.
   */
  public get(container: Container): T {
    const services: any[] = [];
    const resolver = this.inherit(container);

    for (const dependency of this.dependencies) {
      if (!resolver.has(dependency)) {
        throw new Error(
          `Dependency '${dependency.name}' cannot be resolved for service ` +
          `'${this.serviceID.name}' from container ${resolver.name}.`,
        );
      }
      services.push(resolver.get(dependency));
    }

    return new this.serviceID(...services);
  }

  /**
   * If a local container is set, add the passed in container to the local containers
   * parents and return the new local container. Otherwise just return the passed
   * in container.
   * @param container Container to inherit from.
   */
  private inherit(container: Container): Container {
    if (!this.locals) return container;

    this.locals.inherit(container);

    return this.locals;
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
   * @param dependencies Provider dependencies needed to instantiate the service.
   * @param locals Service level container to use to resolve dependencies.
   */
  constructor(
    public serviceID: Token<T>,
    private service: Service<T>,
    private dependencies: ServiceID<any>[],
    private locals?: Container,
  ) {
    if (this.service.length !== this.dependencies.length) {
      throw new Error(
        `Expected '${this.service.length}' arguments for interface '${this.serviceID.name}' but ` +
        `received '${this.dependencies.length}'.`,
      );
    }
  }

  /**
   * Returns an instance of the service used to create this provider.
   *
   * @param container Parent container to use when
   */
  public get(container: Container): T {
    const services: any[] = [];
    const resolver = this.inherit(container);

    for (const dependency of this.dependencies) {
      if (!resolver.has(dependency)) {
        throw new Error(
          `Dependency '${dependency.name}' cannot be resolved for service ` +
          `'${this.serviceID.name}' from container ${resolver.name}.`,
        );
      }
      services.push(resolver.get(dependency));
    }

    return new this.service(...services);
  }

  /**
   * If a local container is set, add the passed in container to the local containers
   * parents and return the new local container. Otherwise just return the passed
   * in container.
   * @param container Container to inherit from.
   */
  private inherit(container: Container): Container {
    if (!this.locals) return container;

    this.locals.inherit(container);

    return this.locals;
  }
}
