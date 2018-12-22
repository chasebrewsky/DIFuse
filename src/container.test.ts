import { Service, ServiceID, Token } from './service';
import { Container } from './container';

describe('Container.constant()', () => {
  test('creates a constant that can be retrieved from the container', () => {
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
      const service = container.get(attempt.token);
      expect(service).toBe(attempt.value);
    }
  });
});

describe('Container.service', () => {
  test('allows', () => {

  });
});

describe('Container.get', () => {
  test('allows child containers to request constants from parents', () => {
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
      const child = new Container();

      parent.constant(attempt.token, attempt.value);
      child.inherit(parent);
      expect(child.get(attempt.token)).toBe(attempt.value);
    }
  });

  test('allows child container to request services from parents', () => {
    const attempts: {
      service: Service<any>,
    }[] = [
      { service: class Service {} },
      { service: class Another {} },
      { service: class Final {} },
    ];

    for (const attempt of attempts) {
      const parent = new Container();
      const child = new Container();

      parent.service(attempt.service);
      child.inherit(parent);
      expect(child.get(attempt.service)).toBeInstanceOf(attempt.service);
    }
  });

  test('allows child container to request interfaces from parents', () => {
    const attempts: {
      service: Service<any>,
      token: Token<any>,
    }[] = [
      { service: class Service {}, token: new Token('Service') },
      { service: class Another {}, token: new Token('Another') },
      { service: class Final {}, token: new Token('Final') },
    ];

    for (const attempt of attempts) {
      const parent = new Container();
      const child = new Container();

      parent.interface(attempt.token, attempt.service);
      child.inherit(parent);
      expect(child.get(attempt.token)).toBeInstanceOf(attempt.service);
    }
  });

  test('errors if a service and its dependency count does not match', () => {
    const container = new Container();
    const constants: {
      token: Token<any>
      value: any,
    }[] = [...Array(3)].map((_, index) => ({
      token: new Token(String(index)),
      value: index,
    }));
    const attempts: {
      service: Service<any>,
      dependencies: ServiceID<any>[],
    }[] = [
      {
        service: class Service { constructor(one: number, two: number) {} },
        dependencies: [constants[0].token],
      },
      {
        service: class Another { constructor(one: number) {} },
        dependencies: [constants[0].token, constants[1].token],
      },
      {
        service: class Final { constructor() {} },
        dependencies: [constants[0].token, constants[1].token, constants[2].token],
      },
    ];

    for (const constant of constants) {
      container.constant(constant.token, constant.value);
    }

    for (const attempt of attempts) {
      expect(() => container.get(attempt.service)).toThrow(Error);
    }
  });

  test('errors if a service cannot resolve a dependency', () => {

  });
});
