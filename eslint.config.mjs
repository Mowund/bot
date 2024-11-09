import jsonFormat from 'eslint-plugin-json-format';
import prettier from 'eslint-plugin-prettier';
import sortDestructureKeys from 'eslint-plugin-sort-destructure-keys';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import stylistic from '@stylistic/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url),
  __dirname = path.dirname(__filename),
  compat = new FlatCompat({
    allConfig: js.configs.all,
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
  });

export default [
  {
    ignores: ['!**/.*', '**/package-lock.json', '**/*.json', '**/dist/', '**/node_modules/'],
  },
  ...compat.extends(
    'eslint:recommended',
    'plugin:prettier/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ),
  {
    languageOptions: {
      ecmaVersion: 'latest',
      parser: tsParser,
      sourceType: 'module',
    },

    plugins: {
      '@stylistic': stylistic,
      '@typescript-eslint': typescriptEslint,
      'json-format': jsonFormat,
      prettier: prettier,
      'sort-destructure-keys': sortDestructureKeys,
    },

    rules: {
      '@stylistic/array-bracket-spacing': 'error',
      '@stylistic/arrow-parens': ['error', 'as-needed'],
      '@stylistic/arrow-spacing': 'error',
      '@stylistic/block-spacing': 'error',

      '@stylistic/brace-style': [
        'error',
        '1tbs',
        {
          allowSingleLine: true,
        },
      ],

      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/comma-spacing': 'error',
      '@stylistic/comma-style': 'error',
      '@stylistic/computed-property-spacing': 'error',
      '@stylistic/dot-location': ['error', 'property'],
      '@stylistic/eol-last': 'error',
      '@stylistic/key-spacing': 'error',

      '@stylistic/max-statements-per-line': [
        'error',
        {
          max: 2,
        },
      ],

      '@stylistic/no-floating-decimal': 'error',
      '@stylistic/no-multi-spaces': 'error',

      '@stylistic/no-multiple-empty-lines': [
        'error',
        {
          max: 2,
          maxBOF: 0,
          maxEOF: 1,
        },
      ],

      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/no-whitespace-before-property': 'error',
      '@stylistic/object-curly-spacing': ['error', 'always'],
      '@stylistic/padded-blocks': ['error', 'never'],
      '@stylistic/quote-props': ['error', 'as-needed'],

      '@stylistic/quotes': [
        'error',
        'single',
        {
          allowTemplateLiterals: true,
          avoidEscape: true,
        },
      ],

      '@stylistic/rest-spread-spacing': 'error',
      '@stylistic/semi': 'error',
      '@stylistic/semi-spacing': 'error',
      '@stylistic/space-before-blocks': 'error',

      '@stylistic/space-before-function-paren': [
        'error',
        {
          anonymous: 'always',
          asyncArrow: 'always',
          named: 'never',
        },
      ],

      '@stylistic/space-in-parens': 'error',
      '@stylistic/space-infix-ops': 'error',
      '@stylistic/space-unary-ops': 'error',
      '@stylistic/spaced-comment': 'error',
      '@stylistic/template-curly-spacing': 'error',
      '@stylistic/template-tag-spacing': 'error',
      '@stylistic/wrap-iife': ['error', 'inside'],
      '@stylistic/yield-star-spacing': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-shadow': 'error',

      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_',
        },
      ],

      'accessor-pairs': 'warn',
      'array-callback-return': 'error',
      'arrow-body-style': 'error',
      'callback-return': 'error',
      'consistent-this': ['error', '$this'],
      curly: ['error', 'multi-or-nest', 'consistent'],
      'default-case-last': 'error',
      'default-param-last': 'error',
      'dot-notation': 'error',
      eqeqeq: ['error', 'smart'],
      'func-name-matching': 'error',

      'func-style': [
        'error',
        'declaration',
        {
          allowArrowFunctions: true,
        },
      ],

      'getter-return': 'off',
      'handle-callback-err': 'error',

      'import/no-unresolved': 'off',

      'logical-assignment-operators': [
        'error',
        'always',
        {
          enforceForIfStatements: true,
        },
      ],

      'max-depth': ['error', 10],

      'max-nested-callbacks': [
        'error',
        {
          max: 4,
        },
      ],

      'new-cap': 'off',
      'no-array-constructor': 'error',
      'no-compare-neg-zero': 'error',
      'no-duplicate-imports': 'error',

      'no-else-return': [
        'error',
        {
          allowElseIf: false,
        },
      ],

      'no-implied-eval': 'error',
      'no-invalid-this': 'error',
      'no-lone-blocks': 'error',
      'no-lonely-if': 'error',
      'no-mixed-requires': 'error',
      'no-new': 'error',
      'no-new-func': 'error',
      'no-new-object': 'error',
      'no-new-require': 'error',
      'no-new-wrappers': 'error',
      'no-octal-escape': 'error',
      'no-path-concat': 'error',
      'no-return-assign': 'error',
      'no-return-await': 'error',
      'no-self-compare': 'error',
      'no-sequences': 'error',
      'no-spaced-func': 'error',
      'no-template-curly-in-string': 'error',
      'no-throw-literal': 'error',
      'no-undef-init': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unneeded-ternary': 'error',
      'no-unsafe-negation': 'error',
      'no-unsafe-optional-chaining': 'error',
      'no-unused-expressions': 'error',
      'no-useless-call': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-concat': 'error',
      'no-useless-constructor': 'error',
      'no-useless-escape': 'error',
      'no-useless-return': 'error',
      'no-var': 'error',
      'no-void': 'error',

      'one-var': [
        'error',
        {
          const: 'consecutive',
          let: 'consecutive',
          separateRequires: true,
          var: 'consecutive',
        },
      ],

      'operator-assignment': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-const': 'error',
      'prefer-numeric-literals': 'error',
      'prefer-object-spread': 'error',
      'prefer-promise-reject-errors': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'prefer-template': 'error',

      'prettier/prettier': [
        2,
        {
          arrowParens: 'avoid',
          endOfLine: 'lf',
          printWidth: 120,
          quoteProps: 'as-needed',
          singleQuote: true,
          trailingComma: 'all',
        },
      ],

      'require-await': 'warn',
      'sort-destructure-keys/sort-destructure-keys': 2,

      'sort-keys': [
        'error',
        'asc',
        {
          natural: true,
        },
      ],

      strict: ['error', 'global'],
      'unicode-bom': 'error',
      yoda: 'error',
    },
  },
];
