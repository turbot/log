const _ = require("lodash");
const assert = require("chai").assert;
const errors = require("turbot-errors");
const log = require("..");
const tconf = require("turbot-config");
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
    let tmpEnv;
    let trace = {
      correlationId: "abcd1234"
    };

    before(function() {
      tmpEnv = _.pick(process.env, "AWS_REGION", "TURBOT_CONFIG_ENV");
      process.env.TURBOT_CONFIG_ENV = JSON.stringify({ trace: trace });
      tconf.$load();
    });

    after(function() {
      for (const k in tmpEnv) {
        if (tmpEnv[k]) {
          process.env[k] = tmpEnv[k];
        } else {
          delete process.env[k];
        }
      }
      tconf.$load();
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
      outputLines = testConsole.stderr.inspectSync(function() {
        log.err("I am an error", err);
      });
      output = JSON.parse(outputLines[0]);
    });
    it("has err object", function() {
      assert.exists(output.name);
      assert.exists(output.message);
      assert.exists(output.stack);
    });
    it("has message and wrapper", function() {
      assert.include(output.message, "my-error");
      assert.include(output.message, "my-wrap");
    });
  });

  describe("Console standard streams per level", function() {
    var tmpEnv;

    before(function() {
      tmpEnv = _.pick(process.env, "TURBOT_CONFIG_ENV");
      process.env.TURBOT_CONFIG_ENV = JSON.stringify({ log: { level: "debug" } });
      tconf.$load();
    });

    after(function() {
      for (const k in tmpEnv) {
        if (tmpEnv[k]) {
          process.env[k] = tmpEnv[k];
        } else {
          delete process.env[k];
        }
      }
      tconf.$load();
    });

    const tests = [
      ["emer", "stderr"],
      ["alert", "stderr"],
      ["crit", "stderr"],
      ["err", "stderr"],
      ["warning", "stdout"],
      ["notice", "stdout"],
      ["info", "stdout"],
      ["debug", "stdout"]
    ];

    tests.forEach(function(test) {
      describe(test[0], function() {
        var stdoutLines, stderrLines;

        before(function() {
          stderrLines = testConsole.stderr.inspectSync(function() {
            stdoutLines = testConsole.stdout.inspectSync(function() {
              log[test[0]]("Do I appear in stdout or stderr?");
            });
          });
        });

        after(function() {});

        it((test[1] == "stderr" ? "does not " : "") + "log to stdout", function() {
          assert.lengthOf(stdoutLines, test[1] == "stdout" ? 1 : 0);
        });
        it((test[1] == "stdout" ? "does not " : "") + "log to stderr", function() {
          assert.lengthOf(stderrLines, test[1] == "stderr" ? 1 : 0);
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
