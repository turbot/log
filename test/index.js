const _ = require("lodash");
const assert = require("chai").assert;
const errors = require("@turbot/errors");
const log = require("..");
const testConsole = require("test-console");

describe("turbot-log", function() {
  describe("log info by default", function() {
    let output, outputLines;
    let msg = "hello";
    before(function() {
      outputLines = testConsole.stdout.inspectSync(function() {
        log.info(msg);
      });
      output = JSON.parse(outputLines[0]);
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

  describe("hide debug if at info level", function() {
    let outputLines;
    let msg = "hello";
    before(function() {
      outputLines = testConsole.stdout.inspectSync(function() {
        log.debug(msg);
      });
    });
    it("logged zero messages", function() {
      assert.lengthOf(outputLines, 0);
    });
  });

  describe("Add trace data if available", function() {
    let output, outputLines;
    let trace = {
      correlationId: "abcd1234"
    };

    before(function() {
      process.env.TURBOT_TRACE_CONFIG = JSON.stringify(trace);
    });

    after(function() {
      delete process.env.TURBOT_TRACE_CONFIG;
    });

    before(function() {
      outputLines = testConsole.stdout.inspectSync(function() {
        log.info("hello");
      });
      output = JSON.parse(outputLines[0]);
    });
    it("has trace data", function() {
      assert.deepInclude(output, { trace: trace });
    });
  });

  describe("Hide sensitive data", function() {
    let outputLines, output;
    let data = {
      host: "localhost",
      user: "turbot",
      $password: "secret"
    };
    before(function() {
      outputLines = testConsole.stdout.inspectSync(function() {
        log.info("here's the data!", data);
      });
      output = JSON.parse(outputLines[0]);
    });
    it("host is unchanged (not <sensitive>)", function() {
      assert.equal(output.host, data.host);
    });
    it("$password is <sensitive>", function() {
      assert.equal(output.$password, "<sensitive>");
    });
  });

  describe("Hide sensitive data", function() {
    let outputLines, output;
    let data = {
      host: "localhost",
      user: "turbot",
      $password: "secret"
    };
    before(function() {
      outputLines = testConsole.stdout.inspectSync(function() {
        log.info("here's the data!", data);
      });
      output = JSON.parse(outputLines[0]);
    });
    it("host is unchanged (not <sensitive>)", function() {
      assert.equal(output.host, data.host);
    });
    it("$password is <sensitive>", function() {
      assert.equal(output.$password, "<sensitive>");
    });
  });

  describe("circular data is logged", function() {
    let input, output, outputLines;
    before(function() {
      input = { one: 1, two: 2 };
      input.cycle = input;
      outputLines = testConsole.stdout.inspectSync(function() {
        log.info("I have cyclic data", input);
      });
      output = JSON.parse(outputLines[0]);
    });
    it("survived intact through both sanitize and JSON.stringify", function() {
      assert.equal(output.one, 1);
    });
  });

  describe("Error objects", function() {
    let err, output, outputLines;
    before(function() {
      try {
        throw new Error("my-error");
      } catch (e) {
        err = errors.internal("my-wrap", e);
      }
      // console.log(err);
      // console.log(err.stack);
      outputLines = testConsole.stdout.inspectSync(function() {
        log.error("I am an error", err);
      });
      output = JSON.parse(outputLines[0]);
    });

    it("has err object", function() {
      // console.log(output);
      // console.log(output.stack);
      // console.log(output.message);
      assert.exists(output.name);
      assert.exists(output.message);
      assert.exists(output.stack);
    });
    it("has message but the wrapped error message is not elevated, this is a change of behaviour", function() {
      assert.include(output.message, "my-error");
      assert.include(output.message, "my-wrap");
    });
  });

  describe("Console standard streams per level", function() {
    before(function() {
      process.env.TURBOT_LOG_LEVEL = "debug";
    });

    after(function() {
      delete process.env.TURBOT_LOG_LEVEL;
    });

    const tests = [
      ["emergency", "stderr"],
      ["alert", "stderr"],
      ["critical", "stderr"],
      ["error", "stdout"],
      ["warning", "stdout"],
      ["notice", "stdout"],
      ["info", "stdout"],
      ["debug", "stdout"]
    ];

    tests.forEach(function(test) {
      describe(test[0], function() {
        let stdoutLines, stderrLines;

        before(function() {
          stderrLines = testConsole.stderr.inspectSync(function() {
            stdoutLines = testConsole.stdout.inspectSync(function() {
              log[test[0]]("Do I appear in stdout or stderr?");
            });
          });
        });

        it((test[1] == "stderr" ? "does not " : "") + "log to stdout", function() {
          assert.lengthOf(stdoutLines, test[1] == "stdout" ? 1 : 0);
        });
        it((test[1] == "stdout" ? "does not " : "") + "log to stderr", function() {
          assert.lengthOf(stderrLines, test[1] == "stderr" ? 1 : 0);
        });
      });
    });
  });

  describe("Logging to an alias", function() {
    const tests = [["error", "err"]];

    tests.forEach(function(test) {
      describe(`${test[1]} -> ${test[0]}`, function() {
        let stdoutLines;

        before(function() {
          stdoutLines = testConsole.stdout.inspectSync(function() {
            log[test[0]](test[0]);
            log[test[1]](test[1]);
          });
        });

        it(`log.${test[0]} logs with level ${test[0]}`, function() {
          const entry = JSON.parse(stdoutLines[0]);
          assert.equal(entry.level, test[0]);
          assert.equal(entry.message, test[0]);
        });

        it(`log.${test[1]} alias logs with level ${test[0]}`, function() {
          const entry = JSON.parse(stdoutLines[1]);
          assert.equal(entry.level, test[0]);
          assert.equal(entry.message, test[1]);
        });
      });
    });
  });

  xdescribe("TODO", function() {
    it("Set log level per trace.logLevel", function() {});
    it("Logs but does not absorb exceptions", function() {
      let outputLines, output, err;
      // I can't see how to test this ... but it's something like this.
      try {
        outputLines = testConsole.stderr.inspectSync(function() {
          throw new Error("test");
        });
      } catch (e) {
        err = e;
      }
      console.log(outputLines);
      console.log(output);
      console.log(err);
    });
  });
});

/**
 * For logging, sometimes it's better & easier to test with a script.

const log = require("./index");

process.on("uncaughtException", function() {
  console.log("uncaughtException!");
});

process.on("exit", function() {
  console.log("exit!");
});

log.info("hello");
log.info("hello", { with: "data" });
log.info("hello", { with: { $sensitive: "data" } });
log.info("hello", { $sensitiveAtRoot: "sensitive" });
throw new Error({ message: "test", with: "data" });
log.info("final");

*/
