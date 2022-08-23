import '@stoplight/spectral-test-utils/matchers';

import { assertValidRuleset, RulesetValidationError } from '../index';
import AggregateError = require('es-aggregate-error');
import invalidRuleset from './__fixtures__/invalid-ruleset';
import validRuleset from './__fixtures__/valid-flat-ruleset';

import type { Format } from '../../format';
import { RulesetDefinition, RulesetOverridesDefinition } from '../../types';

const formatA: Format = () => false;
const formatB: Format = () => false;

function truthy() {
  // no-op
}

describe('JS Ruleset Validation', () => {
  it.concurrent('given primitive type, throws', () => {
    expect(assertValidRuleset.bind(null, null)).toThrow('Provided ruleset is not an object');
    expect(assertValidRuleset.bind(null, 2)).toThrow('Provided ruleset is not an object');
    expect(assertValidRuleset.bind(null, 'true')).toThrow('Provided ruleset is not an object');
  });

  it.concurrent('given object with no rules and no extends properties, throws', () => {
    expect(assertValidRuleset.bind(null, {})).toThrow('Ruleset must have rules or extends or overrides defined');
    expect(assertValidRuleset.bind(null, { rule: {} })).toThrow(
      'Ruleset must have rules or extends or overrides defined',
    );
  });

  it.concurrent('given object with extends property only, emits no errors', () => {
    expect(assertValidRuleset.bind(null, { extends: [] })).not.toThrow();
  });

  it.concurrent('given object with rules property only, emits no errors', () => {
    expect(assertValidRuleset.bind(null, { rules: {} })).not.toThrow();
  });

  it.concurrent('given invalid ruleset, throws', () => {
    expect(assertValidRuleset.bind(null, invalidRuleset)).toThrowAggregateError(
      new AggregateError([
        new RulesetValidationError('the rule must have at least "given" and "then" properties', [
          'rules',
          'no-given-no-then',
        ]),
        new RulesetValidationError('allowed types are "style" and "validation"', [
          'rules',
          'rule-with-invalid-enum',
          'type',
        ]),
        new RulesetValidationError('the value has to be one of: 0, 1, 2, 3 or "error", "warn", "info", "hint", "off"', [
          'rules',
          'rule-with-invalid-enum',
          'severity',
        ]),
      ]),
    );
  });

  it.concurrent('given valid ruleset should, emits no errors', () => {
    expect(assertValidRuleset.bind(null, validRuleset)).not.toThrow();
  });

  it.concurrent.each([false, 2, null, 'foo', '12.foo.com'])(
    'given invalid %s documentationUrl in a rule, throws',
    documentationUrl => {
      expect(assertValidRuleset.bind(null, { documentationUrl, rules: {} })).toThrowAggregateError(
        new AggregateError([new RulesetValidationError('must be a valid URL', ['documentationUrl'])]),
      );

      expect(
        assertValidRuleset.bind(null, {
          rules: {
            rule: {
              documentationUrl,
              given: '$',
              then: {
                function: truthy,
              },
            },
          },
        }),
      ).toThrowAggregateError(
        new AggregateError([new RulesetValidationError('must be a valid URL', ['rules', 'rule', 'documentationUrl'])]),
      );
    },
  );

  it.concurrent('recognizes valid documentationUrl', () => {
    expect(
      assertValidRuleset.bind(null, {
        documentationUrl: 'https://stoplight.io/p/docs/gh/stoplightio/spectral/docs/reference/openapi-rules.md',
        rules: {},
      }),
    ).not.toThrow();

    expect(
      assertValidRuleset.bind(null, {
        rules: {
          rule: {
            documentationUrl: 'https://stoplight.io/p/docs/gh/stoplightio/spectral/docs/reference/openapi-rules.md',
            given: '$',
            then: {
              function: truthy,
            },
          },
        },
      }),
    ).not.toThrow();
  });

  it.concurrent.each(['error', 'warn', 'info', 'hint', 'off'])('recognizes human-readable %s severity', severity => {
    expect(
      assertValidRuleset.bind(null, {
        rules: {
          rule: severity,
        },
      }),
    ).not.toThrow();

    expect(
      assertValidRuleset.bind(null, {
        rules: {
          rule: {
            given: '$.info',
            then: {
              function: truthy,
            },
            severity,
          },
        },
      }),
    ).not.toThrow();
  });

  it.concurrent('recognizes valid array-ish extends syntax', () => {
    const rulesetA = {
      rules: {},
    };

    const rulesetB = {
      extends: [],
    };

    expect(
      assertValidRuleset.bind(null, {
        extends: [[rulesetA, 'off'], rulesetB],
        rules: {},
      }),
    ).not.toThrow();
  });

  it.concurrent.each<[unknown, RulesetValidationError[]]>([
    [
      [[{ rules: {} }, 'test']],
      [new RulesetValidationError('allowed types are "off", "recommended" and "all"', ['extends', '0', '1'])],
    ],
    [
      [[{ rules: {} }, 'test'], 'foo'],
      [
        new RulesetValidationError('must be a valid ruleset', ['extends', '1']),
        new RulesetValidationError('allowed types are "off", "recommended" and "all"', ['extends', '0', '1']),
      ],
    ],
  ])('recognizes invalid array-ish extends syntax %p', (_extends, errors) => {
    expect(
      assertValidRuleset.bind(null, {
        extends: _extends,
      }),
    ).toThrowAggregateError(new AggregateError(errors));
  });

  it.concurrent('recognizes valid ruleset formats syntax', () => {
    expect(
      assertValidRuleset.bind(null, {
        formats: [formatB],
        rules: {},
      }),
    ).not.toThrow();
  });

  it.concurrent.each([
    [
      [2, 'a'],
      new AggregateError([
        new RulesetValidationError('must be a valid format', ['formats', '0']),
        new RulesetValidationError('must be a valid format', ['formats', '1']),
      ]),
    ],
    [2, new AggregateError([new RulesetValidationError('must be an array of formats', ['formats'])])],
    [[''], new AggregateError([new RulesetValidationError('must be a valid format', ['formats', '0'])])],
  ])('recognizes invalid ruleset %p formats syntax', (formats, error) => {
    expect(
      assertValidRuleset.bind(null, {
        formats,
        rules: {},
      }),
    ).toThrowAggregateError(error);
  });

  it.concurrent('recognizes valid rule formats syntax', () => {
    expect(
      assertValidRuleset.bind(null, {
        formats: [formatB],
        rules: {
          rule: {
            given: '$.info',
            then: {
              function: truthy,
            },
            formats: [formatA],
          },
        },
      }),
    ).not.toThrow();
  });

  it.concurrent.each([
    [
      [2, 'a'],
      new AggregateError([
        new RulesetValidationError('must be a valid format', ['rules', 'rule', 'formats', '0']),
        new RulesetValidationError('must be a valid format', ['rules', 'rule', 'formats', '1']),
      ]),
    ],
    [2, new AggregateError([new RulesetValidationError('must be an array of formats', ['rules', 'rule', 'formats'])])],
  ])('recognizes invalid rule %p formats syntax', (formats, error) => {
    expect(
      assertValidRuleset.bind(null, {
        rules: {
          rule: {
            given: '$.info',
            then: {
              function: truthy,
            },
            formats,
          },
        },
      }),
    ).toThrowAggregateError(error);
  });

  describe('overrides validation', () => {
    it.concurrent('given an invalid overrides, throws', () => {
      expect(
        assertValidRuleset.bind(null, {
          overrides: null,
        }),
      ).toThrowAggregateError(new AggregateError([new RulesetValidationError('must be array', ['overrides'])]));
    });

    it.concurrent('given an empty overrides, throws', () => {
      expect(
        assertValidRuleset.bind(null, {
          overrides: [],
        }),
      ).toThrowAggregateError(new AggregateError([new RulesetValidationError('must not be empty', ['overrides'])]));
    });

    it.concurrent('given an invalid pattern, throws', () => {
      expect(
        assertValidRuleset.bind(null, {
          overrides: [2],
        }),
      ).toThrowAggregateError(
        new AggregateError([
          new RulesetValidationError('must be a override, i.e. { "files": ["v2/**/*.json"], "rules": {} }', [
            'overrides',
            '0',
          ]),
        ]),
      );
    });

    describe('pointers', () => {
      const rulesetA = {
        rules: {},
      };

      it.concurrent.each<[Partial<RulesetDefinition>, RulesetValidationError]>([
        [
          { extends: [rulesetA] },
          new RulesetValidationError('must contain rules when JSON Pointers are defined', ['overrides', '0']),
        ],
        [
          { formats: [formatB] },
          new RulesetValidationError('must contain rules when JSON Pointers are defined', ['overrides', '0']),
        ],
        [
          { rules: {}, formats: [formatB] },
          new RulesetValidationError('must not override any other property than rules when JSON Pointers are defined', [
            'overrides',
            '0',
          ]),
        ],
        [
          { rules: {}, extends: [rulesetA] },
          new RulesetValidationError('must not override any other property than rules when JSON Pointers are defined', [
            'overrides',
            '0',
          ]),
        ],
        [
          {
            rules: {
              definition: {
                given: '$',
                then: {
                  function: truthy,
                },
              },
            },
          },
          new RulesetValidationError(
            'the value has to be one of: 0, 1, 2, 3 or "error", "warn", "info", "hint", "off"',
            ['overrides', '0', 'rules', 'definition'],
          ),
        ],
      ])('given an override containing a pointer and %p, throws', (ruleset, error) => {
        expect(
          assertValidRuleset.bind(null, {
            overrides: [
              {
                files: ['./bar#'],
                ...ruleset,
              },
            ],
          }),
        ).toThrowAggregateError(new AggregateError([error]));
      });

      it.concurrent.each<RulesetOverridesDefinition>([
        [
          {
            files: ['*.json#'],
            rules: {
              'my-rule': 'error',
            },
          },
        ],
        [
          {
            files: ['*.json#/test'],
            rules: {},
          },
        ],
      ])('recognizes a valid %p override', (...ruleset) => {
        expect(
          assertValidRuleset.bind(null, {
            overrides: ruleset,
          }),
        ).not.toThrow();
      });
    });
  });

  describe('aliases validation', () => {
    it.concurrent.each(['Info', 'Info-Description', 'Info_Description', 'Response404', 'errorMessage'])(
      'recognizes %s as a valid key of an alias',
      alias => {
        expect(
          assertValidRuleset.bind(null, {
            rules: {},
            aliases: {
              [alias]: ['$'],
            },
          }),
        ).not.toThrow();
      },
    );

    it.concurrent.each(['#Info', '#i', '#Info.contact', '#Info[*]'])(
      'recognizes %s as a valid value of an alias',
      value => {
        expect(
          assertValidRuleset.bind(null, {
            rules: {},
            aliases: {
              alias: [value],
            },
          }),
        ).not.toThrow();
      },
    );

    it.concurrent('given an invalid aliases, throws', () => {
      expect(
        assertValidRuleset.bind(null, {
          rules: {},
          aliases: null,
        }),
      ).toThrowAggregateError(new AggregateError([new RulesetValidationError('must be object', ['aliases'])]));
    });

    it.concurrent.each([null, 5])('recognizes %p as an invalid type of aliases', value => {
      expect(
        assertValidRuleset.bind(null, {
          rules: {},
          aliases: {
            alias: [value],
          },
        }),
      ).toThrowAggregateError(
        new AggregateError([
          new RulesetValidationError(
            'must be a valid JSON Path expression or a reference to the existing Alias optionally paired with a JSON Path expression subset',
            ['aliases', 'alias', '0'],
          ),
        ]),
      );
    });

    it.concurrent.each(['$', '#', '$bar', '9a', 'test!'])('given %s keyword used as a key of an alias, throws', key => {
      expect(
        assertValidRuleset.bind(null, {
          rules: {},
          aliases: {
            [key]: ['$.foo'],
          },
        }),
      ).toThrowAggregateError(
        new AggregateError([
          new RulesetValidationError(
            'to avoid confusion the name must match /^[A-Za-z][A-Za-z0-9_-]*$/ regular expression',
            ['aliases'],
          ),
        ]),
      );
    });

    it.concurrent.each<[unknown[], RulesetValidationError[]]>([
      [
        [''],
        [
          new RulesetValidationError(
            'must be a valid JSON Path expression or a reference to the existing Alias optionally paired with a JSON Path expression subset',
            ['aliases', 'PathItem', '0'],
          ),
        ],
      ],
      [
        ['foo'],
        [
          new RulesetValidationError(
            'must be a valid JSON Path expression or a reference to the existing Alias optionally paired with a JSON Path expression subset',
            ['aliases', 'PathItem', '0'],
          ),
        ],
      ],
      [[], [new RulesetValidationError('must be a non-empty array of expressions', ['aliases', 'PathItem'])]],
      [
        [0],
        [
          new RulesetValidationError(
            'must be a valid JSON Path expression or a reference to the existing Alias optionally paired with a JSON Path expression subset',
            ['aliases', 'PathItem', '0'],
          ),
        ],
      ],
    ])('given %s value used as an alias, throws', (value, errors) => {
      expect(
        assertValidRuleset.bind(null, {
          rules: {},
          aliases: {
            PathItem: value,
          },
        }),
      ).toThrowAggregateError(new AggregateError(errors));
    });

    describe('given scoped aliases', () => {
      it.concurrent('demands targets to be present', () => {
        expect(
          assertValidRuleset.bind(null, {
            rules: {},
            aliases: {
              alias: {},
            },
          }),
        ).toThrowAggregateError(
          new AggregateError([
            new RulesetValidationError('targets must be present and have at least a single alias definition', [
              'aliases',
              'alias',
            ]),
          ]),
        );
      });

      it.concurrent.each(['Info', 'Info-Description', 'Info_Description', 'Response404', 'errorMessage'])(
        'recognizes %s as a valid key of an alias',
        alias => {
          expect(
            assertValidRuleset.bind(null, {
              rules: {},
              aliases: {
                [alias]: {
                  targets: [
                    {
                      formats: [formatA],
                      given: ['$.definitions[*]'],
                    },
                  ],
                },
              },
            }),
          ).not.toThrow();
        },
      );

      it.concurrent.each(['#Info', '#i', '#Info.contact', '#Info[*]'])(
        'recognizes %s as a valid value of an alias',
        value => {
          expect(
            assertValidRuleset.bind(null, {
              rules: {},
              aliases: {
                alias: {
                  targets: [
                    {
                      formats: [formatA],
                      given: [value],
                    },
                  ],
                },
              },
            }),
          ).not.toThrow();
        },
      );

      it.concurrent.each([null, 1, {}, 'a'])('recognizes %p as invalid targets', targets => {
        expect(
          assertValidRuleset.bind(null, {
            rules: {},
            aliases: {
              SchemaObject: {
                targets,
              },
            },
          }),
        ).toThrowAggregateError(
          new AggregateError([new RulesetValidationError('must be array', ['aliases', 'SchemaObject', 'targets'])]),
        );
      });

      it.concurrent('demands some target', () => {
        expect(
          assertValidRuleset.bind(null, {
            rules: {},
            aliases: {
              SchemaObject: {
                targets: [],
              },
            },
          }),
        ).toThrowAggregateError(
          new AggregateError([
            new RulesetValidationError('targets must have at least a single alias definition', [
              'aliases',
              'SchemaObject',
              'targets',
            ]),
          ]),
        );
      });

      it.concurrent.each([{}, { formats: [] }, { given: ['$'] }])('demands given & formats to be present', targets => {
        expect(
          assertValidRuleset.bind(null, {
            rules: {},
            aliases: {
              SchemaObject: {
                targets: [targets],
              },
            },
          }),
        ).toThrowAggregateError(
          new AggregateError([
            new RulesetValidationError('a valid target must contain given and non-empty formats', [
              'aliases',
              'SchemaObject',
              'targets',
              '0',
            ]),
          ]),
        );
      });

      it.concurrent('recognizes invalid formats', () => {
        expect(
          assertValidRuleset.bind(null, {
            rules: {},
            aliases: {
              SchemaObject: {
                targets: [
                  {
                    formats: [2],
                    given: ['$.definitions[*]'],
                  },
                  {
                    formats: [formatA, 'formatB'],
                    given: ['$.components.schemas[*]'],
                  },
                ],
              },
            },
          }),
        ).toThrowAggregateError(
          new AggregateError([
            new RulesetValidationError('must be a valid format', [
              'aliases',
              'SchemaObject',
              'targets',
              '0',
              'formats',
              '0',
            ]),
            new RulesetValidationError('must be a valid format', [
              'aliases',
              'SchemaObject',
              'targets',
              '1',
              'formats',
              '1',
            ]),
          ]),
        );
      });

      it.concurrent('recognizes invalid given', () => {
        expect(
          assertValidRuleset.bind(null, {
            rules: {},
            aliases: {
              SchemaObject: {
                targets: [
                  {
                    formats: [formatA],
                    given: ['#.definitions[*]'],
                  },
                  {
                    formats: [formatA, formatB],
                    given: ['!.components.schemas[*]'],
                  },
                ],
              },
            },
          }),
        ).toThrowAggregateError(
          new AggregateError([
            new RulesetValidationError(
              'must be a valid JSON Path expression or a reference to the existing Alias optionally paired with a JSON Path expression subset',
              ['aliases', 'SchemaObject', 'targets', '1', 'given', '0'],
            ),
          ]),
        );
      });
    });
  });

  describe('then validation', () => {
    describe('custom function', () => {
      it.concurrent('given valid then, does not complain', () => {
        expect(
          assertValidRuleset.bind(null, {
            rules: {
              rule: {
                given: '$',
                then: {
                  function: truthy,
                },
              },
            },
          }),
        ).not.toThrow();

        expect(
          assertValidRuleset.bind(null, {
            rules: {
              rule: {
                given: '$',
                then: {
                  field: 'test',
                  function: truthy,
                },
              },
            },
          }),
        ).not.toThrow();
      });
    });
  });

  describe('parser options validation', () => {
    it.concurrent('recognizes valid options', () => {
      expect(
        assertValidRuleset.bind(null, {
          extends: [],
          parserOptions: {
            incompatibleValues: 'warn',
          },
        }),
      ).not.toThrow();

      expect(
        assertValidRuleset.bind(null, {
          extends: [],
          parserOptions: {
            incompatibleValues: 2,
            duplicateKeys: 'hint',
          },
        }),
      ).not.toThrow();
    });

    it.concurrent('given invalid values, throws', () => {
      expect(
        assertValidRuleset.bind(null, {
          extends: [],
          parserOptions: {
            incompatibleValues: 5,
            duplicateKeys: 'foo',
          },
        }),
      ).toThrowAggregateError(
        new AggregateError([
          new RulesetValidationError(
            'the value has to be one of: 0, 1, 2, 3 or "error", "warn", "info", "hint", "off"',
            ['parserOptions', 'duplicateKeys'],
          ),
          new RulesetValidationError(
            'the value has to be one of: 0, 1, 2, 3 or "error", "warn", "info", "hint", "off"',
            ['parserOptions', 'incompatibleValues'],
          ),
        ]),
      );
    });
  });
});

// we only check the most notable differences here, since the rest of the validation process is common to both JS and JSON
describe('JSON Ruleset Validation', () => {
  it.concurrent('recognizes valid array-ish extends syntax', () => {
    expect(
      assertValidRuleset.bind(
        null,
        {
          extends: [['rulesetA', 'off'], 'rulesetB'],
          rules: {},
        },
        'json',
      ),
    ).not.toThrow();
  });

  it.concurrent.each<[unknown, RulesetValidationError[]]>([
    [
      [['test', 'test']],
      [new RulesetValidationError('allowed types are "off", "recommended" and "all"', ['extends', '0', '1'])],
    ],
    [
      [['bar', 'test'], {}],
      [
        new RulesetValidationError('must be string', ['extends', '1']),
        new RulesetValidationError(`allowed types are "off", "recommended" and "all"`, ['extends', '0', '1']),
      ],
    ],
  ])('recognizes invalid array-ish extends syntax %p', (_extends, errors) => {
    expect(
      assertValidRuleset.bind(
        null,
        {
          extends: _extends,
        },
        'json',
      ),
    ).toThrowAggregateError(new AggregateError(errors));
  });

  it.concurrent('recognizes valid ruleset formats syntax', () => {
    expect(
      assertValidRuleset.bind(
        null,
        {
          formats: ['oas2'],
          rules: {},
        },
        'json',
      ),
    ).not.toThrow();
  });

  it.concurrent.each<[unknown, RulesetValidationError[]]>([
    [
      [2, 'a'],
      [
        new RulesetValidationError('must be a valid format', ['formats', '0']),
        new RulesetValidationError('must be a valid format', ['formats', '1']),
      ],
    ],
    [2, [new RulesetValidationError('must be an array of formats', ['formats'])]],
    [[''], [new RulesetValidationError('must be a valid format', ['formats', '0'])]],
  ])('recognizes invalid ruleset %p formats syntax', (formats, errors) => {
    expect(
      assertValidRuleset.bind(
        null,
        {
          formats,
          rules: {},
        },
        'json',
      ),
    ).toThrowAggregateError(new AggregateError(errors));
  });

  it.concurrent('recognizes valid rule formats syntax', () => {
    expect(
      assertValidRuleset.bind(
        null,
        {
          formats: ['json-schema-loose'],
          rules: {
            rule: {
              given: '$.info',
              then: {
                function: 'truthy',
              },
              formats: ['oas2'],
            },
          },
        },
        'json',
      ),
    ).not.toThrow();
  });

  it.concurrent.each<[unknown, RulesetValidationError[]]>([
    [
      [2, 'a'],
      [
        new RulesetValidationError('must be a valid format', ['rules', 'rule', 'formats', '0']),
        new RulesetValidationError('must be a valid format', ['rules', 'rule', 'formats', '1']),
      ],
    ],
    [2, [new RulesetValidationError('must be an array of formats', ['rules', 'rule', 'formats'])]],
  ])('recognizes invalid rule %p formats syntax', (formats, errors) => {
    expect(
      assertValidRuleset.bind(
        null,
        {
          rules: {
            rule: {
              given: '$.info',
              then: {
                function: 'truthy',
              },
              formats,
            },
          },
        },
        'json',
      ),
    ).toThrowAggregateError(new AggregateError(errors));
  });
});
