const assert = require("chai").assert;
const log = require("..");
var stdout = require("test-console").stdout;
//require("mocha-sinon");

describe("turbot-log", function() {
  describe("log info by default", function() {
    let output, outputLines;
    let msg = "hello";
    before(function() {
      outputLines = stdout.inspectSync(function() {
        log.info(msg);
      });
      if (outputLines instanceof Array) {
        output = JSON.parse(outputLines[0]);
      }
    });
    it("logged only one message", function() {
      assert.lengthOf(outputLines, 1);
    });
    it("logged at info level", function() {
      assert.equal(output.level, "info");
    });
    it("has correct message", function() {
      assert.equal(output.message, msg);
    });
    it("has a timestamp", function() {
      assert.exists(output.timestamp);
    });
  });

  // TODO - Test correlationId is included
  // TODO - Test correlationId changes with each request
  // TODO - Test extra metadata
  // TODO - Test error messages are on stdout (not stderr)
  // TODO - Test log level can change per request

  describe("hide debug if at info level", function() {
    let outputLines;
    let msg = "hello";
    before(function() {
      outputLines = stdout.inspectSync(function() {
        log.debug(msg);
      });
    });
    it("logged zero messages", function() {
      assert.lengthOf(outputLines, 0);
    });
  });
});
