import { message } from '../message';

describe('message util', () => {
  it.concurrent('interpolates correctly', () => {
    const template = 'oops... "{{property}}" is missing;error: {{error}}';
    expect(
      message(template, {
        property: 'description',
        error: 'expected property to be truthy',
        path: '',
        description: null,
        value: void 0,
      }),
    ).toEqual('oops... "description" is missing;error: expected property to be truthy');
  });

  it.concurrent('evaluates code', () => {
    const template = 'Property "#{{value.param}}" is missing. Path: #{{path.toUpperCase()}}';
    expect(
      message(template, {
        property: 'description',
        error: 'expected property to be truthy',
        path: 'test',
        description: null,
        value: {
          param: 'test',
        },
      }),
    ).toEqual('Property "test" is missing. Path: TEST');
  });

  it.concurrent.each([0, false, null, undefined])('interpolates %s value correctly', value => {
    const template = 'Value must not equal {{value}}';
    expect(
      message(template, {
        property: 'description',
        error: 'expected property to be truthy',
        path: '',
        description: null,
        value,
      }),
    ).toEqual(`Value must not equal ${value}`);
  });

  it.concurrent('handles siblings', () => {
    const template = '{{error}}{{error}}{{property}}{{bar}}{{error}}{{error}}';
    expect(
      message(template, {
        property: 'baz',
        error: 'foo',
        path: '',
        description: null,
        value: void 0,
      }),
    ).toEqual('foofoobazfoofoo');
  });

  it.concurrent('strips missing keys', () => {
    const template = '{{foo}}missing {{bar}}:(';
    expect(
      message(template, {
        property: 'description',
        error: 'expected property to be truthy',
        path: '',
        description: null,
        value: void 0,
      }),
    ).toEqual('missing :(');
  });
});
