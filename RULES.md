## Summary

Coding rules to apply to all files.

## Naming

- camelCase for functions and variables and constants.
- PascalCase for types, classes and files.

## Globals

- every type that represents an id/key/etc should be branded and type-safe
- empty line at the end of a file.
- if a variable is const and only used once and its value is only a few
  character it should be inlined if it doesn't trigger block indentation

## Source only (non-tests)

- no line space in the middle of a function or a class.
- empty line between functions in a file

## Tests only

- no line space in the middle of a test, only line comment to explain steps
- only a single "it" statement per test file

## Symbols

- `export`ed symbols goes on top of the file.
- `export`ed symbols must be documented.

- non-`export`ed functions that's only used once should be inlined.
- non-`export`ed symbols must not documented, the symbol name should be enough
  to understand the purpose of the symbol. it can be quite explicit if needed.
