import { Token } from './service';
import { Container } from './container';

describe('Container.constant()', () => {
  test('sets a constant onto the container', () => {
    const container = new Container();
    const attempts: {
      token: Token<any>,
      value: any,
    }[] = [
      { token: new Token('hello'), value: 'hello' },
      { token: new Token('two'), value: 2 },
      { token: new Token('null'), value: null },
      { token: new Token('object'), value: { key: 'value' } },
      { token: new Token('array'), value: ['hello', 'there'] },
    ];

    for (const attempt of attempts) {
      container.constant(attempt.token, attempt.value);
      expect(container.get(attempt.token)).toBe(attempt.value);
    }
  });

  test('should error if passed in token parameter is not a Token', () => {
    const container = new Container();

    expect(() => container.constant('hey' as any, 'hey')).toThrow();
  });
});

describe('Container.service()', () => {
  test('sets a service with no dependencies onto the container', () => {
    const container = new Container();
    class Service {}

    container.service(Service);
    expect(container.get(Service)).toBeInstanceOf(Service);
  });

  test('sets a service with dependencies onto the container', () => {
    const container = new Container();
    const one = new Token();
    const two = new Token();
    class Service { constructor(public one: any, public two: any) {} }

    container.constant(one, 1);
    container.constant(two, 2);
    container.service(Service, [one, two]);

    const service = container.get(Service)!;

    expect(service).toBeDefined();
    expect(service.one).toEqual(1);
    expect(service.two).toEqual(2);
  });

  test('allows a local container to override parent values', () => {
    const token = new Token();
    const container = new Container();
    const expected = 'resolved';
    class Service { constructor(public result: string) {} }

    container.constant(token, 'unresolved');
    container.service(Service, [token], (locals) => {
      locals.constant(token, expected);
    });

    const service = container.get(Service) as Service;

    expect(service.result).toEqual(expected);
  });

  test('errors if the passed in service is not a function', () => {
    const container = new Container();

    expect(() => container.service('hey' as any)).toThrow();
  });
});

describe('Container.get()', () => {
  test('retrieves constants from parent containers', () => {
    const attempts: {
      token: Token<any>,
      value: any,
    }[] = [
      { token: new Token('hello'), value: 'hello' },
      { token: new Token('two'), value: 2 },
      { token: new Token('null'), value: null },
    ];

    for (const attempt of attempts) {
      const parent = new Container();
      const container = new Container();

      parent.constant(attempt.token, attempt.value);
      container.inherit(parent);
      expect(container.get(attempt.token)).toBe(attempt.value);
    }
  });

  test('retrieves services from parent containers', () => {
    const parent = new Container();
    const container = new Container();

    class Service {}

    parent.service(Service);
    container.inherit(parent);
    expect(container.get(Service)).toBeInstanceOf(Service);
  });

  test('retrieves interfaces from parent containers', () => {
    const parent = new Container();
    const container = new Container();
    const token = new Token();

    class Service {}

    parent.interface(token, Service);
    container.inherit(parent);
    expect(container.get(token)).toBeInstanceOf(Service);
  });

  test('returns undefined if a value cannot be found', () => {
    const container = new Container();

    expect(container.get(new Token())).toBeUndefined();
  });
});

describe('Container.has()', () => {
  test('returns true if the service is located in cache', () => {
    const container = new Container();
    const token = new Token();

    container.constant(token, 'hello');
    container.get(token);
    expect(container.has(token)).toEqual(true);
  });

  test('returns true if the provider is located on the container', () => {
    const container = new Container();
    const token = new Token();

    container.constant(token, 'hello');
    expect(container.has(token)).toEqual(true);
  });

  test('returns true of the parent has the service', () => {
    const container = new Container();
    const parent = new Container();
    const token = new Token();

    parent.constant(token, 'hello');
    container.inherit(parent);
    expect(container.has(token)).toEqual(true);
  });

  test('returns false if the container is not located anywhere', () => {
    const container = new Container();

    expect(container.has(new Token())).toEqual(false);
  });

  test('returns false if the containers parents do not have the service', () => {
    const container = new Container();

    container.inherit(new Container());
    expect(container.has(new Token())).toEqual(false);
  });
});

describe('Container.interface()', () => {
  test('should error if a token is not passed as the token parameter', () => {
    const container = new Container();
    class Service {}

    expect(() => container.interface('hey' as any, Service)).toThrow();
  });

  test('errors if a function is not passed as the service parameter', () => {
    const container = new Container();
    const token = new Token();

    expect(() => container.interface(token, 'hey' as any)).toThrow();
  });

  test('allows a local container to overwrite parent container values', () => {
    const container = new Container();
    class Service { constructor(public result: string) {} }
    const token = new Token<Service>();
    const value = new Token();
    const result = 'resolved';

    container.constant(value, 'unresolved');
    container.interface(token, Service, [value], (container) => {
      container.constant(value, result);
    });
    expect(container.get(token)!.result).toEqual(result);
  });
});

describe('Container.provider()', () => {
  test('sets a generic provider onto the container', () => {
    const container = new Container();
    const token = new Token();
    const value = 'resolved';

    container.provider(token, container => value);
    expect(container.get(token)).toEqual(value);
  });
});
