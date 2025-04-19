# TTY.wtf rewrite

The earlier fun playground/dashboard editor can benefit from refactoring and rewrite of few core blocks.

## Shell

At startup, the shell needs to detect:

* bound filesystem
* view

### Bound filesystems and aspects

#### In-URL content

This is expected to be plain text, or markdown within a relatively long URL.

The encoding is meant to use slashes for break-line.

When URL becomes longer than certain (medium-size) threshold, it is turned from URL/path to URL/hash. Hash-based URLs work around limitations in length and authentication redirects.

#### In-HTML content

These are for HTML documents carrying the content inside itself, to be self-contained data formats.

> **!! Editing** of these would create a local indexedDB-based copy, and saving need to be handled explicitly by the user.

* Direct in-HTML markdown (where script tag is embedded to make it actual live document).
* Multi-file content where other files are embedded in specially formatted HTML comments, or specially tagged script elements.

#### Remote linked content

This is intended to refer and on-the-fly load a document from a public source.

> **!! Editing** of these would create a local indexedDB-based copy, and saving need to be handled explicitly by the user (although easier to reconcile given the source is known).

* direct HTTP GET
* GitHub file/repo
* GDrive file/directory
* Azure file/repo
* ... any other store provider: Dropbox, GitLab, BitBucket etc.

### View aspects
  * Markdown editor
    * possibly single-script and response
    * possibly single-block for embedded LaTEX etc.
  * file browser
    * two-panel manager OR
    * Windows (XP or 7) file explorer emulator

