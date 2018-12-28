import { Service, Token } from './service';
import { Container } from './container';
import { ConstantProvider, InterfaceProvider, ServiceProvider } from './provider';

describe('ConstantProvider.get()', () => {
  test('returns the original value it was provided during initialization', () => {
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
      const container = new Container();
      const provider = new ConstantProvider(attempt.token, attempt.value);

      expect(provider.get(container)).toBe(attempt.value);
    }
  });
});

describe('new ServiceProvider()', () => {
  test('should error if the service argument length does not match the providers length', () => {
    const tokens: Token<any>[] = [...Array(2)].map((_, index) => new Token(String(index)));
    const attempts: {
      service: Service<any>,
      providers: Token<any>[],
    }[] = [
      { service: class Service { constructor(one: any) {} }, providers: [tokens[0], tokens[1]] },
      { service: class Another { constructor() {} }, providers: [tokens[0]] },
      { service: class Final { constructor(one: any) {} }, providers: [] },
    ];

    for (const attempt of attempts) {
      expect(() => new ServiceProvider(attempt.service, attempt.providers)).toThrow();
    }
  });
});

describe('ServiceProvider.get()', () => {
  test('should resolve on services with no dependencies', () => {
    const attempts: {
      service: Service<any>,
    }[] = [
      { service: class Service {} },
      { service: class Another {} },
      { service: class Final {} },
    ];

    for (const attempt of attempts) {
      const container = new Container();
      const provider = new ServiceProvider(attempt.service);

      expect(provider.get(container)).toBeInstanceOf(attempt.service);
    }
  });

  test('should resolve on services with dependencies located in the container', () => {
    const container = new Container();
    const constants: {
      token: Token<any>,
      value: any,
    }[] = [...Array(3)].map((_, index) => ({
      token: new Token(String(index)),
      value: index,
    }));
    const attempts: {
      service: Service<any>,
      providers: Token<any>[],
    }[] = [
      {
        service: class Service { constructor(one: any) {} },
        providers: [constants[0].token],
      },
      {
        service: class Service { constructor(one: any, two: any) {} },
        providers: [constants[0].token, constants[1].token],
      },
      {
        service: class Service { constructor(one: any, two: any, three: any) {} },
        providers: [constants[0].token, constants[1].token, constants[2].token],
      },
    ];

    for (const constant of constants) {
      container.constant(constant.token, constant.value);
    }

    for (const attempt of attempts) {
      container.service(attempt.service, attempt.providers);
      container.get(attempt.service);
    }
  });

  test('should resolve using the passed in local container', () => {
    const token = new Token('value');
    const value = 'resolved';
    const parent = new Container().constant(token, 'unresolved');
    const local = new Container().constant(token, value);

    class Service { constructor(public value: string) {} }

    const provider = new ServiceProvider(Service, [token], local);
    const service = provider.get(parent);

    expect(service.value).toEqual(value);
  });

  test('should error when a dependency cannot be resolved', () => {
    const container = new Container();
    const provider = new ServiceProvider(
      class Service { constructor(value: any) {} },
      [new Token('value')],
    );

    expect(() => provider.get(container)).toThrow();
  });
});

describe('new InterfaceProvider()', () => {
  test('errors when the service argument length and dependecy length do not match', () => {
    const tokens: Token<any>[] = [...Array(2)].map((_, index) => new Token(String(index)));
    const attempts: {
      service: Service<any>,
      dependencies: Token<any>[],
    }[] = [
      {
        service: class Service { constructor(one: any) {} },
        dependencies: [tokens[0], tokens[1]],
      },
      {
        service: class Service { constructor() {} },
        dependencies: [tokens[0]],
      },
      {
        service: class Service { constructor(one: any) {} },
        dependencies: [],
      },
    ];

    for (const attempt of attempts) {
      expect(() => {
        new InterfaceProvider(new Token(), attempt.service, attempt.dependencies);
      }).toThrow();
    }
  });
});

describe('InterfaceProvider.get()', () => {
  test('errors when a dependency cannot be resolved', () => {
    const container = new Container();
    const provider = new InterfaceProvider(
      new Token(),
      class Service { constructor(value: any) {} },
      [new Token()],
    );

    expect(() => provider.get(container)).toThrow();
  });
});
