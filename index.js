const serializeError = require("serialize-error");
const tconf = require("turbot-config");
const utils = require("turbot-utils");

// syslog levels as defined by:
//   http://pubs.opengroup.org/onlinepubs/009695399/functions/syslog.html
//   https://en.wikipedia.org/wiki/Syslog#Severity_level
//   https://support.solarwinds.com/Success_Center/Log_Event_Manager_(LEM)/Syslog_Severity_levels
const levels = {
  emerg: { value: 0, severity: "Emergency", description: "Final entry in a fatal, panic condition." },
  alert: { value: 1, severity: "Alert", description: "A condition that should be corrected immediately." },
  crit: { value: 2, sevurity: "Critical", description: "Critical conditions, such as hard device errors." },
  err: { value: 3, severity: "Error", description: "Error messages. Review and remediation required." },
  warning: { value: 4, severity: "Warning", description: "Warning messages. Review recommended." },
  notice: { value: 5, severity: "Notice", description: "Significant, but normal, events such as automated actions." },
  info: { value: 6, severity: "Informational", description: "Information about decisions and interim data." },
  debug: { value: 7, severity: "Debug", description: "Debug messages used in development only." }
};

const handler = function(level) {
  return function(reason = {}, data = {}) {
    const targetLogLevel = tconf.get(["log", "level"], "info");
    if (levels[level].value > levels[targetLogLevel].value) {
      return;
    }
    if (typeof reason != "string") {
      data = reason;
      reason = null;
    }
    let logEntry;
    if (data instanceof Error) {
      logEntry = serializeError(data);
    } else {
      logEntry = data;
    }
    // Reason is added to the message if provided.
    if (reason) {
      if (logEntry.message) {
        logEntry.message += ": " + reason;
      } else {
        logEntry.message = reason;
      }
    }
    if (!logEntry.level) {
      logEntry.level = level;
    }
    if (!logEntry.timestamp) {
      logEntry.timestamp = new Date();
    }
    const trace = tconf.get("trace");
    if (trace) {
      logEntry.trace = trace;
    }
    logEntry = utils.data.sanitize(logEntry, { clone: false, breakCircular: true });
    console.log(JSON.stringify(logEntry));
    return logEntry;
  };
};


exports.levels = levels;

for (const level in levels) {
  exports[level] = handler(level);
}



/*

const serializeError = require("serialize-error");
const tconf = require("turbot-config");
const utils = require("turbot-utils");
const winston = require("winston");
const format = winston.format;

const trace = format(function(info, opts) {
  let trace = tconf.get("trace");
  if (trace) {
    info.trace = trace;
  }
  return info;
});

const sanitize = format(function(info, opts) {
  // Sanitize the data, stripping any sensitive information. Our priorities
  // are:
  // 1. Hide sensitive data.
  // 2. Break cyclic loops - JSON logging won't work with them.
  // 3. Avoid mutating the info input (if possible).
  return utils.data.sanitize(info, { clone: false, breakCircular: true });
});

const logger = winston.createLogger({
  // Turbot uses syslog levels
  levels: winston.config.syslog.levels,
  // Set the log level for all transports
  level: tconf.get(["log", "level"], process.env.LOG_LEVEL || "info"),
  // Errors should be handled elsewhere, not by the log process
  exitOnError: false,
  // Formatting specific to Turbot requirements
  format: format.combine(
    // Add Turbot trace information to all entries
    trace(),
    // Hide sensitive data by default
    sanitize(),
    // Add a timestamp to all entries
    format.timestamp(),
    // Log as JSON
    format.json()
  ),
  transports: [
    // Use console transport, which is great for both Lambda functions and docker
    // containers - generally where Turbot is run.
    new winston.transports.Console({ handleExceptions: true })
  ]
});

logger._log = logger.log;
logger.log = function(type, message, data) {
  if (type instanceof Error) {
    type = serializeError(type);
  }
  if (message instanceof Error) {
    message = serializeError(message);
  }
  if (data instanceof Error) {
    data = serializeError(data);
  }
  console.log("----------");
  console.log("log: " + type);
  console.log("log: " + message);
  console.log(data);
  console.log("----------");
  logger._log(type, message, data);
};
logger.info = function(message, data) {
  logger.log("info", message, data);
};

module.exports = logger;

*/
