const serializeError = require("serialize-error");
const tconf = require("@turbot/config");
const utils = require("@turbot/utils");

/***
 * This logger behaves weird if the data passed has a 'message' that's not meant to be a message, it's a convenient
 * thing to add message in front of the message passed as parameters. (remove? we could not control what
 * mod developers send to the the logger).
 */

// Syslog levels are always specifically defined by the application. Turbot's
// definitions are heavily inspired by:
//   https://support.solarwinds.com/Success_Center/Log_Event_Manager_(LEM)/Syslog_Severity_levels
//   http://pubs.opengroup.org/onlinepubs/009695399/functions/syslog.html
//   https://en.wikipedia.org/wiki/Syslog#Severity_level
const LEVELS = {
  emergency: {
    value: 0,
    name: "emergency",
    aliases: ["emerg"],
    severity: "Emergency",
    description: "Turbot is unavailable and automatic recovery is unlikely."
  },

  alert: {
    value: 1,
    id: "alert",
    severity: "Alert",
    description: "Alert from a key component or dependency. Turbot is unusable, but may automatically recover."
  },

  critical: {
    value: 2,
    id: "critical",
    aliases: ["crit"],
    severity: "Critical",
    description: "Critical conditions. Turbot may be unavailable or have severely degraded performance."
  },

  error: {
    value: 3,
    id: "error",
    aliases: ["err"],
    severity: "Error",
    description: "Error significant to an action, but not critical to Turbot. Review and remediation required."
  },

  warning: {
    value: 4,
    id: "warning",
    severity: "Warning",
    description: "Warning messages. An error may occur if action is not taken. Review recommended."
  },

  notice: {
    value: 5,
    id: "notice",
    severity: "Notice",
    description: "Significant, but normal, events such as automated actions."
  },

  info: {
    value: 6,
    id: "info",
    severity: "Informational",
    description: "Information about decisions and interim data."
  },

  debug: {
    value: 7,
    id: "debug",
    severity: "Debug",
    description: "Debug messages used in development only."
  }
};

const handler = function(level, levelData) {
  return function(reason = {}, data = {}) {
    // Don't log if the message is at a more verbose level than desired.
    // Default to error.
    const targetLogLevel = tconf.get(["log", "level"], "info");
    if (levelData.value > LEVELS[targetLogLevel].value) {
      return;
    }

    if (typeof reason != "string") {
      data = reason;
      reason = null;
    }

    // Errors in node have hidden fields. I assume this is to ensure things
    // like the stack trace don't get output and create security issues. In
    // our case however, we want logs to show the full error details.
    let logEntry;
    if (data instanceof Error) {
      logEntry = serializeError(data);
    } else {
      logEntry = data;
    }

    // Add reason to the message if provided.
    if (reason) {
      if (logEntry.message) {
        logEntry.message += ": " + reason;
      } else {
        logEntry.message = reason;
      }
    }

    // Always record basic log entry details.
    if (!logEntry.level) {
      logEntry.level = levelData.id;
    }
    if (!logEntry.timestamp) {
      logEntry.timestamp = new Date();
    }

    // Add Turbot tracing information to the log if it's available.
    const trace = tconf.get("trace");
    if (trace) {
      logEntry.trace = trace;
    }

    // Ensure that the data is sanitized - in particular - sensitive data
    // should always be hidden.
    logEntry = utils.data.sanitize(logEntry, { clone: false, breakCircular: true });

    // Turbot only logs messages critical to Turbot to stderr. All others -
    // including errors - are logged to stdout. So, stderr can be used for
    // Turbot system errors, while stdout (which is more easily suppressed) is
    // used for errors and information about capabilities inside the Turbot
    // application.
    // For example, Turbot not working because we can't reach a database is
    // critical (stderr) while Turbot control failing because of a bad
    // configuration is error (stdout).
    const method = levelData.value <= LEVELS.critical.value ? "error" : "log";
    console[method](JSON.stringify(logEntry));

    return logEntry;
  };
};

exports.levels = LEVELS;

for (const level in LEVELS) {
  exports[level] = handler(level, LEVELS[level]);
  for (const alias of LEVELS[level].aliases || []) {
    exports[alias] = handler(alias, LEVELS[level]);
  }
}
