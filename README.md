# turbot-log

## Overview

Logs in Turbot are expected to be:

- JSON format
- Written to stdout

For both Docker and AWS Lambda this is fairly easy to achieve since console.log
from node.js will end up feeding log entries. We can use a tool like Winston to
produce JSON log entries while limiting them to the correct log level.

## Why write a logging package?

We'd prefer to use winston or bunyan or similar, but found all of those packages
unsuitable for our simple requirements. For example, with winston:

1. The logging level cannot be changed per request.
2. The metadata object cannot be replaced, but must be modified inline.
