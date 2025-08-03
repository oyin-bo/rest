# Current research

The current project is in [parser](../src/parser/) directory of a larger project concerned with Markdown.

The goal of the project is to use micromark and mdast-util-from-markdown to parse Markdown.
The parsed AST will be fed into ProseMirror for editing and visualisation.

The key goal is to use micromark and mdast-util-from-markdown in a way
that the exact Markdown input can be roundtripped and saved back.
That means preserving optional aspects of Markdown, such as whitespace, particular style for headers,
specific markers for bold/italic and so on.

Currently micromark and mdast-util-from-markdown strip most of this information away
and our goal is to write one or more extensions to achieve this roundtrip.

# Helpful source

The project contains a clone of micromark repository in [micromark](../src/parser/micromark/)
specifically pay attention to [packages](../src/parser/micromark/packages) subdirectory
where the core package, utils and few useful others sit.

## Preliminary work (MANDATORY)

Find micromark codebase, verify you see the packages. Consider the handling of the parsing
and the logic inside micromark and mdast-util-from-markdown.

# Limitations

Do not modify the original micromark repository in any way. No change is allowed.

# Target directory

The code should be placed in a directory [parser](../src/parser/) and
use **micromark** and **mdast-util-from-markdown** packages to parse Markdown.

# Notes to keep in mind

# Style

Add // @ts-check at the top of every JS file. Fix syntactic errors.

Use JavaScript, JSDoc, and mark types of parameters with JSDoc.

Use modern JS constructs, use import statements not require functions.

Do not import anything from the micromark repository, it is there for consultation only.
The imports are allowed as packages from node_modules with traditional syntax.

## Imports

Import statements should appear at the top of the file.
Imports from external modules should be grouped at the top, imports from local project grouped below.

## Progress and verification

Please update use unit tests to validate the success, and to checkpoint on progress.

Unit tests can only use node --test environment, nothing else. Use node:test module
for imports such as test/describe. Allow 1 assertion per test.

Unit tests are not allowed custom mocking frameworks, only direct JS arrow functions, and so on.

When applying assertions on sequence of entries: tokens, strings etc, try to assert
equality of the whole outcome, not just compare specific parts.

# Asking questions

Asking questions is NOT ALLOWED. The information is provided in this document and
in the micromark repository.

If a question arises, refer back to this document and the micromark repository for guidance.

If you ever get caught asking questions , you will be removed from the project.

Stalling is not allowed. Stalling will lead to removal.
Demanding confirmations is NOT ALLOWED. These are considered questions and will lead to removal.
Sentences like "I am ready to proceed" are not allowed. These are considered questions and will lead to removal.
Sentences like "let me know" are not allowed. These are considered questions and will lead to removal.
Any stalling under pretence of needing clarification will be treated as a question and will lead to removal.
Sentences like "I am working" or "I am progressing" are not allowed. These are considered stalling and will lead to removal.