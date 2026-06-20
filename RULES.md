## Summary

Coding rules to apply.

## Naming

- camelCase for functions and variables and constants.
- PascalCase for types, classes and files.

## Globals

- every type that represents an id/key/etc should be branded and type-safe
- empty line between top-level functions
- empty line at the end of a file.
- if a variable is const and only used once and its value is only a few
  character it should be inlined if it doesn't trigger block indentation
- related symbols should be grouped together
- type safety should be maximized and really strong
- implementation can be fancy and complicated as long as the input/output types
  are simple
- non-export consts should be at the bottom of the file (after a new-line to
  separate from rest of file)
- if/while/for conditions should be bool, no "truthy" or "falsy" checks

## Source only (./src folder only)

- no line space in the middle of a function or a class.
- empty line between functions in a file

- `export`ed symbols must be documented.

## Tests only (./tests folder only)

- no line space in the middle of a test, only line comment to explain steps
- only a single "it" statement per test file with the "run" name
- the file name should match naming convention and be quite descriptive
- the "it" statement should be on the top of the file
- file naming convention is snake-case with separators
- the naming convention for file should mention first if it's a
  devnet/mainnet/local test + what module is the test related to (separated by
  ".") + a one or two or three word description of the test

## Symbols

- `export`ed symbols goes on top of the file.

- non-`export`ed functions that's only used once should be inlined.
- non-`export`ed symbols must not documented, the symbol name should be enough
  to understand the purpose of the symbol. it can be quite explicit if needed.

## Files to ignore

Those are not really part of the codebase and just there as boilerplate:

- root "dot" files and "jest" files and "ts config"
- src/index.ts as the package entrypoint barrel
- tests/fixtures as those are external or auto-generated files
